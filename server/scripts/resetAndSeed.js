const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

async function run() {
  const root = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    multipleStatements: true
  });

  await root.query("DROP DATABASE IF EXISTS tripbuddy; CREATE DATABASE tripbuddy CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;");
  await root.end();

  const db = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "tripbuddy",
    multipleStatements: true
  });

  await db.query(`
    CREATE TABLE users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(190) UNIQUE,
      password_hash VARCHAR(255),
      google_uid VARCHAR(190),
      auth_provider ENUM('basic','google') DEFAULT 'basic',
      avatar_url VARCHAR(500),
      upi_id VARCHAR(120),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL
    );
    CREATE TABLE trips (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      destination VARCHAR(255),
      start_date DATE,
      end_date DATE,
      currency VARCHAR(10) DEFAULT 'INR',
      owner_user_id INT NOT NULL,
      cover_image_url VARCHAR(500),
      invite_code VARCHAR(64),
      invite_expires_at DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      FOREIGN KEY (owner_user_id) REFERENCES users(id)
    );
    CREATE TABLE trip_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      trip_id INT NOT NULL,
      user_id INT NOT NULL,
      role ENUM('owner','member') DEFAULT 'member',
      status ENUM('pending','approved') DEFAULT 'approved',
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_trip_user (trip_id, user_id),
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE invites (
      id INT AUTO_INCREMENT PRIMARY KEY,
      trip_id INT NOT NULL,
      invite_code VARCHAR(64) NOT NULL UNIQUE,
      created_by INT NOT NULL,
      expires_at DATETIME NOT NULL,
      max_uses INT DEFAULT 50,
      used_count INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
    CREATE TABLE expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      trip_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      category ENUM('Travel','Food','Stay','Activity','Other') DEFAULT 'Other',
      expense_date DATE NOT NULL,
      notes TEXT,
      receipt_url VARCHAR(500),
      payer_user_id INT NOT NULL,
      split_type ENUM('equal','custom','percentage','individual') DEFAULT 'equal',
      payer_included TINYINT(1) DEFAULT 1,
      include_in_settlement TINYINT(1) DEFAULT 1,
      is_refundable TINYINT(1) DEFAULT 0,
      related_to_expense_id INT NULL,
      created_by INT NOT NULL,
      updated_by INT NOT NULL,
      is_deleted TINYINT(1) DEFAULT 0,
      deleted_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
      FOREIGN KEY (payer_user_id) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    );
    CREATE TABLE expense_splits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      expense_id INT NOT NULL,
      user_id INT NOT NULL,
      split_mode ENUM('equal','custom','percentage','individual') DEFAULT 'equal',
      amount DECIMAL(12,2) NOT NULL,
      percentage DECIMAL(6,2) NULL,
      is_excluded TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      trip_id INT NOT NULL,
      from_user_id INT NOT NULL,
      to_user_id INT NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      status ENUM('pending','marked_paid','confirmed') DEFAULT 'pending',
      marked_paid_at DATETIME NULL,
      confirmed_at DATETIME NULL,
      marked_by INT NULL,
      confirmed_by INT NULL,
      apply_to_settlement TINYINT(1) DEFAULT 1,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
      FOREIGN KEY (from_user_id) REFERENCES users(id),
      FOREIGN KEY (to_user_id) REFERENCES users(id)
    );
    CREATE TABLE itinerary (
      id INT AUTO_INCREMENT PRIMARY KEY,
      trip_id INT NOT NULL,
      day_number INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      location VARCHAR(255),
      description TEXT,
      map_link VARCHAR(500),
      sort_order INT DEFAULT 1,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );
    CREATE TABLE train_details (
      id INT AUTO_INCREMENT PRIMARY KEY,
      trip_id INT NOT NULL,
      direction VARCHAR(50) NOT NULL,
      train_number VARCHAR(120) NOT NULL,
      departure VARCHAR(255) NOT NULL,
      arrival VARCHAR(255) NOT NULL,
      travel_date DATE NOT NULL,
      cost_per_person DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );
    CREATE TABLE vehicle_booking (
      id INT AUTO_INCREMENT PRIMARY KEY,
      trip_id INT NOT NULL,
      vehicle_name VARCHAR(255) NOT NULL,
      rent_amount DECIMAL(12,2) NOT NULL,
      pickup_charge DECIMAL(12,2) DEFAULT 0,
      deposit DECIMAL(12,2) DEFAULT 0,
      advance_paid DECIMAL(12,2) DEFAULT 0,
      remaining_balance DECIMAL(12,2) DEFAULT 0,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );
    CREATE TABLE booking_details (
      id INT AUTO_INCREMENT PRIMARY KEY,
      trip_id INT NOT NULL,
      booking_id VARCHAR(120) NOT NULL,
      property_name VARCHAR(255) NOT NULL,
      amount_paid DECIMAL(12,2) NOT NULL,
      checkin_date DATETIME NOT NULL,
      checkout_date DATETIME NOT NULL,
      guests INT DEFAULT 1,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );
    CREATE TABLE trip_budget (
      id INT AUTO_INCREMENT PRIMARY KEY,
      trip_id INT NOT NULL,
      category VARCHAR(100) NOT NULL,
      planned_amount DECIMAL(12,2) NOT NULL,
      alert_threshold DECIMAL(12,2) NULL,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );
    CREATE TABLE activity_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      trip_id INT NOT NULL,
      actor_user_id INT NOT NULL,
      entity_type VARCHAR(40) NOT NULL,
      entity_id INT NOT NULL,
      action VARCHAR(80) NOT NULL,
      before_json JSON NULL,
      after_json JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_user_id) REFERENCES users(id)
    );
  `);

  const defaultPasswordHash = await bcrypt.hash("TripBuddy@123", 10);
  const members = [
    ["Venkatesha S", "venky@test.com"],
    ["Lakshmisha K N", "lakshmi@test.com"],
    ["Meghana Raj S N", "meghana@test.com"],
    ["Monika S", "monika@test.com"],
    ["Venkatesh S", "venkateshbhoomi30@gmail.com"],
    ["Bhoomika T M", "venkateshbhoomi30+bhoomika@gmail.com"],
    ["Pranav Srivatsa", "pranav@test.com"]
  ];
  for (const [name, email] of members) {
    await db.query("INSERT INTO users (name, email, password_hash, auth_provider) VALUES (?, ?, ?, 'basic')", [name, email, defaultPasswordHash]);
  }

  const [tripResult] = await db.query(
    "INSERT INTO trips (name, destination, start_date, end_date, currency, owner_user_id) VALUES (?, ?, ?, ?, 'INR', ?)",
    ["Goa Trip Feb 2026", "Goa", "2026-02-23", "2026-02-26", 1]
  );
  const tripId = tripResult.insertId;

  await db.query("INSERT INTO trip_members (trip_id, user_id, role, status) VALUES (?, 1, 'owner', 'approved')", [tripId]);
  for (let userId = 2; userId <= 7; userId += 1) {
    await db.query("INSERT INTO trip_members (trip_id, user_id, role, status) VALUES (?, ?, 'member', 'approved')", [tripId, userId]);
  }

  await db.query("INSERT INTO train_details (trip_id,direction,train_number,departure,arrival,travel_date,cost_per_person) VALUES ?",
    [[
      [tripId, "Going", "17309 - Vasco Da Gama Express", "Tumkur 4:20 PM", "Vasco 5:00 AM", "2026-02-23", 419.00],
      [tripId, "Return", "17310 - Yesvantpur Express", "Vasco 10:55 PM", "Tumkur 10:36 AM", "2026-02-26", 419.00]
    ]]
  );

  await db.query("INSERT INTO vehicle_booking (trip_id,vehicle_name,rent_amount,pickup_charge,deposit,advance_paid,remaining_balance) VALUES (?,?,?,?,?,?,?)",
    [tripId, "New Ertiga Manual", 6500.00, 500.00, 3000.00, 2000.00, 7500.00]);
  await db.query("INSERT INTO booking_details (trip_id,booking_id,property_name,amount_paid,checkin_date,checkout_date,guests) VALUES (?,?,?,?,?,?,?)",
    [tripId, "GOAVGT33231", "goSTOPS Goa Vagator PLUS", 5921.50, "2026-02-24 13:00:00", "2026-02-26 10:00:00", 7]);

  const budgetRows = [
    ["Travel", 12366.00],
    ["Stay", 5921.50],
    ["Food", 7000.00],
    ["Activity", 4000.00],
    ["Other", 2000.00]
  ];
  for (const row of budgetRows) await db.query("INSERT INTO trip_budget (trip_id,category,planned_amount) VALUES (?,?,?)", [tripId, row[0], row[1]]);

  const [trainExpense] = await db.query(
    "INSERT INTO expenses (trip_id,title,amount,category,expense_date,notes,payer_user_id,split_type,payer_included,include_in_settlement,is_refundable,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [tripId, "Train Tickets", 5866.00, "Travel", "2026-02-23", "Group train expense paid by Venkatesha", 1, "equal", 1, 1, 0, 1, 1]
  );
  const [carExpense] = await db.query(
    "INSERT INTO expenses (trip_id,title,amount,category,expense_date,notes,payer_user_id,split_type,payer_included,include_in_settlement,is_refundable,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [tripId, "Car Rental - New Ertiga Manual", 6500.00, "Travel", "2026-02-24", "Paid by Venkatesha; Lakshmisha and Monika already settled their car share", 1, "equal", 1, 1, 0, 1, 1]
  );
  const [stayExpense] = await db.query(
    "INSERT INTO expenses (trip_id,title,amount,category,expense_date,notes,payer_user_id,split_type,payer_included,include_in_settlement,is_refundable,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [tripId, "Stay - goSTOPS Goa Vagator PLUS", 5921.50, "Stay", "2026-02-24", "Group stay expense paid by Venkatesha", 1, "equal", 1, 1, 0, 1, 1]
  );

  const trainShare = 838.00;
  const carShare = 928.57;
  const stayShares = [845.93, 845.93, 845.93, 845.93, 845.93, 845.93, 845.92];
  for (let userId = 1; userId <= 7; userId += 1) {
    await db.query("INSERT INTO expense_splits (expense_id,user_id,split_mode,amount) VALUES (?,?,?,?)", [trainExpense.insertId, userId, "equal", trainShare]);
    await db.query("INSERT INTO expense_splits (expense_id,user_id,split_mode,amount) VALUES (?,?,?,?)", [carExpense.insertId, userId, "equal", carShare]);
    await db.query("INSERT INTO expense_splits (expense_id,user_id,split_mode,amount) VALUES (?,?,?,?)", [stayExpense.insertId, userId, "equal", stayShares[userId - 1]]);
  }

  await db.query(
    `INSERT INTO payments
      (trip_id,from_user_id,to_user_id,amount,status,marked_paid_at,confirmed_at,marked_by,confirmed_by,notes)
      VALUES (?,?,?,?, 'confirmed', NOW(), NOW(), ?, ?, ?)`,
    [tripId, 2, 1, 928.57, 2, 1, "Car split paid by Lakshmisha to Venkatesha"]
  );
  await db.query(
    `INSERT INTO payments
      (trip_id,from_user_id,to_user_id,amount,status,marked_paid_at,confirmed_at,marked_by,confirmed_by,notes)
      VALUES (?,?,?,?, 'confirmed', NOW(), NOW(), ?, ?, ?)`,
    [tripId, 4, 1, 928.57, 4, 1, "Car split paid by Monika to Venkatesha"]
  );

  const trainAndStayPayments = [
    [2, 1683.93, "Train + Stay share paid by Lakshmisha to Venkatesha"],
    [3, 1683.93, "Train + Stay share paid by Meghana to Venkatesha"],
    [4, 1683.93, "Train + Stay share paid by Monika to Venkatesha"],
    [5, 1683.93, "Train + Stay share paid by Venkatesh to Venkatesha"],
    [6, 1683.93, "Train + Stay share paid by Bhoomika to Venkatesha"],
    [7, 1683.92, "Train + Stay share paid by Pranav to Venkatesha"]
  ];

  for (const [fromUserId, amount, note] of trainAndStayPayments) {
    await db.query(
      `INSERT INTO payments
        (trip_id,from_user_id,to_user_id,amount,status,marked_paid_at,confirmed_at,marked_by,confirmed_by,notes)
        VALUES (?,?,?,?, 'confirmed', NOW(), NOW(), ?, ?, ?)`,
      [tripId, fromUserId, 1, amount, fromUserId, 1, note]
    );
  }

  const itineraryRows = [
    [tripId, 1, "Arrival + North Goa Beaches", "Vasco -> goSTOPS Goa Vagator PLUS -> Calangute Beach -> Anjuna Beach -> Eva Cafe -> Baga Beach -> goSTOPS Goa Vagator PLUS", "North Goa", "https://maps.google.com/?q=goSTOPS+Goa+Vagator+PLUS", 1],
    [tripId, 2, "North Goa Exploration", "goSTOPS Goa Vagator PLUS -> Parra Road -> Museum of Goa -> Fontainhas -> Basilica of Bom Jesus -> Chapora Fort -> goSTOPS Goa Vagator PLUS", "North Goa", "https://maps.google.com/?q=Museum+of+Goa", 1],
    [tripId, 3, "South Goa Adventure", "goSTOPS Goa Vagator PLUS -> Cabo de Rama Fort -> Agonda Beach -> Kayaking Point -> Palolem Beach -> Madgaon", "South Goa", "https://maps.google.com/?q=Cabo+de+Rama+Fort", 1]
  ];
  for (const row of itineraryRows) {
    await db.query("INSERT INTO itinerary (trip_id,day_number,title,description,location,map_link,sort_order) VALUES (?,?,?,?,?,?,?)", row);
  }

  const inviteCode = "goa2026invite";
  await db.query("UPDATE trips SET invite_code = ?, invite_expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE id = ?", [inviteCode, tripId]);
  await db.query("INSERT INTO invites (trip_id,invite_code,created_by,expires_at,max_uses,used_count,is_active) VALUES (?, ?, 1, DATE_ADD(NOW(), INTERVAL 30 DAY), 50, 0, 1)", [tripId, inviteCode]);

  console.log("Database reset + Goa seed complete.");
  console.log("Login: venky@test.com / TripBuddy@123");
  console.log("Invite code:", inviteCode);

  await db.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
