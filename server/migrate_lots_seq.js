const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./contract_app.db');

db.serialize(() => {
    console.log("Adding missing columns to contract_lots...");

    // contract_lots might be missing sequence_start, sequence_end, no_of_samples
    const columns = [
        { name: 'sequence_start', type: 'TEXT' },
        { name: 'sequence_end', type: 'TEXT' },
        { name: 'no_of_samples', type: 'INTEGER' }
    ];

    columns.forEach(col => {
        const sql = `ALTER TABLE contract_lots ADD COLUMN ${col.name} ${col.type}`;
        db.run(sql, (err) => {
            if (err) {
                if (err.message.includes('duplicate column')) {
                    console.log(`Column ${col.name} already exists.`);
                } else {
                    console.error(`Error adding ${col.name}:`, err.message);
                }
            } else {
                console.log(`Added column ${col.name}`);
            }
        });
    });
});

db.close();
