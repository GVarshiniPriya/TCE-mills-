const { run } = require('./db');

async function test() {
    try {
        console.log('Inserting contract...');
        const result = await run(
            `INSERT INTO contracts (contract_id, vendor_id, cotton_type, quality, quantity, price, document_path, entry_date, entered_by, stage1_params)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ["C4", 1, 'Domestic', 'A', 100.0, 50000.0, null, '2026-01-21', 1, null]
        );
        console.log('Success:', result);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

test();
