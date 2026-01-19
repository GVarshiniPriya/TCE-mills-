const { run, get } = require('./db');

(async () => {
    try {
        console.log("Adding sample vendor...");
        
        const vendor = {
            name: 'SRM Traders',
            is_privileged: false,
            type: 'Domestic',
            gst: '33ABCDE1234F1Z5',
            state: 'Tamil Nadu',
            email: 'srm@example.com',
            phone: '9876543210',
            address: '123 Cotton Street, Coimbatore'
        };

        // Check if exists first to avoid duplicates (optional but good practice)
        const existing = await get("SELECT * FROM vendors WHERE gst_number = ?", [vendor.gst]);
        if (existing) {
            console.log("Vendor already exists:", existing);
            return;
        }

        const result = await run(
            `INSERT INTO vendors (vendor_name, is_privileged, vendor_type, gst_number, state, email, phone_number, address) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [vendor.name, vendor.is_privileged, vendor.type, vendor.gst, vendor.state, vendor.email, vendor.phone, vendor.address]
        );

        console.log("Vendor added. ID:", result.lastID);

        // Verify
        const newVendor = await get("SELECT * FROM vendors WHERE vendor_id = ?", [result.lastID]);
        console.log("Verification - Vendor found:", newVendor);

    } catch (e) {
        console.error("Error:", e);
    }
})();
