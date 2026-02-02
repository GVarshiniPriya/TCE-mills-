const { run, pool, get } = require('./db');
const bcrypt = require('bcryptjs');

const initDb = async () => {

    // SQLite Schema
    const schema = `
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        full_name TEXT,
        email TEXT,
        role TEXT,
        department TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        password TEXT
    );

    CREATE TABLE IF NOT EXISTS vendors (
        vendor_id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_name TEXT,
        is_privileged BOOLEAN,
        vendor_type TEXT,
        gst_number TEXT,
        state TEXT,
        email TEXT,
        phone_number TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    DROP TABLE IF EXISTS contracts;
    CREATE TABLE contracts (
        contract_id TEXT PRIMARY KEY,
        vendor_id INTEGER,
        cotton_type TEXT,
        quality TEXT,
        quantity REAL,
        price REAL,
        document_path TEXT,
        entry_date DATE,
        entered_by INTEGER,

        -- Quality Params (Stage 2/4)
        uhml REAL,
        ui REAL,
        strength REAL,
        elongation REAL,
        mic REAL,
        rd REAL,
        plus_b REAL,
        gpt REAL,
        sfi REAL,
        mat REAL,
        sci REAL,
        trash REAL,
        moisture REAL,
        neps REAL,
        stability REAL,

        stage1_params TEXT, -- JSON Storage for Optional Params

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
    );

    DROP TABLE IF EXISTS stage1_chairman_decision;
    CREATE TABLE stage1_chairman_decision (
        contract_id TEXT PRIMARY KEY,
        decision TEXT,
        remarks TEXT,
        decision_date DATETIME
    );

    DROP TABLE IF EXISTS stage2_manager_report;
    CREATE TABLE stage2_manager_report (
        contract_id TEXT PRIMARY KEY,
        variety TEXT,
        price REAL,
        report_date DATE,
        report_document_path TEXT,
        uploaded_at DATETIME,
        uhml REAL,
        ui REAL,
        strength REAL,
        elongation REAL,
        mic REAL,
        rd REAL,
        plus_b REAL,
        gpt REAL,
        sfi REAL,
        mat REAL,
        sci REAL,
        trash REAL,
        moisture REAL,
        neps REAL,
        stability REAL,
        entered_by INTEGER,
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    DROP TABLE IF EXISTS stage2_chairman_decision;
    CREATE TABLE stage2_chairman_decision (
        contract_id TEXT PRIMARY KEY,
        decision TEXT,
        remarks TEXT,
        decided_by INTEGER,
        decision_date DATETIME
    );

    DROP TABLE IF EXISTS contract_lots;
    CREATE TABLE contract_lots (
        lot_id INTEGER PRIMARY KEY AUTOINCREMENT,
        contract_id TEXT,

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
        invoice_number TEXT,
        invoice_weight REAL,
        stage5_remarks TEXT,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    DROP TABLE IF EXISTS lot_decisions;
    CREATE TABLE lot_decisions (
        decision_id INTEGER PRIMARY KEY AUTOINCREMENT,
        lot_id INTEGER,
        stage_number INTEGER, -- 4 or 5
        decision TEXT, -- Approve, Reject, Modify
        remarks TEXT,
        decided_by INTEGER,
        decision_date DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    DROP TABLE IF EXISTS stage_history;
    CREATE TABLE stage_history (
        history_id INTEGER PRIMARY KEY AUTOINCREMENT,
        contract_id TEXT NOT NULL,
        lot_id INTEGER NULL, -- Added Lot ID link
        stage_number INTEGER NULL,
        action TEXT NULL,
        performed_by INTEGER NULL,
        remarks TEXT NULL,
        action_date DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    `;

    // Drop View separately if needed, or create if not exists
    const viewSchema = `
    DROP VIEW IF EXISTS vw_stage5_payment_details;
    CREATE VIEW vw_stage5_payment_details AS
    SELECT
        c.contract_id,
        v.vendor_name AS party_name,
        c.cotton_type,
        s2.variety,
        c.price AS contract_rate,
        c.quantity,
        s3.sequence_start AS lot_no,
        s3.arrival_date,
        p.invoice_value,
        p.tds_amount,
        p.cash_discount,
        p.net_amount_paid,
        p.bank_name,
        p.branch,
        p.account_no,
        p.ifsc_code,
        p.payment_mode,
        p.rtgs_reference_no,
        p.created_at
    FROM contracts c
    JOIN vendors v ON v.vendor_id = c.vendor_id
    LEFT JOIN stage2_manager_report s2 ON s2.contract_id = c.contract_id
    LEFT JOIN stage3_4_cts_samples s3 ON s3.contract_id = c.contract_id
    LEFT JOIN stage5_payment_requisition p ON p.contract_id = c.contract_id;
    `;

    try {
        console.log("Initializing Database...");

        // Execute Table Creations
        const statements = schema.split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const stmt of statements) {
            await run(stmt);
        }

        // Execute View
        const viewStatements = viewSchema.split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const stmt of viewStatements) {
            await run(stmt);
        }

        console.log("Tables created.");

        // Seed Users
        const managerHash = await bcrypt.hash('manager', 10);
        const chairmanHash = await bcrypt.hash('chairman', 10);

        // Check if user exists using 'get'
        const seedUserSafe = async (username, role, matchHash) => {
            const row = await get("SELECT * FROM users WHERE username = ?", [username]); // SQLite uses ?
            if (!row) {
                console.log(`Seeding user: ${username}`);
                await run(`INSERT INTO users (username, full_name, email, role, department, password) VALUES (?, ?, ?, ?, ?, ?)`,
                    [username, username + ' User', `${username}@cotton.com`, role, 'Dept', matchHash]);
            }
        };

        await seedUserSafe('manager', 'Manager', managerHash);
        await seedUserSafe('chairman', 'Chairman', chairmanHash);

        // No vendors seeded - user can add through UI

        console.log("Done.");

    } catch (err) {
        console.error("Fatal Error:", err);
    } finally {
        if (pool && pool.end) pool.end();
    }
};

initDb();
