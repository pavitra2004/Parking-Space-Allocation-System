import React, { useEffect, useState } from 'react';
import { fetchSlots, createUser, addVehicle, issueCard, reserveSlot, getReservations, makePayment } from './api';

export default function App(){
  const [slots, setSlots] = useState([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [userId, setUserId] = useState(null);
  const [regNo, setRegNo] = useState('');
  const [vehicleId, setVehicleId] = useState(null);
  const [reservations, setReservations] = useState([]);

  useEffect(()=>{ loadSlots(); loadReservations(); }, []);
  async function loadSlots(){ const s = await fetchSlots(); setSlots(s); }
  async function loadReservations(){ const r = await getReservations(); setReservations(r); }

  async function handleRegister(){ const u = await createUser({ name, role }); setUserId(u.user_id); alert('User created: ' + u.user_id); }
  async function handleAddVehicle(){ if(!userId) return alert('Create user first'); const v = await addVehicle({ user_id: userId, reg_no: regNo, type: 'car' }); setVehicleId(v.vehicle_id); alert('Vehicle added: ' + v.vehicle_id); }
  async function handleIssueCard(){ if(!userId) return alert('Create user first'); const c = await issueCard({ user_id: userId, vehicle_id: vehicleId, valid_days: 30 }); alert('Card issued: ' + c.card_id); }
  async function handleReserve(slot_id){ if(!userId || !vehicleId) return alert('Create user and vehicle first'); const r = await reserveSlot({ user_id: userId, vehicle_id: vehicleId, slot_id }); if(r.error) return alert('Err: ' + r.error); alert('Reserved: ' + r.res_id); loadSlots(); loadReservations(); }
  async function handlePay(reservation_id){ const p = await makePayment({ reservation_id, amount: 50.00, mode: 'card' }); alert('Payment done: ' + p.payment_id); }

  return (
    <div style={{ padding: 20 }}>
      <h2>Parking System (React Demo)</h2>
      <div style={{ marginBottom: 20 }}>
        <h3>Register User</h3>
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <select value={role} onChange={e=>setRole(e.target.value)}>
          <option value="student">Student</option>
          <option value="staff">Staff</option>
          <option value="security">Security</option>
        </select>
        <button onClick={handleRegister}>Create User</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3>Add Vehicle</h3>
        <input placeholder="Reg No" value={regNo} onChange={e=>setRegNo(e.target.value)} />
        <button onClick={handleAddVehicle}>Add Vehicle</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3>Issue Access Card</h3>
        <button onClick={handleIssueCard}>Issue Card (30 days)</button>
      </div>

      <div>
        <h3>Slots</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {slots.map(s=> (
            <div key={s.slot_id} style={{ border: '1px solid #ccc', padding: 8, width: 160 }}>
              <div><strong>{s.slot_name}</strong> ({s.slot_type})</div>
              <div>Fixed For: {s.fixed_for}</div>
              <div>Status: {s.status}</div>
              {s.status==='available' && <button onClick={()=>handleReserve(s.slot_id)}>Reserve</button>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Reservations</h3>
        {reservations.map(r=> (
          <div key={r.res_id} style={{ border: '1px solid #ddd', padding: 8, marginBottom: 6 }}>
            <div><strong>{r.name}</strong> | {r.reg_no} | Slot: {r.slot_name}</div>
            <div>Since: {new Date(r.start_time).toLocaleString()}</div>
            <button onClick={()=>handlePay(r.res_id)}>Pay ₹50</button>
          </div>
        ))}
      </div>
    </div>
  );
}
