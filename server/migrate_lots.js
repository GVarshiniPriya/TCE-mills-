const { run, pool } = require('./db');

const migrate = async () => {
    try {
        console.log("Migrating Database for Multi-Lots...");

        // Create contract_lots
        await run(`
        CREATE TABLE IF NOT EXISTS contract_lots (
            lot_id INTEGER PRIMARY KEY AUTOINCREMENT,
            contract_id INTEGER,
            
            -- Stage 3: Sampling
            lot_number TEXT,
            arrival_date DATE,
            sequence_start TEXT,
            sequence_end TEXT,
            no_of_samples INTEGER,
            
            -- Stage 4: CTS
            mic_value REAL,
            strength REAL,
            uhml REAL,
            ui_percent REAL,
            sfi REAL,
            elongation REAL,
            rd REAL,
            plus_b REAL,
            colour_grade TEXT,
            mat REAL,
            sci INTEGER,
            trash_percent REAL,
            moisture_percent REAL,
            test_date DATE,
            confirmation_date DATE,
            report_document_path TEXT,
            trash_percent_samples TEXT, -- JSON
            stage4_remarks TEXT,
            
            -- Stage 5: Payment
            invoice_value REAL,
            tds_amount REAL,
            cash_discount REAL,
            net_amount_paid REAL,
            bank_name TEXT,
            branch TEXT,
            account_no TEXT,
            ifsc_code TEXT,
            payment_mode TEXT,
            rtgs_reference_no TEXT,
            stage5_remarks TEXT,
            
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        `);

        // Create lot_decisions
        await run(`
        CREATE TABLE IF NOT EXISTS lot_decisions (
            decision_id INTEGER PRIMARY KEY AUTOINCREMENT,
            lot_id INTEGER,
            stage_number INTEGER, -- 4 or 5
            decision TEXT, -- Approve, Reject, Modify
            remarks TEXT,
            decided_by INTEGER,
            decision_date DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        `);

        console.log("Migration Complete.");
    } catch (e) {
        console.error("Migration Failed:", e);
    } finally {
        // Close pool if accessible or just exit
        process.exit(0);
    }
};

migrate();
