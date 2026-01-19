const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log(`Checking DB: ${dbPath}`);

db.all("PRAGMA table_info(contract_lots);", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("Columns:", rows.map(r => r.name).join(', '));
    const hasSeq = rows.some(r => r.name === 'sequence_start');
    console.log(`Has sequence_start: ${hasSeq}`);

    // If exists, check data
    if (hasSeq) {
        db.all("SELECT lot_id, lot_number, sequence_start FROM contract_lots", [], (err, data) => {
            if (err) console.error(err);
            else {
                console.log("Data sample:", data);
            }
        });
    }
});
