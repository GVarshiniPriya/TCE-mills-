const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'contract_app.db');
const db = new sqlite3.Database(dbPath);

function run(sql) {
    return new Promise((resolve, reject) => {
        db.run(sql, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function migrate() {
    console.log(`Opening DB at ${dbPath}`);

    try {
        await run("ALTER TABLE contract_lots ADD COLUMN sequence_start TEXT");
        console.log("Added sequence_start");
    } catch (e) { console.log("sequence_start error:", e.message); }

    try {
        await run("ALTER TABLE contract_lots ADD COLUMN sequence_end TEXT");
        console.log("Added sequence_end");
    } catch (e) { console.log("sequence_end error:", e.message); }

    try {
        await run("ALTER TABLE contract_lots ADD COLUMN no_of_samples INTEGER");
        console.log("Added no_of_samples");
    } catch (e) { console.log("no_of_samples error:", e.message); }

    db.close();
}

migrate();
