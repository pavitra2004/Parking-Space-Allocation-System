export const API_BASE = process.env.REACT_APP_API || 'http://localhost:3001';
export async function fetchSlots() { const r = await fetch(API_BASE + '/slots'); return r.json(); }
export async function createUser(data) { const r = await fetch(API_BASE + '/users', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)}); return r.json(); }
export async function addVehicle(data) { const r = await fetch(API_BASE + '/vehicles', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)}); return r.json(); }
export async function issueCard(data) { const r = await fetch(API_BASE + '/access_cards', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)}); return r.json(); }
export async function reserveSlot(data) { const r = await fetch(API_BASE + '/reserve', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)}); return r.json(); }
export async function getReservations() { const r = await fetch(API_BASE + '/reservations'); return r.json(); }
export async function makePayment(data) { const r = await fetch(API_BASE + '/payments', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)}); return r.json(); }
