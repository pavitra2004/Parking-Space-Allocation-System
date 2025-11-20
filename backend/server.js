require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();

// --- Configuration ---
app.use(cors()); // Enable CORS for frontend communication
app.use(express.json()); // Middleware to parse JSON body

// --- Database Connection Pool ---
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'parkingdb',
  waitForConnections: true,
  connectionLimit: 10,
  // Add a queue limit to prevent hanging if the DB is overwhelmed
  queueLimit: 0
});

/**
 * Health check function to test the database connection immediately at startup.
 */
async function checkDbConnection() {
  let connection;
  try {
    // Attempt to get a connection from the pool
    connection = await pool.getConnection();
    console.log('✅ Database connection established successfully.');
    // Release the connection immediately
    connection.release();
    return true;
  } catch (err) {
    console.error('❌ FATAL: Could not connect to the database. Check .env file and MySQL service.', err);
    // If connection was obtained, ensure it is released in case of errors mid-check
    if (connection) connection.release();
    return false;
  }
}

// At startup detect whether the DB schema supports the richer slots JOIN
let useRichSlotsQuery = false;
async function detectSlotsSchema() {
  try {
    const dbName = process.env.DB_NAME || 'parkingdb';
    // Check that parking_lots exists and parking_slots has fixed_for column
    const [lotTables] = await pool.query("SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'parking_lots'", [dbName]);
    const [slotCols] = await pool.query("SELECT COUNT(*) AS cnt FROM information_schema.columns WHERE table_schema = ? AND table_name = 'parking_slots' AND column_name = 'fixed_for'", [dbName]);
    if (lotTables && lotTables[0] && lotTables[0].cnt > 0 && slotCols && slotCols[0] && slotCols[0].cnt > 0) {
      useRichSlotsQuery = true;
      console.log('Schema check: using rich slots JOIN (includes lot info and fixed_for).');
    } else {
      useRichSlotsQuery = false;
      console.log('Schema check: falling back to simple slots SELECT (parking_lots or fixed_for missing).');
    }
  } catch (err) {
    // If schema detection fails, default to safe simple query and log a single warning
    useRichSlotsQuery = false;
    console.warn('Warning: schema detection failed, using simple slots query. Error:', err.message);
  }
}

// Helper for standardized error logging and response
const handleError = (res, err, message) => {
  console.error(`\n--- ${message} Error ---`);
  console.error(err);
  console.error('----------------------------\n');
  res.status(500).json({ error: message, details: err.message });
};


// --- API Health Check ---
app.get('/ping', (req, res) => res.json({ ok: true, message: 'Server is running and DB is connected (status unknown during runtime, checked at startup)' }));

// --- USER ROUTES ---
app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id, name, role FROM users');
    res.json(rows);
  } catch (err) { handleError(res, err, 'DB error retrieving users'); }
});

app.post('/users', async (req, res) => {
  const { name, role } = req.body;
  if (!name || !role) return res.status(400).json({ error: 'name and role required' });
  try {
    const [result] = await pool.query('INSERT INTO users (name, role) VALUES (?, ?)', [name, role]);
    res.json({ user_id: result.insertId, name, role }); // Return inserted data for confirmation
  } catch (err) { handleError(res, err, 'DB error creating user'); }
});

// --- VEHICLE ROUTES ---
app.get('/vehicles', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vehicles');
    res.json(rows);
  } catch (err) { handleError(res, err, 'DB error retrieving vehicles'); }
});

app.post('/vehicles', async (req, res) => {
  const { user_id, reg_no, type } = req.body;
  if (!user_id || !reg_no || !type) return res.status(400).json({ error: 'user_id, reg_no, type required' });

  // Normalization logic remains correct
  const typeMap = { 'car': 'c', 'bike': 'b', 'ev': 'e', 'electric': 'e' };
  const dbVehicleType = typeMap[type.toLowerCase()];

  if (!dbVehicleType) {
    return res.status(400).json({ error: 'Invalid vehicle type provided. Must be car, bike, or ev/electric.' });
  }

  const conn = await pool.getConnection();
  try {
    // Check if the user_id exists before inserting vehicle (Foreign Key check)
    const [userCheck] = await conn.query('SELECT user_id FROM users WHERE user_id = ?', [user_id]);
    if (userCheck.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'User not found. Cannot assign vehicle.' });
    }

    // Use the mapped DB type
    const [result] = await conn.query('INSERT INTO vehicles (user_id, reg_no, type) VALUES (?, ?, ?)', [user_id, reg_no, dbVehicleType]);

    // Return the inserted ID and the data for client confirmation
    res.json({ vehicle_id: result.insertId, user_id, reg_no, type: dbVehicleType });
  } catch (err) {
    handleError(res, err, 'DB error registering vehicle (Possible duplicate registration number or foreign key issue)');
  } finally {
    if (conn) conn.release(); // Ensure connection is released
  }
});

// --- SLOT ROUTES ---
app.get('/slots', async (req, res) => {
  try {
    if (useRichSlotsQuery) {
      const [rows] = await pool.query(`
        SELECT s.slot_id, s.lot_id, p.name AS lot_name, p.owner AS lot_owner, s.slot_name, s.slot_type, s.status, s.fixed_for
        FROM parking_slots s
        JOIN parking_lots p ON s.lot_id = p.lot_id
        ORDER BY s.lot_id, s.slot_name
      `);
      return res.json(rows);
    } else {
      const [simpleRows] = await pool.query('SELECT slot_id, lot_id, slot_name, slot_type, status FROM parking_slots ORDER BY slot_name');
      const mapped = simpleRows.map(r => ({
        slot_id: r.slot_id,
        lot_id: r.lot_id,
        lot_name: null,
        lot_owner: null,
        slot_name: r.slot_name,
        slot_type: r.slot_type,
        status: r.status,
        fixed_for: null
      }));
      return res.json(mapped);
    }
  } catch (err) {
    handleError(res, err, 'DB error retrieving slots');
  }
});

// --- RESERVATION ROUTES ---
app.get('/reservations', async (req, res) => {
  try {
    // Join to pull display names/reg_no/slot_name
    const [rows] = await pool.query('SELECT r.*, u.name, v.reg_no, s.slot_name FROM reservations r JOIN users u ON r.user_id=u.user_id JOIN vehicles v ON r.vehicle_id=v.vehicle_id JOIN parking_slots s ON r.slot_id=s.slot_id ORDER BY r.start_time DESC');
    res.json(rows);
  } catch (err) { handleError(res, err, 'DB error retrieving reservations'); }
});

app.post('/reserve', async (req, res) => {
  const { user_id, vehicle_id, slot_id } = req.body;
  if (!user_id || !vehicle_id || !slot_id) return res.status(400).json({ error: 'user_id, vehicle_id, slot_id required' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[slot], [user], [vehicle]] = await Promise.all([
      conn.query('SELECT * FROM parking_slots WHERE slot_id = ? FOR UPDATE', [slot_id]),
      conn.query('SELECT * FROM users WHERE user_id = ?', [user_id]),
      conn.query('SELECT type FROM vehicles WHERE vehicle_id = ?', [vehicle_id])
    ]);

    if (slot.length === 0) { await conn.rollback(); return res.status(404).json({ error: 'Slot not found' }); }
    if (user.length === 0) { await conn.rollback(); return res.status(404).json({ error: 'User not found' }); }
    if (vehicle.length === 0) { await conn.rollback(); return res.status(404).json({ error: 'Vehicle not found' }); }

    const slotInfo = slot[0];
    const userInfo = user[0];
    const vehicleInfo = vehicle[0];

    // Access/Role check
    if (slotInfo.fixed_for === 'staff' && userInfo.role !== 'staff') { await conn.rollback(); return res.status(403).json({ error: 'Slot reserved for staff only' }); }

    if (slotInfo.status !== 'available') { await conn.rollback(); return res.status(409).json({ error: 'Slot not available' }); }

    // Vehicle type matching against slot type
    const vehicleTypeMap = { 'c': 'car', 'b': 'bike', 'e': 'electric' };
    const requiredSlotType = vehicleTypeMap[vehicleInfo.type];

    if (requiredSlotType !== slotInfo.slot_type) {
      // Special case: Allow car in handicap slot
      if (slotInfo.slot_type === 'handicap' && requiredSlotType === 'car') {
        // OK
      } else {
        await conn.rollback();
        return res.status(403).json({ error: `Vehicle type (${requiredSlotType}) does not match slot type (${slotInfo.slot_type})` });
      }
    }

    const start = new Date();
    const [rres] = await conn.query('INSERT INTO reservations (user_id, vehicle_id, slot_id, start_time, status) VALUES (?, ?, ?, ?, "active")', [user_id, vehicle_id, slot_id, start]);
    const resId = rres.insertId;

    await conn.query('UPDATE parking_slots SET status = "reserved" WHERE slot_id = ?', [slot_id]);

    await conn.commit();
    res.json({ res_id: resId, message: 'Reservation created successfully' });
  } catch (err) {
    handleError(res, err, 'Reservation failed due to DB error or transaction issue');
    await conn.rollback();
  } finally {
    conn.release();
  }
});

app.post('/complete', async (req, res) => {
  const { res_id } = req.body;
  if (!res_id) return res.status(400).json({ error: 'res_id required' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rrows] = await conn.query('SELECT * FROM reservations WHERE res_id = ? FOR UPDATE', [res_id]);
    if (rrows.length === 0) { await conn.rollback(); return res.status(404).json({ error: 'Reservation not found' }); }
    const reservation = rrows[0];

    if (reservation.status !== 'active') { await conn.rollback(); return res.status(409).json({ error: 'Reservation not active' }); }

    await conn.query('UPDATE reservations SET status = "completed", end_time = ? WHERE res_id = ?', [new Date(), res_id]);
    await conn.query('UPDATE parking_slots SET status = "available" WHERE slot_id = ?', [reservation.slot_id]);

    await conn.commit();
    res.json({ message: 'Reservation completed and slot freed' });
  } catch (err) {
    handleError(res, err, 'DB error completing reservation');
    await conn.rollback();
  } finally {
    conn.release();
  }
});

app.delete('/reservations/:res_id', async (req, res) => {
  const { res_id } = req.params;
  if (!res_id) return res.status(400).json({ error: 'res_id required in URL' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rrows] = await conn.query('SELECT * FROM reservations WHERE res_id = ? FOR UPDATE', [res_id]);
    if (rrows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Reservation not found' });
    }
    const reservation = rrows[0];

    // Free the slot
    await conn.query('UPDATE parking_slots SET status = "available" WHERE slot_id = ?', [reservation.slot_id]);

    // Delete the reservation
    const [dres] = await conn.query('DELETE FROM reservations WHERE res_id = ?', [res_id]);
    if (dres.affectedRows === 0) {
      throw new Error("Deletion failed: Reservation was found but not deleted.");
    }

    await conn.commit();
    res.json({ message: 'Reservation deleted and slot freed', res_id });
  } catch (err) {
    handleError(res, err, 'DB error or Deletion failed');
    await conn.rollback();
  } finally {
    conn.release();
  }
});

// --- PAYMENT ROUTES ---
app.post('/payments', async (req, res) => {
  const { reservation_id, amount, mode } = req.body;
  if (!reservation_id || !amount || !mode) return res.status(400).json({ error: 'reservation_id, amount, mode required' });
  try {
    // Basic check that amount is a valid number before insertion
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return res.status(400).json({ error: 'Invalid amount.' });

    const [r] = await pool.query('INSERT INTO payments (reservation_id, amount, mode, status) VALUES (?, ?, ?, "done")', [reservation_id, parsedAmount, mode]);
    res.json({ payment_id: r.insertId, message: 'Payment recorded' });
  } catch (err) { handleError(res, err, 'DB error processing payment'); }
});


// --- Server Startup ---
const PORT = process.env.PORT || 3001;

// Wait for DB connection check before starting server
checkDbConnection().then(isConnected => {
  if (isConnected) {
    // Detect schema features before start
    detectSlotsSchema().then(() => {
      app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
    });
  } else {
    // If connection fails, the process is usually terminated, but here we just prevent listen
    console.log('Server failed to start due to database connection error.');
    // Note: In a real environment, you might use process.exit(1) here.
  }
});
