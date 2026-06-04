const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const auth = require("../middleware/auth");
const adminController = require("../controllers/adminController");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ error: "Access denied. Admins only." });
}

// Special check for memberships: admin can access everything, client can only do GET
function requireAdminOrOwnClient(req, res, next) {
  if (req.user && (req.user.role === "admin" || (req.user.role === "client" && req.method === "GET"))) {
    return next();
  }
  return res.status(403).json({ error: "Access denied." });
}

router.use(auth);

// Stats & Users
router.get("/stats", requireAdmin, adminController.getStats);
router.get("/users", requireAdmin, adminController.getUsers);
router.post("/assign-trainer", requireAdmin, adminController.assignTrainer);

// Memberships
router.get("/memberships", requireAdminOrOwnClient, adminController.getMemberships);
router.post("/memberships", requireAdmin, adminController.saveMembership);
router.delete("/memberships/:id", requireAdmin, adminController.deactivateMembership);

// Tutorials (Admin view/management)
router.get("/tutorials", requireAdmin, adminController.getTutorials);
router.post("/tutorials", requireAdmin, upload.single("videoFile"), adminController.createTutorial);
router.delete("/tutorials/:id", requireAdmin, adminController.deleteTutorial);

// Reports
router.get("/reports", requireAdmin, adminController.getReports);

module.exports = router;
