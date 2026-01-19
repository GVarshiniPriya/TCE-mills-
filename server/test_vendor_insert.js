const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.sqlite');

console.log("Connecting to:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

const vendor = {
    vendor_name: "Test Vendor Direct " + Date.now(),
    gst_number: "GST12345",
    state: "Test State",
    is_privileged: 0,
    email: "test@example.com",
    phone_number: "1234567890",
    address: "Test Address"
};

const query = "INSERT INTO vendors (vendor_name, gst_number, state, is_privileged, email, phone_number, address) VALUES (?, ?, ?, ?, ?, ?, ?)";
const params = [vendor.vendor_name, vendor.gst_number, vendor.state, vendor.is_privileged, vendor.email, vendor.phone_number, vendor.address];

db.run(query, params, function (err) {
    if (err) {
        console.error("INSERT FAILED:", err.message);
    } else {
        console.log(`INSERT SUCCESS. Row ID: ${this.lastID}`);
    }
    db.close();
});
