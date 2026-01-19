const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./contract_app.db');

db.all("PRAGMA table_info(contract_lots);", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("Columns in contract_lots:");
    rows.forEach(row => {
        console.log(row.name, row.type);
    });

    // Check specific columns
    const hasSeqStart = rows.some(r => r.name === 'sequence_start');
    const hasNoSamples = rows.some(r => r.name === 'no_of_samples');

    console.log(`Has sequence_start: ${hasSeqStart}`);
    console.log(`Has no_of_samples: ${hasNoSamples}`);
});

db.close();
