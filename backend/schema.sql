-- =========================================================
-- DATABASE INITIALIZATION
-- =========================================================
DROP DATABASE IF EXISTS parkingdb;
CREATE DATABASE parkingdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parkingdb;

-- =========================================================
-- USERS
-- =========================================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role ENUM('student','staff','security','admin','visitor') NOT NULL, 
    department VARCHAR(100),
    roll_no VARCHAR(50),
    employee_no VARCHAR(50),
    phone VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- VEHICLES
-- =========================================================
CREATE TABLE vehicles (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    reg_no VARCHAR(50) NOT NULL,
    type ENUM('c','b','e') NOT NULL, -- car, bike, EV
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- =========================================================
-- PARKING LOTS
-- =========================================================
CREATE TABLE parking_lots (
    lot_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    owner ENUM('staff','student') NOT NULL,
    location VARCHAR(255),
    capacity INT DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- PARKING SLOTS
-- =========================================================
CREATE TABLE parking_slots (
    slot_id INT AUTO_INCREMENT PRIMARY KEY,
    lot_id INT NOT NULL,
    slot_name VARCHAR(50) NOT NULL,
    slot_type ENUM('car','bike','electric','handicap') NOT NULL,
    fixed_for ENUM('staff','student') DEFAULT NULL,
    status ENUM('available','reserved','occupied') DEFAULT 'available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lot_id) REFERENCES parking_lots(lot_id) ON DELETE CASCADE
);

-- =========================================================
-- ACCESS CARDS
-- =========================================================
CREATE TABLE access_cards (
    card_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    vehicle_id INT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE SET NULL
);

-- =========================================================
-- RESERVATIONS
-- =========================================================
CREATE TABLE reservations (
    res_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    slot_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NULL,
    status ENUM('active','completed','cancelled','expired') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES parking_slots(slot_id) ON DELETE CASCADE
);

-- =========================================================
-- PAYMENTS
-- =========================================================
CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    mode ENUM('cash','card','upi') NOT NULL,
    status ENUM('pending','done','failed') DEFAULT 'done',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES reservations(res_id) ON DELETE CASCADE
);

-- =========================================================
-- INITIAL LOTS AND SLOTS
-- =========================================================
INSERT INTO parking_lots (name, owner, location, capacity) VALUES
('Staff Lot 1', 'staff', 'Near Admin Block', 10),
('Staff Lot 2', 'staff', 'Behind Library', 10),
('Student Lot 1', 'student', 'North Campus', 10),
('Student Lot 2', 'student', 'South Campus', 10),
('Student Lot 3', 'student', 'Hostel Area', 10);

-- Total distribution requested:
-- Staff (2 lots): total 20 slots -> 10 cars and 10 (EV+bike)
-- Student (3 lots): total 30 slots -> 10 cars and 20 (EV+bike)

-- We'll distribute evenly per lot as follows:
-- Staff lots (each 10 slots): 5 car, 3 electric, 2 bike (per lot)
-- Student lots:
--  Lot 3: 4 car, 4 electric, 2 bike
--  Lot 4: 3 car, 4 electric, 3 bike
--  Lot 5: 3 car, 4 electric, 3 bike

-- Generate staff lot slots (lot 1 and 2)
INSERT INTO parking_slots (lot_id, slot_name, slot_type, fixed_for)
SELECT 1, CONCAT('S1-C', n), 'car', 'staff' FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) x;
INSERT INTO parking_slots (lot_id, slot_name, slot_type, fixed_for)
SELECT 1, CONCAT('S1-E', n), 'electric', 'staff' FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3) x;
INSERT INTO parking_slots (lot_id, slot_name, slot_type, fixed_for)
SELECT 1, CONCAT('S1-B', n), 'bike', 'staff' FROM (SELECT 1 n UNION SELECT 2) x;

INSERT INTO parking_slots (lot_id, slot_name, slot_type, fixed_for)
SELECT 2, CONCAT('S2-C', n), 'car', 'staff' FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) x;
INSERT INTO parking_slots (lot_id, slot_name, slot_type, fixed_for)
SELECT 2, CONCAT('S2-E', n), 'electric', 'staff' FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3) x;
INSERT INTO parking_slots (lot_id, slot_name, slot_type, fixed_for)
SELECT 2, CONCAT('S2-B', n), 'bike', 'staff' FROM (SELECT 1 n UNION SELECT 2) x;

-- Generate student lot slots (lots 3,4,5)
-- Lot 3: 4 car, 4 electric, 2 bike
INSERT INTO parking_slots (lot_id, slot_name, slot_type, fixed_for)
SELECT 3, CONCAT('ST3-C', n), 'car', 'student' FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) x;
INSERT INTO parking_slots (lot_id, slot_name, slot_type, fixed_for)
SELECT 3, CONCAT('ST3-E', n), 'electric', 'student' FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) x;
INSERT INTO parking_slots (lot_id, slot_name, slot_type, fixed_for)
SELECT 3, CONCAT('ST3-B', n), 'bike', 'student' FROM (SELECT 1 n UNION SELECT 2) x;

-- Lot 4: 3 car, 4 electric, 3 bike
INSERT INTO parking_slots (lot_id, slot_name, slot_type, fixed_for)
SELECT 4, CONCAT('ST4-C', n), 'car', 'student' FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3) x;
INSERT INTO parking_slots (lot_id, slot_name, slot_type, fixed_for)
SELECT 4, CONCAT('ST4-E', n), 'electric', 'student' FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) x;
INSERT INTO parking_slots (lot_id, slot_name, slot_type, fixed_for)
SELECT 4, CONCAT('ST4-B', n), 'bike', 'student' FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3) x;

-- Lot 5: 3 car, 4 electric, 3 bike
INSERT INTO parking_slots (lot_id, slot_name, slot_type, fixed_for)
SELECT 5, CONCAT('ST5-C', n), 'car', 'student' FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3) x;
INSERT INTO parking_slots (lot_id, slot_name, slot_type, fixed_for)
SELECT 5, CONCAT('ST5-E', n), 'electric', 'student' FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) x;
INSERT INTO parking_slots (lot_id, slot_name, slot_type, fixed_for)
SELECT 5, CONCAT('ST5-B', n), 'bike', 'student' FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3) x;

-- =========================================================
-- TRIGGERS
-- =========================================================

DELIMITER $$

CREATE TRIGGER trg_reservation_insert
BEFORE INSERT ON reservations
FOR EACH ROW
BEGIN
    DECLARE slot_status ENUM('available','reserved','occupied');
    SELECT status INTO slot_status FROM parking_slots WHERE slot_id = NEW.slot_id FOR UPDATE;
    IF slot_status != 'available' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Slot is not available';
    END IF;
    UPDATE parking_slots SET status = 'reserved' WHERE slot_id = NEW.slot_id;
END$$

CREATE TRIGGER trg_reservation_update
AFTER UPDATE ON reservations
FOR EACH ROW
BEGIN
    IF NEW.status IN ('completed','cancelled','expired') AND OLD.status != NEW.status THEN
        UPDATE parking_slots SET status = 'available' WHERE slot_id = NEW.slot_id;
    END IF;
END$$

DELIMITER ;

-- =========================================================
-- STORED PROCEDURES
-- =========================================================

DELIMITER $$

CREATE PROCEDURE sp_create_reservation(
    IN p_user_id INT,
    IN p_vehicle_id INT,
    IN p_slot_id INT,
    OUT p_res_id INT
)
BEGIN
    DECLARE v_status ENUM('available','reserved','occupied');
    START TRANSACTION;
    SELECT status INTO v_status FROM parking_slots WHERE slot_id = p_slot_id FOR UPDATE;
    IF v_status != 'available' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Slot not available';
    END IF;
    INSERT INTO reservations(user_id, vehicle_id, slot_id, start_time)
    VALUES (p_user_id, p_vehicle_id, p_slot_id, NOW());
    SET p_res_id = LAST_INSERT_ID();
    COMMIT;
END$$

CREATE PROCEDURE sp_complete_reservation(IN p_res_id INT)
BEGIN
    UPDATE reservations SET status='completed', end_time=NOW()
    WHERE res_id = p_res_id;
END$$

CREATE PROCEDURE sp_cancel_reservation(IN p_res_id INT)
BEGIN
    UPDATE reservations SET status='cancelled', end_time=NOW()
    WHERE res_id = p_res_id;
END$$

CREATE PROCEDURE sp_get_available_slots(IN p_type ENUM('car','bike','electric'))
BEGIN
    SELECT slot_id, slot_name, lot_id
    FROM parking_slots
    WHERE slot_type = p_type AND status = 'available'
    ORDER BY lot_id, slot_name;
END$$

DELIMITER ;

-- =========================================================
-- SAMPLE QUERIES
-- =========================================================
SELECT * FROM parking_lots;
SELECT * FROM parking_slots;
