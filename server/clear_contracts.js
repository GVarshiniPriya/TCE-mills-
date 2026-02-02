const { run, pool } = require('./db');

const clearContracts = async () => {
    try {
        console.log("Clearing all contract data...");

        // Delete from all contract-related tables
        await run("DELETE FROM stage_history");
        await run("DELETE FROM stage5_payment_requisition");
        await run("DELETE FROM stage5_chairman_decision");
        await run("DELETE FROM stage4_chairman_decision");
        await run("DELETE FROM stage3_4_cts_samples");
        await run("DELETE FROM stage2_chairman_decision");
        await run("DELETE FROM stage2_manager_report");
        await run("DELETE FROM stage1_chairman_decision");
        await run("DELETE FROM contracts");

        // Vacuum to reclaim space and reset auto-increments (optional)
        await run("VACUUM");

        console.log("All contract details removed successfully.");
    } catch (e) {
        console.error("Error clearing contracts:", e);
    }
};

clearContracts();
