// backend/routes/auth.js
const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const { register, login, getTrainers, getClients } = require("../controllers/authController");

router.post("/register",  register);
router.post("/login",     login);
router.get("/trainers",   getTrainers);   // for registration dropdown
router.get("/clients",    auth, getClients); // for trainer dashboard/client list

module.exports = router;
