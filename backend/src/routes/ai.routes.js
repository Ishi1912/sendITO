const express = require("express");
const aiController = require("../controllers/ai.controller");
const auth = require("../middlewares/auth.middleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../../uploads/ai-assistant");
fs.mkdirSync(uploadDir, { recursive: true });
const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf", ".doc", ".docx"]);
const referenceUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (allowedExtensions.has(path.extname(file.originalname).toLowerCase())) return cb(null, true);
    return cb(new Error("Only images, PDF, DOC and DOCX files are supported."));
  }
});

const router = express.Router();

router.post("/generate", auth, aiController.generateEmail);
router.post("/insights", auth, aiController.generateInsights);
// Return useful JSON errors for Multer failures instead of Express's generic HTML error page.
router.post("/files", auth, (req, res, next) => {
  referenceUpload.array("files", 10)(req, res, (error) => {
    if (!error) return next();
    const isSizeError = error.code === "LIMIT_FILE_SIZE";
    const isCountError = error.code === "LIMIT_FILE_COUNT";
    const message = isSizeError
      ? "Each file must be 10MB or smaller."
      : isCountError
        ? "You can upload up to 10 files at a time."
        : error.message || "Unable to process uploaded files.";
    return res.status(400).json({ success: false, message });
  });
}, aiController.uploadReferenceFiles);
router.delete("/files/:filename", auth, aiController.removeReferenceFile);
router.post("/spam-check", auth, aiController.checkSpamRisk);

module.exports = router;