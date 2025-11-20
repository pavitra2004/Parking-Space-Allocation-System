import React, { useEffect, useState, useCallback } from "react";

// NOTE: This URL should point to your actual backend server (http://localhost:3001)
const API_URL = "http://localhost:3001";

// --- START: Stable Helper Components ---

const Input = (props) => (
    <input
        className="p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 w-full mb-3 transition duration-150 ease-in-out font-inter text-gray-700"
        {...props}
    />
);

const Select = (props) => (
    <select
        className="p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 w-full mb-3 appearance-none bg-white transition duration-150 ease-in-out font-inter text-gray-700"
        {...props}
    >
        {props.children}
    </select>
);

const PrimaryButton = (props) => (
    <button
        className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150 ease-in-out shadow-md disabled:bg-indigo-300 disabled:cursor-not-allowed"
        {...props}
    >
        {props.children}
    </button>
);

const SecondaryButton = (props) => (
    <button
        className="w-full bg-gray-200 text-gray-700 p-3 rounded-lg font-semibold hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-150 ease-in-out shadow-sm disabled:cursor-not-allowed"
        {...props}
    >
        {props.children}
    </button>
);

const Notification = ({ message, type, onClose }) => {
    if (!message) return null;
    let bgColor = "bg-green-500";
    if (type === "error") bgColor = "bg-red-500";
    if (type === "info") bgColor = "bg-blue-500";

    return (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl text-white ${bgColor} transition-opacity duration-300 animate-fade-in`}>
            <div className="flex justify-between items-center">
                <span>{message}</span>
                <button onClick={onClose} className="ml-4 text-xl font-bold opacity-75 hover:opacity-100 transition">
                    &times;
                </button>
            </div>
        </div>
    );
};

const ConfirmationModal = ({ action, onConfirm, onCancel }) => {
    if (!action) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full transform transition-all duration-300 scale-100">
                <h3 className="text-xl font-bold text-red-600 mb-4">Confirm Action</h3>
                <p className="text-gray-700 mb-6">
                    {action.message}
                </p>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                        {action.confirmText || 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- END: Stable Helper Components ---


// --- VIEW COMPONENTS ---

const RegisterUser = ({ userName, setUserName, userRole, setUserRole, addUser, goToVehicle }) => (
    <div className="bg-white p-8 rounded-xl shadow-2xl border border-gray-200 max-w-md mx-auto">
        <h2 className="text-3xl font-extrabold mb-6 text-indigo-700 border-b pb-3">1. Register User</h2>
        <Input placeholder="Full Name" value={userName} onChange={e => setUserName(e.target.value)} />
        <Select value={userRole} onChange={e => setUserRole(e.target.value)}>
            <option value="">Select Role</option>
            <option value="student">Student</option>
            <option value="staff">Staff</option>
            <option value="visitor">Visitor</option>
        </Select>
        <PrimaryButton onClick={addUser} disabled={!userName || !userRole}>
            Create User & Continue
        </PrimaryButton>
        <SecondaryButton onClick={goToVehicle} className="mt-4">
            Skip to Vehicle (if user exists)
        </SecondaryButton>
    </div>
);

const AddVehicle = ({ selectedUserId, setSelectedUserId, users, vehiclePlate, setVehiclePlate, vehicleType, setVehicleType, addVehicle, goToParking }) => (
    <div className="bg-white p-8 rounded-xl shadow-2xl border border-gray-200 max-w-md mx-auto">
        <h2 className="text-3xl font-extrabold mb-6 text-indigo-700 border-b pb-3">2. Add Vehicle</h2>

        <label className="block text-sm font-medium text-gray-700 mb-1">Select User</label>
        <Select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
            <option value="">Select User</option>
            {users.map(u => (
                <option key={u.user_id} value={u.user_id}>
                    {u.name} ({u.role})
                </option>
            ))}
        </Select>

        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Plate Number</label>
        <Input placeholder="Vehicle Plate (e.g., MH12AB5678)" value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} />

        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
        <Select value={vehicleType} onChange={e => setVehicleType(e.target.value)}>
            <option value="car">Car</option>
            <option value="bike">Bike</option>
            <option value="ev">EV</option>
        </Select>

        <PrimaryButton onClick={addVehicle} disabled={!selectedUserId || !vehiclePlate}>
            Register Vehicle & Continue
        </PrimaryButton>

        <SecondaryButton onClick={goToParking} className="mt-4">
            Skip to Parking
        </SecondaryButton>
    </div>
);

const ParkingView = ({ slots, reservations, slotFilter, setSlotFilter, reserveSlot, slotStatusStyles, goToReservations }) => {
    // Prepare lots list derived from slots data
    const uniqueLotsMap = new Map();
    slots.forEach(s => {
        const id = s.lot_id || 'unknown';
        if (!uniqueLotsMap.has(id)) {
            uniqueLotsMap.set(id, { lot_id: id, lot_name: s.lot_name || (`Lot ${id}`), lot_owner: s.lot_owner || null });
        }
    });
    const lots = Array.from(uniqueLotsMap.values()).slice(0, 5); // ensure 5 lots max

    const [selectedLot, setSelectedLot] = React.useState(lots.length ? lots[0].lot_id : 'all');
    const [selectedSlotId, setSelectedSlotId] = React.useState(null);

    // Keep selectedLot in sync when slots/lots change: if the previously selected lot
    // no longer exists, pick the first available. This fixes the case where lots are
    // populated after initial render but selectedLot remained 'all' and UI didn't show slots.
    React.useEffect(() => {
        if (lots.length === 0) return;
        const exists = lots.some(l => String(l.lot_id) === String(selectedLot));
        if (!exists) {
            setSelectedLot(lots[0].lot_id);
            setSelectedSlotId(null);
        }
    }, [lots]);

    // Mapping from Frontend Filter Value to Database Slot Type
    const typeMap = {
        'all': 'all',
        'car': 'car',
        'bike': 'bike',
        'ev': 'electric' // Mapped 'ev' selection to 'electric' schema value
    };

    // Slots filtered by selected lot and type
    const slotsForLot = slots.filter(s => (selectedLot === 'all' ? true : String(s.lot_id) === String(selectedLot)));
    const filteredSlots = slotsForLot.filter(s => {
        const requiredType = typeMap[slotFilter];
        if (requiredType === 'all') return true;
        return s.slot_type === requiredType;
    });

    // Debug: log counts when selection changes to help diagnose empty dropdowns
    React.useEffect(() => {
        console.debug('ParkingView - selectedLot', selectedLot, 'slotsForLotCount', slotsForLot.length, 'filteredSlotsCount', filteredSlots.length);
    }, [selectedLot, slotFilter, slots.length]);

    // Find currently selected slot object
    const selectedSlot = filteredSlots.find(s => String(s.slot_id) === String(selectedSlotId)) || null;

    return (
        <div className="bg-white p-8 rounded-xl shadow-2xl border border-gray-200 w-full">
            <h2 className="text-3xl font-extrabold mb-6 text-indigo-700 border-b pb-3">3. Parking Slots</h2>

            {/* Controls: Lot selector, Type filter, Reservations */}
            <div className="flex items-center space-x-4 mb-6 flex-wrap">
                <label className="text-gray-600 font-medium whitespace-nowrap">Select Lot:</label>
                <Select value={selectedLot} onChange={e => { setSelectedLot(e.target.value); setSelectedSlotId(null); }} className="w-64 p-2">
                    <option value="all">All Lots</option>
                    {lots.map(l => (
                        <option key={l.lot_id} value={l.lot_id}>{l.lot_name} ({l.lot_owner || 'owner'})</option>
                    ))}
                </Select>

                <label className="text-gray-600 font-medium whitespace-nowrap">Filter by Type:</label>
                <Select value={slotFilter} onChange={e => setSlotFilter(e.target.value)} className="w-40 p-2">
                    <option value="all">All</option>
                    <option value="car">Car</option>
                    <option value="bike">Bike</option>
                    <option value="ev">EV</option>
                </Select>

                <SecondaryButton onClick={goToReservations} className="!w-auto mt-0">
                    View Reservations
                </SecondaryButton>
            </div>

            {/* Compact slots dropdown (saves space) */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Slots in selected lot</label>
                <Select value={selectedSlotId || ''} onChange={e => setSelectedSlotId(e.target.value)} className="w-full">
                    <option value="">-- Select a slot --</option>
                    {filteredSlots.map(s => (
                        <option key={s.slot_id} value={s.slot_id}>{s.slot_name} — {s.slot_type?.toUpperCase() || 'N/A'} — {s.status?.toUpperCase() || ''}</option>
                    ))}
                </Select>
            </div>

            {/* Selected slot details */}
            {selectedSlot ? (
                <div className={`p-4 rounded-lg text-white shadow-md inline-block ${slotStatusStyles(selectedSlot.status)}`}>
                    <div className="text-lg font-bold">{selectedSlot.slot_name}</div>
                    <div className="text-sm">Type: {selectedSlot.slot_type?.toUpperCase() || 'N/A'}</div>
                    <div className="text-xs mt-1">{selectedSlot.fixed_for === 'staff' ? <span className="font-semibold text-yellow-200">STAFF ONLY</span> : 'PUBLIC'}</div>
                    <div className="font-medium mt-1">Status: {selectedSlot.status?.toUpperCase() || 'N/A'}</div>
                    <div className="mt-3">
                        {selectedSlot.status === 'available' && (
                            <button onClick={() => reserveSlot(selectedSlot.slot_id)} className="bg-white text-green-600 font-semibold text-sm py-1 px-3 rounded-md">Reserve</button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-sm text-gray-600">No slot selected. Choose a lot and a slot from the dropdown above.</div>
            )}
        </div>
    );
};

const ReservationsView = ({ reservations, completeReservation, payAmount, requestDeleteReservation, goToParking }) => {
    const activeReservations = reservations.filter(r => r.status === 'active');

    return (
        <div className="bg-white p-8 rounded-xl shadow-2xl border border-gray-200 w-full">
            <h2 className="text-3xl font-extrabold mb-6 text-indigo-700 border-b pb-3">4. Active Reservations</h2>

            <SecondaryButton onClick={goToParking} className="!w-auto mb-6">
                Back to Slots
            </SecondaryButton>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slot</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {activeReservations.map(res => (
                            <tr key={res.res_id} className="hover:bg-indigo-50 transition duration-150 ease-in-out">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{res.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{res.reg_no}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{res.slot_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                    {new Date(res.start_time).toLocaleTimeString()}
                                    <br />
                                    {new Date(res.start_time).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                                    <button
                                        onClick={() => payAmount(res.res_id)}
                                        className="text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-lg shadow-md transition"
                                    >
                                        Pay ₹50
                                    </button>
                                    <button
                                        onClick={() => completeReservation(res.res_id)}
                                        className="text-white bg-pink-500 hover:bg-pink-600 px-3 py-1 rounded-lg shadow-md transition"
                                    >
                                        Complete
                                    </button>
                                    <button
                                        onClick={() => requestDeleteReservation(res.res_id)}
                                        className="text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg shadow-md transition"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {activeReservations.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-4 text-center text-gray-500 italic">No active reservations at this time.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


// Main App Component
const App = () => {
    // ===== State =====
    const [users, setUsers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [slots, setSlots] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [currentView, setCurrentView] = useState("registerUser"); // Initial view

    // Form States
    const [userName, setUserName] = useState("");
    const [userRole, setUserRole] = useState("");
    const [selectedUserId, setSelectedUserId] = useState("");
    const [vehiclePlate, setVehiclePlate] = useState("");
    const [vehicleType, setVehicleType] = useState("car"); // 'car', 'bike', 'ev'
    const [slotFilter, setSlotFilter] = useState("all");

    // Notification State
    const [notification, setNotification] = useState({ message: '', type: '' });

    // Confirmation State
    const [confirmAction, setConfirmAction] = useState(null); // { res_id: number, message: string, confirmText: string }

    const showNotification = useCallback((message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: '' }), 4000);
    }, []);

    // ===== Navigation Handlers =====
    const goToVehicle = () => setCurrentView("addVehicle");
    const goToParking = () => setCurrentView("parkingView");
    const goToReservations = () => setCurrentView("reservationsView");

    useEffect(() => {
        // Automatically select the last registered user to simplify the flow
        if (users.length > 0 && (selectedUserId === "" || !users.some(u => u.user_id.toString() === selectedUserId))) {
            setSelectedUserId(users[users.length - 1].user_id.toString());
        }
    }, [users, selectedUserId]);


    // ===== Fetch Data =====
    const fetchData = useCallback(async () => {
        try {
            const endpoints = {
                users: `${API_URL}/users`,
                vehicles: `${API_URL}/vehicles`,
                slots: `${API_URL}/slots`,
                reservations: `${API_URL}/reservations`,
            };

            const fetchEndpoint = async (url) => {
                const res = await fetch(url);
                // Check if the response is valid JSON before parsing
                const text = await res.text();
                try {
                    return { ok: res.ok, status: res.status, url, json: JSON.parse(text) };
                } catch (e) {
                    // If it's not JSON, return a structured error
                    return { error: true, status: res.status, url, text: text };
                }
            };

            const results = await Promise.all(Object.values(endpoints).map(fetchEndpoint));
            const finalResults = {};
            const errors = [];

            Object.keys(endpoints).forEach((key, index) => {
                const result = results[index];
                // If not OK and not a 404, collect an error message
                if (!result.ok) {
                    const detail = result.json && result.json.error ? result.json.error : (result.text || `Status ${result.status}`);
                    // Ignore 404 for optional endpoints, but record others
                    if (result.status !== 404) {
                        errors.push(`${key} -> ${detail}`);
                        console.error(`HTTP/JSON Error for ${result.url}. Status: ${result.status}. Response: ${detail}`);
                    }
                }
                finalResults[key] = result.json && result.ok ? result.json : [];
            });

            setUsers(finalResults.users);
            setVehicles(finalResults.vehicles);

            // Normalize slot_type values coming from backend. Some setups may still use short codes ('c','b','e').
            const normalizeType = (t) => {
                if (!t) return t;
                const lower = String(t).toLowerCase();
                if (lower === 'c') return 'car';
                if (lower === 'b') return 'bike';
                if (lower === 'e' || lower === 'ev') return 'electric';
                if (lower === 'electric' || lower === 'car' || lower === 'bike' || lower === 'handicap') return lower;
                return lower;
            };

            const normalizedSlots = (finalResults.slots || []).map(s => ({
                ...s,
                slot_type: normalizeType(s.slot_type),
                fixed_for: s.fixed_for || null
            }));

            console.debug('Fetched slots:', normalizedSlots);
            setSlots(normalizedSlots);
            setReservations(finalResults.reservations);

            if (errors.length > 0) {
                // Show a clearer notification listing the failing endpoints (shortened)
                const shortMsg = errors.map(e => e.length > 120 ? e.slice(0, 116) + '...' : e).join(' | ');
                showNotification(`API Warning: ${shortMsg}`, 'error');
            }

        } catch (error) {
            console.error("Failed to fetch data:", error);
            showNotification("Failed to connect to backend API (Network Error). Ensure the server is running on port 3001.", 'error');
        }
    }, [showNotification]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ===== CRUD Handlers (FIXED) =====
    const addUser = async () => {
        if (!userName.trim() || !userRole.trim()) {
            return showNotification("Please enter both name and role.", 'error');
        }
        try {
            const res = await fetch(`${API_URL}/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: userName, role: userRole }),
            });

            // Improved Error Handling
            let data;
            try {
                data = await res.json();
            } catch (e) {
                return showNotification(`Error: Backend did not return JSON for user creation. Status: ${res.status}.`, 'error');
            }

            if (!res.ok) {
                return showNotification(data.error || `HTTP Error: ${res.status} when adding user.`, 'error');
            }

            // Update user list and set the new user as selected
            const newUser = { user_id: data.user_id, name: userName, role: userRole };
            setUsers(prev => [...prev, newUser]);
            setSelectedUserId(data.user_id.toString());

            setUserName("");
            setUserRole("");
            showNotification(`User '${userName}' registered successfully!`, 'info');
            goToVehicle();
        } catch (e) {
            showNotification(`Error registering user: ${e.message}. Check backend.`, 'error');
        }
    };

    // FIX: Vehicle type is now sent as the full word, as the backend expects it to be
    const addVehicle = async () => {
        if (!selectedUserId) {
            return showNotification("Please select a user.", 'error');
        }
        if (!vehiclePlate.trim()) {
            return showNotification("Please enter the vehicle plate.", 'error');
        }
        // Use the full word ('car', 'bike', 'ev'). The backend is responsible for mapping it to 'c', 'b', 'e'.
        const vehicleTypeToSend = vehicleType;

        try {
            const res = await fetch(`${API_URL}/vehicles`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Send the full word type
                body: JSON.stringify({ user_id: parseInt(selectedUserId), reg_no: vehiclePlate, type: vehicleTypeToSend }),
            });

            let data;
            try {
                data = await res.json();
            } catch (e) {
                return showNotification(`Error: Backend did not return JSON for vehicle creation. Status: ${res.status}.`, 'error');
            }

            if (!res.ok) {
                return showNotification(data.error || `HTTP Error: ${res.status} when adding vehicle.`, 'error');
            }

            // For local state, use the full word type for consistency
            setVehicles(prev => [...prev, { vehicle_id: data.vehicle_id, user_id: parseInt(selectedUserId), reg_no: vehiclePlate, type: vehicleTypeToSend }]);
            setVehiclePlate("");
            showNotification(`Vehicle ${vehiclePlate} added successfully!`, 'info');
            goToParking();
        } catch (e) {
            showNotification(`Error adding vehicle: ${e.message}. Check backend.`, 'error');
        }
    };

    const reserveSlot = async (slot_id) => {
        if (!selectedUserId) {
            showNotification("Please select a user in the 'Add Vehicle' section first.", 'error');
            return goToVehicle();
        }
        const userVehicles = vehicles.filter(v => v.user_id === parseInt(selectedUserId));
        if (!userVehicles.length) {
            return showNotification("The selected user has no registered vehicles. Please add one.", 'error');
        }
        // Use the first vehicle for simplicity
        const vehicle_id = userVehicles[0].vehicle_id;

        try {
            const res = await fetch(`${API_URL}/reserve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: parseInt(selectedUserId), vehicle_id, slot_id }),
            });

            let data;
            try {
                data = await res.json();
            } catch (e) {
                return showNotification(`Error: Backend did not return JSON for slot reservation. Status: ${res.status}.`, 'error');
            }

            if (!res.ok) {
                return showNotification(data.error || `HTTP Error: ${res.status} when reserving slot.`, 'error');
            }

            fetchData();
            showNotification(`Slot reserved successfully! Reservation ID: ${data.res_id}`, 'info');

        } catch (e) {
            showNotification(`Error creating reservation: ${e.message}. Check backend.`, 'error');
        }
    };

    const completeReservation = async (res_id) => {
        try {
            const res = await fetch(`${API_URL}/complete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ res_id }),
            });

            let data;
            try {
                data = await res.json();
            } catch (e) {
                return showNotification(`Error: Backend did not return JSON for completion. Status: ${res.status}.`, 'error');
            }

            if (!res.ok) {
                return showNotification(data.error || `HTTP Error: ${res.status}`, 'error');
            }

            fetchData();
            showNotification("Reservation completed and slot freed.", 'info');

        } catch (e) {
            showNotification(`Error completing reservation: ${e.message}. Check backend.`, 'error');
        }
    };

    // New function to trigger the confirmation modal
    const requestDeleteReservation = (res_id) => {
        setConfirmAction({
            res_id,
            message: `Are you sure you want to PERMANENTLY DELETE reservation ID ${res_id}? The slot will be freed.`,
            confirmText: 'Delete Permanently'
        });
    };

    // Logic to execute after confirmation (FIXED to handle 204 No Content and non-JSON errors)
    const handleDeleteConfirmed = async () => {
        const res_id = confirmAction.res_id;
        setConfirmAction(null); // Close the modal

        try {
            const res = await fetch(`${API_URL}/reservations/${res_id}`, {
                method: "DELETE",
            });

            // Handle successful DELETE operation, which often returns 204 No Content (empty body)
            if (res.status === 204) {
                fetchData();
                return showNotification(`Reservation ID ${res_id} successfully deleted! Slot is now available.`, 'info');
            }

            let data;
            try {
                // Try to parse JSON for other responses (200 OK, 4xx errors, etc.)
                data = await res.json();
            } catch (e) {
                // Catches non-JSON responses (like HTML error pages) for non-204 statuses
                // This addresses the 'HTML or JSON error' message.
                return showNotification(`Error: Backend returned a non-JSON response (Status: ${res.status}). Check backend logs.`, 'error');
            }

            if (!res.ok) {
                return showNotification(data.error || `HTTP Error: ${res.status} when deleting.`, 'error');
            }

            // Handle successful 200/201 responses (if the backend returns JSON on success)
            fetchData();
            showNotification(`Reservation ID ${res_id} successfully deleted! Slot is now available.`, 'info');

        } catch (e) {
            showNotification(`Network Error deleting reservation: ${e.message}. Check backend.`, 'error');
        }
    };

    const payAmount = async (reservation_id) => {
        const amount = 50;
        try {
            const res = await fetch(`${API_URL}/payments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reservation_id, amount, mode: "cash" }),
            });

            let data;
            try {
                data = await res.json();
            } catch (e) {
                return showNotification(`Error: Backend did not return JSON for payment. Status: ${res.status}.`, 'error');
            }


            if (!res.ok) {
                return showNotification(data.error || `HTTP Error: ${res.status}`, 'error');
            }

            showNotification(`Payment of ₹${amount} successful for reservation ${reservation_id}.`, 'info');
        } catch (e) {
            showNotification(`Error processing payment: ${e.message}. Check backend.`, 'error');
        }
    };

    // ===== Helpers for UI =====
    const slotStatusStyles = (status) => {
        if (status === "available") return "bg-green-600 border-green-700 hover:bg-green-700 cursor-pointer";
        if (status === "reserved") return "bg-red-600 border-red-700 cursor-default";
        return "bg-gray-400 border-gray-500 cursor-default";
    };

    // ===== Render Logic =====
    const renderView = () => {
        switch (currentView) {
            case "registerUser":
                return <RegisterUser
                    userName={userName} setUserName={setUserName}
                    userRole={userRole} setUserRole={setUserRole}
                    addUser={addUser} goToVehicle={goToVehicle}
                />;
            case "addVehicle":
                return <AddVehicle
                    selectedUserId={selectedUserId} setSelectedUserId={setSelectedUserId}
                    users={users}
                    vehiclePlate={vehiclePlate} setVehiclePlate={setVehiclePlate}
                    vehicleType={vehicleType} setVehicleType={setVehicleType}
                    addVehicle={addVehicle} goToParking={goToParking}
                />;
            case "parkingView":
                return <ParkingView
                    slots={slots} reservations={reservations}
                    slotFilter={slotFilter} setSlotFilter={setSlotFilter}
                    reserveSlot={reserveSlot} slotStatusStyles={slotStatusStyles}
                    goToReservations={goToReservations}
                />;
            case "reservationsView":
                return <ReservationsView
                    reservations={reservations}
                    completeReservation={completeReservation}
                    payAmount={payAmount}
                    // Use the new request function
                    requestDeleteReservation={requestDeleteReservation}
                    goToParking={goToParking}
                />;
            default:
                return <div>View not found.</div>;
        }
    }


    return (
        <div className="min-h-screen bg-gray-50 font-sans p-4 sm:p-8">
            {/* Notification Display */}
            <Notification {...notification} onClose={() => setNotification({ message: '', type: '' })} />

            {/* Confirmation Modal */}
            <ConfirmationModal
                action={confirmAction}
                onConfirm={handleDeleteConfirmed}
                onCancel={() => setConfirmAction(null)}
            />

            <header className="text-center mb-10">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 flex items-center justify-center">
                    <span className="mr-3 text-indigo-600">🚗</span> Smart Parking System
                </h1>
                <p className="mt-2 text-xl text-gray-500">Step-by-step management and reservations.</p>
            </header>

            {/* Main Content Area */}
            <div className="flex justify-center">
                <div className="w-full max-w-6xl">
                    {renderView()}
                </div>
            </div>

        </div>
    );
};

export default App;
