const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Paths
const dbPath = path.join(__dirname, 'database.sqlite');
const uploadsDir = path.join(__dirname, 'uploads');

console.log("=== STARTING FULL RESET ===");

// 1. Delete Database
if (fs.existsSync(dbPath)) {
    try {
        fs.unlinkSync(dbPath);
        console.log(" [x] Deleted database.sqlite");
    } catch (e) {
        console.error(" [!] Failed to delete database (it might be in use):", e.message);
        console.log("     Please STOP the server manually and run this script again.");
        process.exit(1);
    }
} else {
    console.log(" [ ] Database file not found (clean).");
}

// 2. Clear Uploads (Keep .gitkeep if exists, or just recreate dir)
if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
        if (file === '.gitkeep') continue;
        fs.unlinkSync(path.join(uploadsDir, file));
    }
    console.log(` [x] Cleared ${files.length} files from uploads/`);
} else {
    fs.mkdirSync(uploadsDir);
    console.log(" [x] Created uploads directory.");
}

// 3. Re-initialize DB
console.log(" [ ] Re-running init_db.js...");
const initProcess = require('./init_db'); // This requires modifying init_db to export something or be require-able without auto-running if it wasn't already. 
// Actually init_db.js auto-runs "initDb()" at the bottom.
// Requiring it will execute it.

// Note: Since init_db is async, we might not see "Done" immediately here if we just require it.
// But it prints to console so we'll see it.
