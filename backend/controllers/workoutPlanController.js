// backend/controllers/workoutPlanController.js
const db = require("../config/db");

// POST /api/workout-plans — Trainer creates a weekly plan for a client
async function createPlan(req, res) {
  try {
    if (req.user.role !== "trainer") {
      return res.status(403).json({ error: "Trainers only." });
    }

    const { clientId, planName, exercises } = req.body;
    if (!clientId || !planName || !exercises) {
      return res.status(400).json({ error: "clientId, planName, and exercises are required." });
    }

    // Delete any existing plan for this client from this trainer
    const existing = await db.get(
      `SELECT id FROM workout_plans WHERE trainer_id = ? AND client_id = ?`,
      [req.user.id, clientId]
    );
    if (existing) {
      await db.run(`DELETE FROM plan_exercises WHERE plan_id = ?`, [existing.id]);
      await db.run(`DELETE FROM workout_plans WHERE id = ?`, [existing.id]);
    }

    // Create the plan
    const result = await db.run(
      `INSERT INTO workout_plans (trainer_id, client_id, plan_name) VALUES (?, ?, ?)`,
      [req.user.id, clientId, planName]
    );
    const planId = result.lastID;

    // Insert exercises for each day
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    for (const day of days) {
      const dayExercises = exercises[day];
      if (dayExercises && Array.isArray(dayExercises)) {
        for (const ex of dayExercises) {
          await db.run(
            `INSERT INTO plan_exercises (plan_id, day_of_week, exercise_name, sets, reps, notes) VALUES (?, ?, ?, ?, ?, ?)`,
            [planId, day, ex.name, ex.sets || "", ex.reps || "", ex.notes || ""]
          );
        }
      }
    }

    // Fetch and return the created plan
    const plan = await db.get(`SELECT * FROM workout_plans WHERE id = ?`, [planId]);
    const allExercises = await db.all(`SELECT * FROM plan_exercises WHERE plan_id = ? ORDER BY id`, [planId]);

    res.status(201).json({
      id: plan.id,
      trainerId: plan.trainer_id,
      clientId: plan.client_id,
      planName: plan.plan_name,
      createdAt: plan.created_at,
      exercises: allExercises
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

// GET /api/workout-plans — Trainer gets all plans they created
async function getTrainerPlans(req, res) {
  try {
    if (req.user.role !== "trainer") {
      return res.status(403).json({ error: "Trainers only." });
    }

    const plans = await db.all(
      `SELECT wp.*, u.firstname, u.lastname, u.username 
       FROM workout_plans wp 
       JOIN users u ON u.id = wp.client_id 
       WHERE wp.trainer_id = ? 
       ORDER BY wp.created_at DESC`,
      [req.user.id]
    );

    // For each plan, fetch exercises
    const result = [];
    for (const plan of plans) {
      const exercises = await db.all(
        `SELECT * FROM plan_exercises WHERE plan_id = ? ORDER BY id`,
        [plan.id]
      );
      result.push({
        id: plan.id,
        trainerId: plan.trainer_id,
        clientId: plan.client_id,
        clientName: plan.firstname + " " + plan.lastname,
        clientUsername: plan.username,
        planName: plan.plan_name,
        createdAt: plan.created_at,
        exercises
      });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

// GET /api/workout-plans/my-plan — Client gets their assigned plan
async function getMyPlan(req, res) {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ error: "Clients only." });
    }

    const plan = await db.get(
      `SELECT wp.*, u.firstname as trainer_firstname, u.lastname as trainer_lastname 
       FROM workout_plans wp 
       JOIN users u ON u.id = wp.trainer_id 
       WHERE wp.client_id = ? 
       ORDER BY wp.created_at DESC LIMIT 1`,
      [req.user.id]
    );

    if (!plan) {
      return res.json(null);
    }

    const exercises = await db.all(
      `SELECT * FROM plan_exercises WHERE plan_id = ? ORDER BY id`,
      [plan.id]
    );

    res.json({
      id: plan.id,
      trainerId: plan.trainer_id,
      trainerName: plan.trainer_firstname + " " + plan.trainer_lastname,
      planName: plan.plan_name,
      createdAt: plan.created_at,
      exercises
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

// DELETE /api/workout-plans/:id — Trainer deletes a plan
async function deletePlan(req, res) {
  try {
    if (req.user.role !== "trainer") {
      return res.status(403).json({ error: "Trainers only." });
    }

    const id = parseInt(req.params.id);
    const plan = await db.get(`SELECT * FROM workout_plans WHERE id = ? AND trainer_id = ?`, [id, req.user.id]);
    if (!plan) return res.status(404).json({ error: "Plan not found." });

    await db.run(`DELETE FROM plan_exercises WHERE plan_id = ?`, [id]);
    await db.run(`DELETE FROM workout_plans WHERE id = ?`, [id]);

    res.json({ message: "Plan deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

// PATCH /api/workout-plans/exercises/:exerciseId/complete — Client toggles exercise completion
async function toggleExerciseComplete(req, res) {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ error: "Clients only." });
    }

    const exerciseId = parseInt(req.params.exerciseId);

    // Verify this exercise belongs to the client's plan
    const exercise = await db.get(
      `SELECT pe.*, wp.client_id 
       FROM plan_exercises pe 
       JOIN workout_plans wp ON wp.id = pe.plan_id 
       WHERE pe.id = ?`,
      [exerciseId]
    );

    if (!exercise || exercise.client_id !== req.user.id) {
      return res.status(404).json({ error: "Exercise not found." });
    }

    const newStatus = exercise.is_completed ? 0 : 1;
    const completedAt = newStatus ? new Date().toISOString() : null;

    await db.run(
      `UPDATE plan_exercises SET is_completed = ?, completed_at = ? WHERE id = ?`,
      [newStatus, completedAt, exerciseId]
    );

    res.json({
      id: exerciseId,
      is_completed: newStatus,
      completed_at: completedAt
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = { createPlan, getTrainerPlans, getMyPlan, deletePlan, toggleExerciseComplete };
