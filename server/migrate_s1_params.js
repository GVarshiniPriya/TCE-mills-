const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
    db.run("ALTER TABLE contracts ADD COLUMN stage1_params TEXT", (err) => {
        if (err) {
            if (err.message.includes("duplicate column name")) {
                console.log("Column 'stage1_params' already exists.");
            } else {
                console.error("Error adding column:", err.message);
            }
        } else {
            console.log("Column 'stage1_params' added successfully.");
        }
    });
});

db.close();
