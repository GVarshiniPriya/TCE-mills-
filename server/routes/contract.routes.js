const express = require('express');
const router = express.Router();
const { run, query, get } = require('../db');
const { authenticateToken } = require('../middleware/auth.middleware');

// --- Helper: Determine Stage & Status ---
const determineStageStatus = async (contract, lot) => {
    // If no lot exists yet, check Contract-Level stages (1 & 2)
    if (!lot) {
        // Stage 2 Manager Decision?? No, Stage 2 is "Quality Entry" (Contract Level)
        const s2 = await get("SELECT * FROM stage2_chairman_decision WHERE contract_id = ?", [contract.contract_id]);
        if (s2 && s2.decision === 'Approve') return { stage: 3, status: "Pending Sampling" };
        if (s2 && s2.decision === 'Reject') return { stage: 2, status: "Stage 2 Rejected" };

        const s2m = await get("SELECT * FROM stage2_manager_report WHERE contract_id = ?", [contract.contract_id]);
        if (s2m) return { stage: 2, status: "Pending Chairman Approval" };

        const s1 = await get("SELECT * FROM stage1_chairman_decision WHERE contract_id = ?", [contract.contract_id]);
        if (s1 && s1.decision === 'Approve') return { stage: 2, status: "Pending Quality Entry" };
        if (s1 && s1.decision === 'Reject') return { stage: 1, status: "Stage 1 Rejected" };

        return { stage: 1, status: "Pending Chairman Approval" }; // Default S1
    }

    // LOT EXIST: Check Lot-Level Stages (3, 4, 5)
    // Lot Decisions
    const s5d = await get("SELECT * FROM lot_decisions WHERE lot_id = ? AND stage_number = 5", [lot.lot_id]);
    if (s5d && s5d.decision === 'Approve') return { stage: 6, status: 'Closed' };
    if (s5d && s5d.decision === 'Modify') return { stage: 5, status: 'Rollback Requested' };
    if (s5d && s5d.decision === 'Reject') return { stage: 5, status: 'Stage 5 Rejected' };

    // Stage 5 Payment Entry
    if (lot.net_amount_paid) return { stage: 5, status: "Pending Chairman Approval" };

    const s4d = await get("SELECT * FROM lot_decisions WHERE lot_id = ? AND stage_number = 4", [lot.lot_id]);
    if (s4d && s4d.decision === 'Approve') return { stage: 5, status: "Pending Payment Entry" };
    if (s4d && s4d.decision === 'Reject') return { stage: 4, status: 'Stage 4 Rejected' };

    // Stage 4 CTS Entry (Check if mic_value is present)
    if (lot.mic_value != null) return { stage: 4, status: "Pending Chairman Approval" };

    // Stage 3 (If lot exists, S3 is done mostly? Or is S3 explicitly approved? S3 has no approval in old code)
    // Old code: S3 entry -> Status "Pending CTS Entry" (Stage 4)
    return { stage: 4, status: "Pending CTL Entry" };
};

// --- ROUTES ---

// GET Contracts (Dashboard) - Returns Expanded List (Lots)
router.get('/contracts', authenticateToken, async (req, res) => {
    try {
        // Left Join to include contracts without lots (Stage 1/2) and with lots (Stage 3+)
        const sql = `
            SELECT c.*, v.vendor_name, v.gst_number, v.phone_number,
                   l.lot_id, l.lot_number, l.arrival_date, l.stage4_remarks, l.stage5_remarks,
                   l.mic_value, l.net_amount_paid, l.sequence_start, l.no_of_samples, l.trash_percent, l.moisture_percent, l.strength, l.uhml, l.ui_percent, l.sfi, l.elongation, l.rd, l.plus_b, l.colour_grade, l.mat, l.sci, l.test_date, l.confirmation_date, l.report_document_path, l.trash_percent_samples
            FROM contracts c
            JOIN vendors v ON c.vendor_id = v.vendor_id
            LEFT JOIN contract_lots l ON c.contract_id = l.contract_id
            ORDER BY c.contract_id DESC, l.lot_id ASC
        `;
        const rows = await query(sql);

        const processed = await Promise.all(rows.map(async (row) => {
            // Separate Contract and Lot data for helper
            const contractData = { contract_id: row.contract_id };
            const lotData = row.lot_id ? {
                lot_id: row.lot_id,
                mic_value: row.mic_value,
                net_amount_paid: row.net_amount_paid
            } : null;

            const statusObj = await determineStageStatus(contractData, lotData);

            if (row.stage1_params) {
                try { row.stage1_params = JSON.parse(row.stage1_params); } catch (e) { }
            }

            return { ...row, ...statusObj };
        }));

        res.json(processed);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// GET Single Contract + Lots Details
router.get('/contracts/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const contract = await get(`
            SELECT c.*, v.vendor_name, v.gst_number, v.vendor_type, v.state, v.phone_number, v.address 
            FROM contracts c
            JOIN vendors v ON c.vendor_id = v.vendor_id
            WHERE c.contract_id = ?
        `, [id]);

        if (!contract) return res.status(404).json({ message: "Not found" });

        // Get Lots
        const lots = await query("SELECT * FROM contract_lots WHERE contract_id = ?", [id]);

        // Enhance lots with status & decisions
        const lotsWithDetails = await Promise.all(lots.map(async (l) => {
            const statusObj = await determineStageStatus(contract, l);
            const s4Decision = await get("SELECT * FROM lot_decisions WHERE lot_id = ? AND stage_number = 4", [l.lot_id]);
            const s5Decision = await get("SELECT * FROM lot_decisions WHERE lot_id = ? AND stage_number = 5", [l.lot_id]);
            return { ...l, ...statusObj, s4Decision, s5Decision };
        }));

        // Contract Level Details
        const stage1Decision = await get("SELECT * FROM stage1_chairman_decision WHERE contract_id = ?", [id]);
        const stage2 = await get("SELECT * FROM stage2_manager_report WHERE contract_id = ?", [id]);
        const stage2Decision = await get("SELECT * FROM stage2_chairman_decision WHERE contract_id = ?", [id]);

        // Current overall status (Contract Level or Aggregate)
        const contractStatus = await determineStageStatus(contract, null);

        res.json({
            ...contract,
            stage1_params: contract.stage1_params ? JSON.parse(contract.stage1_params) : null,
            ...contractStatus, // Stage/Status of the contract itself (S1-S2)
            lots: lotsWithDetails,
            stage1Decision, stage2, stage2Decision
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// STAGE 1: Create
router.post('/contracts', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Manager') return res.status(403).json({ message: "Manager only" });

    const { vendor_id, cotton_type, quality, quantity, price, document_path, entry_date, params } = req.body;
    const entered_by = req.user.user_id;

    try {
        const stage1_params = params ? JSON.stringify(params) : null;

        const result = await run(
            `INSERT INTO contracts (vendor_id, cotton_type, quality, quantity, price, document_path, entry_date, entered_by, stage1_params) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [vendor_id, cotton_type, quality, quantity, price, document_path, entry_date, entered_by, stage1_params]
        );

        const newContractId = result.lastID;

        await run(`INSERT INTO stage_history (contract_id, stage_number, action, performed_by, remarks) VALUES (?, ?, ?, ?, ?)`,
            [newContractId, 1, 'Created', entered_by, 'Contract Created']);

        res.json({ message: "Contract created", contract_id: newContractId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// STAGE 1: Chairman Decision
router.post('/contracts/:id/stage1/decision', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Chairman') return res.status(403).json({ message: "Chairman only" });
    const { id } = req.params;
    const { decision, remarks } = req.body; // Approve / Reject

    try {
        await run(`INSERT INTO stage1_chairman_decision (contract_id, decision, remarks, decision_date) 
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (contract_id) DO UPDATE SET decision=excluded.decision, remarks=excluded.remarks, decision_date=CURRENT_TIMESTAMP`,
            [id, decision, remarks]);

        await run(`INSERT INTO stage_history (contract_id, stage_number, action, performed_by, remarks) VALUES (?, ?, ?, ?, ?)`,
            [id, 1, decision, req.user.user_id, remarks]);

        res.json({ message: "Stage 1 Decision Saved" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// STAGE 2: Manager Quality Entry
router.post('/contracts/:id/stage2', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Manager') return res.status(403).json({ message: "Manager only" });
    const { id } = req.params;
    // Only accepting Average values + Date - Variety and Price Removed
    const { report_date, report_document_path, uhml, ui, strength, elongation, mic, rd, plus_b, remarks } = req.body;

    try {
        await run(`INSERT INTO stage2_manager_report 
            (contract_id, report_date, report_document_path, uhml, ui, strength, elongation, mic, rd, plus_b, entered_by, remarks, uploaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (contract_id) DO UPDATE SET
            report_date=excluded.report_date, report_document_path=excluded.report_document_path,
            uhml=excluded.uhml, ui=excluded.ui, strength=excluded.strength, elongation=excluded.elongation, mic=excluded.mic,
            rd=excluded.rd, plus_b=excluded.plus_b, entered_by=excluded.entered_by, remarks=excluded.remarks, uploaded_at=CURRENT_TIMESTAMP`,
            [id, report_date, report_document_path, uhml, ui, strength, elongation, mic, rd, plus_b, req.user.user_id, remarks]);

        await run(`INSERT INTO stage_history (contract_id, stage_number, action, performed_by, remarks) VALUES (?, ?, ?, ?, ?)`,
            [id, 2, 'Quality Entry', req.user.user_id, 'Manager entered quality reports (Averages)']);

        res.json({ message: "Stage 2 Data Saved" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// STAGE 2: Chairman Decision
router.post('/contracts/:id/stage2/decision', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Chairman') return res.status(403).json({ message: "Chairman only" });
    const { id } = req.params;
    const { decision, remarks } = req.body; // Approve / Reject

    try {
        await run(`INSERT INTO stage2_chairman_decision (contract_id, decision, remarks, decided_by, decision_date) 
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (contract_id) DO UPDATE SET decision=excluded.decision, remarks=excluded.remarks, decided_by=excluded.decided_by, decision_date=CURRENT_TIMESTAMP`,
            [id, decision, remarks, req.user.user_id]);

        await run(`INSERT INTO stage_history (contract_id, stage_number, action, performed_by, remarks) VALUES (?, ?, ?, ?, ?)`,
            [id, 2, decision, req.user.user_id, remarks]);

        res.json({ message: "Stage 2 Decision Saved" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// STAGE 3: Sampling (Manager) - Create/Update Lots
router.post('/contracts/:id/stage3', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Manager') return res.status(403).json({ message: "Manager only" });
    const { id } = req.params;
    const { lots } = req.body; // Expecting array of { lot_number, arrival_date, sequence_start, no_of_samples }

    try {
        if (!lots || !Array.isArray(lots)) return res.status(400).json({ message: "Invalid lots data" });

        for (const lot of lots) {
            // Determine Sequence End (Backend Calc optional or trust frontend)
            // Frontend sends it? Let's check. Yes.
            // Auto-calc end if needed? 
            let { lot_number, arrival_date, sequence_start, no_of_samples } = lot;

            // Calculate Sequence End (Simple implementation assuming numeric)
            // If seq start is "101", and count 50 -> "150". 
            // Note: Frontend appends financial year. We store raw start/end usually, or formatted?
            // Previous code stored raw strings. Let's trust frontend or recalculate.
            // For simplicity, let's assume frontend sends correct data or rely on simple logic if missing.
            let sequence_end = lot.sequence_end;
            if (!sequence_end && sequence_start && no_of_samples) {
                sequence_end = parseInt(sequence_start) + parseInt(no_of_samples) - 1;
            }

            if (lot.lot_id) {
                // Update
                await run(`UPDATE contract_lots SET 
                    lot_number=?, arrival_date=?, sequence_start=?, sequence_end=?, no_of_samples=?
                    WHERE lot_id=? AND contract_id=?`,
                    [lot_number, arrival_date, sequence_start, sequence_end, no_of_samples, lot.lot_id, id]);
            } else {
                // Insert
                await run(`INSERT INTO contract_lots (contract_id, lot_number, arrival_date, sequence_start, sequence_end, no_of_samples) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [id, lot_number, arrival_date, sequence_start, sequence_end, no_of_samples]);
            }
        }

        await run(`INSERT INTO stage_history (contract_id, stage_number, action, performed_by, remarks) VALUES (?, ?, ?, ?, ?)`,
            [id, 3, 'Sampling Entry', req.user.user_id, `Sampling: ${lots.length} lots processed`]);

        res.json({ message: "Stage 3 Data Saved" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// STAGE 4: CTS Entry (Manager) - Per Lot
router.post('/contracts/:id/lots/:lotId/stage4', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Manager') return res.status(403).json({ message: "Manager only" });
    const { id, lotId } = req.params;
    const {
        mic_value, strength, uhml, ui_percent, sfi, elongation, rd, plus_b, colour_grade, mat, sci, trash_percent, moisture_percent,
        test_date, confirmation_date, remarks, report_document_path, trash_percent_samples
    } = req.body;

    try {
        await run(`UPDATE contract_lots SET 
            mic_value=?, strength=?, uhml=?, ui_percent=?, sfi=?, elongation=?, rd=?, plus_b=?, colour_grade=?, mat=?, sci=?, trash_percent=?, moisture_percent=?,
            test_date=?, confirmation_date=?, stage4_remarks=?, report_document_path=?, trash_percent_samples=?
            WHERE lot_id=? AND contract_id=?`,
            [mic_value, strength, uhml, ui_percent, sfi, elongation, rd, plus_b, colour_grade, mat, sci, trash_percent, moisture_percent,
                test_date, confirmation_date, remarks, report_document_path, trash_percent_samples, lotId, id]);

        await run(`INSERT INTO stage_history (contract_id, lot_id, stage_number, action, performed_by, remarks) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, lotId, 4, 'CTS Entry', req.user.user_id, 'CTS results entered for Lot']);

        res.json({ message: "Stage 4 Data Saved" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// STAGE 4: Chairman Decision (Per Lot)
router.post('/contracts/:id/lots/:lotId/stage4/decision', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Chairman') return res.status(403).json({ message: "Chairman only" });
    const { id, lotId } = req.params;
    const { decision, remarks } = req.body;

    try {
        await run(`INSERT INTO lot_decisions (lot_id, stage_number, decision, remarks, decided_by, decision_date) 
            VALUES (?, 4, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [lotId, decision, remarks, req.user.user_id]);

        await run(`INSERT INTO stage_history (contract_id, lot_id, stage_number, action, performed_by, remarks) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, lotId, 4, decision, req.user.user_id, remarks]);

        res.json({ message: "Stage 4 Decision Saved" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// STAGE 5: Payment Entry (Manager) - Per Lot
router.post('/contracts/:id/lots/:lotId/stage5', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Manager') return res.status(403).json({ message: "Manager only" });
    const { id, lotId } = req.params;
    const { invoice_value, tds_amount, cash_discount, net_amount_paid, bank_name, branch, account_no, ifsc_code, payment_mode, rtgs_reference_no } = req.body;

    try {
        await run(`UPDATE contract_lots SET 
            invoice_value=?, tds_amount=?, cash_discount=?, net_amount_paid=?, bank_name=?, branch=?, account_no=?, ifsc_code=?, payment_mode=?, rtgs_reference_no=?, invoice_number=?, invoice_weight=?
            WHERE lot_id=? AND contract_id=?`,
            [
                invoice_value || 0,
                tds_amount || 0,
                cash_discount || 0,
                net_amount_paid || 0,
                bank_name || '',
                branch || '',
                account_no || '',
                ifsc_code || '',
                payment_mode || 'RTGS',
                rtgs_reference_no || '',
                req.body.invoice_number || '',
                req.body.invoice_weight || null,
                lotId, id
            ]);

        await run(`INSERT INTO stage_history (contract_id, lot_id, stage_number, action, performed_by, remarks) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, lotId, 5, 'Payment Entry', req.user.user_id, 'Payment requisition entered for Lot']);

        // Reset Decision if Rollback happened
        await run("DELETE FROM lot_decisions WHERE lot_id = ? AND stage_number = 5", [lotId]);

        res.json({ message: "Stage 5 Data Saved" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// STAGE 5: Chairman Decision (Per Lot)
router.post('/contracts/:id/lots/:lotId/stage5/decision', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Chairman') return res.status(403).json({ message: "Chairman only" });
    const { id, lotId } = req.params;
    const { decision, remarks } = req.body;

    try {
        await run(`INSERT INTO lot_decisions (lot_id, stage_number, decision, remarks, decided_by, decision_date) 
            VALUES (?, 5, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [lotId, decision, remarks, req.user.user_id]);

        await run(`INSERT INTO stage_history (contract_id, lot_id, stage_number, action, performed_by, remarks) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, lotId, 5, decision, req.user.user_id, remarks]);

        res.json({ message: "Stage 5 Decision Saved" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
