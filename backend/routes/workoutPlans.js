// backend/routes/workoutPlans.js
const express = require("express");
const router  = express.Router();
const {
  createPlan,
  getTrainerPlans,
  getMyPlan,
  deletePlan,
  toggleExerciseComplete
} = require("../controllers/workoutPlanController");
const auth = require("../middleware/auth");

router.post("/",                              auth, createPlan);          // trainer creates plan
router.get("/",                               auth, getTrainerPlans);     // trainer lists plans
router.get("/my-plan",                        auth, getMyPlan);           // client gets their plan
router.delete("/:id",                         auth, deletePlan);          // trainer deletes plan
router.patch("/exercises/:exerciseId/complete", auth, toggleExerciseComplete); // client toggles

module.exports = router;
