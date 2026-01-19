const { run, query } = require('./db');
const { pool } = require('./db');

const migrate = async () => {
    try {
        console.log("Starting Migration for Stage 5 Bill Details...");

        // Check if columns exist
        const tableInfo = await query("PRAGMA table_info(contract_lots)");
        const columns = tableInfo.map(c => c.name);

        if (!columns.includes('invoice_number')) {
            console.log("Adding invoice_number column...");
            await run("ALTER TABLE contract_lots ADD COLUMN invoice_number TEXT");
        } else {
            console.log("invoice_number column already exists.");
        }

        if (!columns.includes('invoice_weight')) {
            console.log("Adding invoice_weight column...");
            await run("ALTER TABLE contract_lots ADD COLUMN invoice_weight REAL");
        } else {
            console.log("invoice_weight column already exists.");
        }

        console.log("Migration Complete.");

    } catch (e) {
        console.error("Migration Failed:", e);
    } finally {
        // Close pool/db connection if needed (db.js helper might not expose close, but node process exit handles it usually)
        // Check if pool.end exists? db.js exports pool.
        /* 
           db.js exports: { run, query, get, pool }
           sqlite3 pool usually doesn't need explicit end in simple scripts, but let's try.
        */
       // Just exit
    }
};

migrate();
