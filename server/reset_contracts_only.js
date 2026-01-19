const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const resetContractsOnly = async () => {
    console.log("=== STARTING CONTRACT DATA WIPE ===");

    try {
        // 1. Disable Foreign Keys
        await run("PRAGMA foreign_keys = OFF;");

        // 2. Clear Contract-Related Tables
        const tables = [
            'stage_history',
            'lot_decisions',
            'contract_lots',
            'stage2_chairman_decision',
            'stage2_manager_report',
            'stage1_chairman_decision',
            'contracts'
        ];

        for (const table of tables) {
            console.log(`Clearing ${table}...`);
            await run(`DELETE FROM ${table}`);
            // Reset AutoIncrement
            try {
                await run(`DELETE FROM sqlite_sequence WHERE name='${table}'`);
            } catch (e) { /* ignore */ }
        }

        console.log(" [x] Contract tables cleared.");

        // 3. Clear Uploads Folder (but keep .gitkeep)
        const uploadsDir = path.join(__dirname, 'uploads');

        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            let deletedCount = 0;
            for (const file of files) {
                if (file === '.gitkeep') continue;
                try {
                    fs.unlinkSync(path.join(uploadsDir, file));
                    deletedCount++;
                } catch (e) { console.error(`Failed to delete ${file}: ${e.message}`); }
            }
            console.log(` [x] Cleared ${deletedCount} files from uploads/`);
        }

        console.log("=== RESET COMPLETE ===");

    } catch (err) {
        console.error("Error during reset:", err);
    } finally {
        db.close();
    }
};

resetContractsOnly();
