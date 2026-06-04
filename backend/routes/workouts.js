// backend/routes/workouts.js
const express = require("express");
const router  = express.Router();
const { getSuggestions, sendSuggestion, deleteSuggestion } = require("../controllers/workoutController");
const auth = require("../middleware/auth");

router.get("/",        auth, getSuggestions);   // client: see own; trainer: see sent
router.post("/",       auth, sendSuggestion);   // trainer only
router.delete("/:id",  auth, deleteSuggestion); // trainer only

module.exports = router;
