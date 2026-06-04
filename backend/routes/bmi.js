// backend/routes/bmi.js
const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const db      = require("../config/db");

// GET /api/bmi  – last 10 records
router.get("/", auth, async (req, res) => {
  try {
    const records = await db.all(`SELECT * FROM bmi_records WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 10`, [req.user.id]);
    res.json(records.map(r => ({
      id: r.id,
      userId: r.user_id,
      heightCm: r.height_cm,
      weightKg: r.weight_kg,
      bmi: r.bmi,
      category: r.category,
      recordedAt: r.recorded_at
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/bmi
router.post("/", auth, async (req, res) => {
  try {
    const { heightCm, weightKg } = req.body;
    if (!heightCm || !weightKg) return res.status(400).json({ error: "Height and weight required." });
    
    const bmi = parseFloat((weightKg / ((heightCm / 100) ** 2)).toFixed(2));
    let category = "Normal";
    if (bmi < 18.5) category = "Underweight";
    else if (bmi >= 30) category = "Obese";
    else if (bmi >= 25) category = "Overweight";

    const result = await db.run(
      `INSERT INTO bmi_records (user_id, height_cm, weight_kg, bmi, category) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, heightCm, weightKg, bmi, category]
    );

    // Also insert into weight_logs (to match previous localStorage behavior)
    await db.run(
      `INSERT INTO weight_logs (user_id, weight_kg, notes, logged_date) VALUES (?, ?, ?, ?)`,
      [req.user.id, weightKg, "from BMI entry", new Date().toISOString().split("T")[0]]
    );

    const r = await db.get(`SELECT * FROM bmi_records WHERE id = ?`, [result.lastID]);

    res.status(201).json({
      id: r.id,
      userId: r.user_id,
      heightCm: r.height_cm,
      weightKg: r.weight_kg,
      bmi: r.bmi,
      category: r.category,
      recordedAt: r.recorded_at
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
