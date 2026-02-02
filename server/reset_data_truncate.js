const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs'); // Need this to re-seed if we wipe users

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

const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const resetData = async () => {
    console.log("=== STARTING DATA WIPE (TRUNCATE) ===");

    try {
        // 1. Disable Foreign Keys (just in case, though SQLite defaults to off usually)
        await run("PRAGMA foreign_keys = OFF;");

        // 2. Clear Tables
        const tables = [
            'stage_history',
            'lot_decisions',
            'contract_lots',
            'stage2_chairman_decision',
            'stage2_manager_report',
            'stage1_chairman_decision',
            'contracts',
            'vendors',
            'users'
        ];

        for (const table of tables) {
            console.log(`Clearing ${table}...`);
            await run(`DELETE FROM ${table}`);
            // Reset AutoIncrement
            try {
                await run(`DELETE FROM sqlite_sequence WHERE name='${table}'`);
            } catch (e) { /* ignore if sequence doesn't exist */ }
        }

        console.log(" [x] All tables cleared.");

        // 3. Clear Uploads Folder
        const uploadsDir = path.join(__dirname, '../uploads'); // Check path relative to this script
        // Note: script is in /server/, uploads is in /server/uploads? No, /contract-app/uploads or /server/uploads?
        // Checking previous view: app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); in index.js
        // So it is server/uploads.
        const targetUploads = path.join(__dirname, 'uploads');

        if (require('fs').existsSync(targetUploads)) {
            const files = require('fs').readdirSync(targetUploads);
            let deletedCount = 0;
            for (const file of files) {
                if (file === '.gitkeep') continue;
                try {
                    require('fs').unlinkSync(path.join(targetUploads, file));
                    deletedCount++;
                } catch (e) { console.error(`Failed to delete ${file}: ${e.message}`); }
            }
            console.log(` [x] Cleared ${deletedCount} files from uploads/`);
        }

        // 4. Re-Seed Users (Reusing logic from init_db)
        console.log("Re-seeding Admin Users...");
        const managerHash = await bcrypt.hash('manager', 10);
        const chairmanHash = await bcrypt.hash('chairman', 10);

        const seedUserSafe = async (username, role, matchHash) => {
            await run(`INSERT INTO users (username, full_name, email, role, department, password) VALUES (?, ?, ?, ?, ?, ?)`,
                [username, username + ' User', `${username}@cotton.com`, role, 'Dept', matchHash]);
        };

        await seedUserSafe('manager', 'Manager', managerHash);
        await seedUserSafe('chairman', 'Chairman', chairmanHash);
        console.log(" [x] Users 'manager' and 'chairman' re-created.");

        console.log("=== RESET COMPLETE ===");

    } catch (err) {
        console.error("Error during reset:", err);
    } finally {
        db.close();
    }
};

resetData();
