// Safe migration script: adds fixed_for column to parking_slots if missing
// and populates it from parking_lots.owner where appropriate.

require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'parkingdb',
    waitForConnections: true,
    connectionLimit: 2
  });

  let conn;
  try {
    conn = await pool.getConnection();
    console.log('Connected to DB for migration.');

    // Check if table parking_slots exists
    const [t] = await conn.query("SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'parking_slots'", [process.env.DB_NAME || 'parkingdb']);
    if (!t || t[0].cnt === 0) {
      console.error('Table parking_slots does not exist in DB. Aborting migration.');
      return process.exit(1);
    }

    // Check if column fixed_for exists
    const [cols] = await conn.query("SELECT COUNT(*) AS cnt FROM information_schema.columns WHERE table_schema = ? AND table_name = 'parking_slots' AND column_name = 'fixed_for'", [process.env.DB_NAME || 'parkingdb']);

    if (cols && cols[0] && cols[0].cnt > 0) {
      console.log('Column fixed_for already exists on parking_slots. Skipping ALTER.');
    } else {
      console.log('Adding column fixed_for to parking_slots...');
      await conn.query("ALTER TABLE parking_slots ADD COLUMN fixed_for ENUM('staff','student') DEFAULT NULL;");
      console.log('Column added.');
    }

    // If parking_lots exists and has owner, populate fixed_for from parking_lots.owner where owner in ('staff','student')
    const [lotTbl] = await conn.query("SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'parking_lots'", [process.env.DB_NAME || 'parkingdb']);
    if (lotTbl && lotTbl[0] && lotTbl[0].cnt > 0) {
      console.log('Populating fixed_for values from parking_lots.owner where available...');
      await conn.query("UPDATE parking_slots ps JOIN parking_lots pl ON ps.lot_id = pl.lot_id SET ps.fixed_for = pl.owner WHERE pl.owner IN ('staff','student')");
      console.log('Population complete.');
    } else {
      console.log('Table parking_lots not found; skipping population of fixed_for.');
    }

    // Remove unused columns from users table if they exist: department, roll_no, employee_no, phone
    const colsToRemove = ['department','roll_no','employee_no','phone'];
    const [usersTbl] = await conn.query("SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'users'", [process.env.DB_NAME || 'parkingdb']);
    if (usersTbl && usersTbl[0] && usersTbl[0].cnt > 0) {
      console.log('Checking for unused user columns to remove...');
      for (const col of colsToRemove) {
        const [colCheck] = await conn.query("SELECT COUNT(*) AS cnt FROM information_schema.columns WHERE table_schema = ? AND table_name = 'users' AND column_name = ?", [process.env.DB_NAME || 'parkingdb', col]);
        if (colCheck && colCheck[0] && colCheck[0].cnt > 0) {
          try {
            console.log(`Dropping column users.${col}...`);
            await conn.query(`ALTER TABLE users DROP COLUMN \`${col}\``);
            console.log(`Dropped column users.${col}`);
          } catch (err) {
            console.warn(`Failed to drop users.${col}:`, err.message);
          }
        } else {
          console.log(`Column users.${col} not present; skipping.`);
        }
      }
    } else {
      console.log('Table users not found; skipping removal of unused columns.');
    }

    console.log('Migration finished successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
}

run();
