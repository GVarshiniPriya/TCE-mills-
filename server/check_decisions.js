const { query } = require('./db');

async function checkDecisions() {
    try {
        console.log('Lot Decisions:');
        const decisions = await query("SELECT * FROM lot_decisions ORDER BY lot_id, stage_number");
        console.log(decisions);

        console.log('\nStage 1 Decisions:');
        const s1 = await query("SELECT * FROM stage1_chairman_decision");
        console.log(s1);

        console.log('\nStage 2 Decisions:');
        const s2 = await query("SELECT * FROM stage2_chairman_decision");
        console.log(s2);

    } catch (e) {
        console.error(e);
    }
}

checkDecisions();
