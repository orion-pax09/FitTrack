const db = require('../backend/config/db');

async function check() {
  const weights = await db.all(`SELECT * FROM weight_logs WHERE user_id = ? ORDER BY logged_date ASC`, [6]);
  
  const mapped = weights.map(w => ({
    id: w.id, kg: w.weight_kg, date: w.logged_date, ts: new Date(w.logged_date).getTime()
  }));

  console.log("Mapped weights:", mapped);
}

check().catch(console.error);
