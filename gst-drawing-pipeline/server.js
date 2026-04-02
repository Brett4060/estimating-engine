require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");

const uploadRouter = require("./src/routes/upload");
const statusRouter = require("./src/routes/status");

const app = express();
const PORT = process.env.PORT || 3001;

// -------------------------------------------------------------------
// CORS
// -------------------------------------------------------------------
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

// -------------------------------------------------------------------
// Body parsers
// -------------------------------------------------------------------
app.use(express.json());

// -------------------------------------------------------------------
// Static files – serve the output directory
// -------------------------------------------------------------------
app.use(
  "/output",
  express.static(path.join(__dirname, "output"))
);

// -------------------------------------------------------------------
// Multer setup
// -------------------------------------------------------------------
const ACCEPTED_MIMES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/tiff",
  // DWG/DXF don't have standardised MIME types
  "application/octet-stream",
  "application/acad",
  "image/vnd.dwg",
  "image/vnd.dxf",
];

const ACCEPTED_EXTS = /\.(pdf|png|jpe?g|tiff?|dwg|dxf)$/i;

const storage = multer.diskStorage({
  destination: path.join(__dirname, "uploads"),
  filename: (req, file, cb) => {
    // Keep original name prefixed with timestamp to avoid collisions
    const prefix = Date.now();
    cb(null, `${prefix}_${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    if (ACCEPTED_EXTS.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not accepted: ${file.originalname}`));
    }
  },
});

// Attach multer instance so routes can use it
app.locals.upload = upload;

// -------------------------------------------------------------------
// Routes
// -------------------------------------------------------------------
app.post("/api/upload", upload.single("file"), uploadRouter);
app.get("/api/jobs/:id", statusRouter);
app.get("/api/jobs/:id/result", statusRouter);
app.get("/api/jobs/:id/scope-drawing", statusRouter);

// -------------------------------------------------------------------
// Error handling middleware
// -------------------------------------------------------------------
app.use((err, req, res, next) => {
  // Multer errors
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    console.error("Unhandled error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
  next();
});

// -------------------------------------------------------------------
// Start
// -------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`GST Drawing Pipeline server running on port ${PORT}`);
});

module.exports = app;
