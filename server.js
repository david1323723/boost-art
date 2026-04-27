/**
 * ============================================================
 * BoostArt Server — Cloudinary Edition
 * ============================================================
 * All media (images + videos) are streamed directly to Cloudinary
 * via multer-storage-cloudinary.  Nothing is ever written to the
 * local disk, which makes the backend completely stateless and
 * immune to Render's ephemeral filesystem.
 *
 * What changed?
 * -------------
 * • Removed multer.diskStorage, express.static('uploads'), fs, path
 * • Imported Cloudinary storage from utils/cloudinary.js
 * • POST /api/posts now uses req.file.path (Cloudinary URL)
 * • mediaType is inferred from the uploaded file's MIME type
 * ============================================================
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Models
const Post = require("./models/Post");
const User = require("./models/User");
const Message = require("./models/Message");

// Middleware
const { adminAuth } = require("./middleware/adminAuth");

// Utils
const { filterMessage } = require("./utils/filterBadWords");

// Routes
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/adminRoutes");

// ------------------------------------------------------------------
// Cloudinary-backed Multer storage (replaces local diskStorage)
// ------------------------------------------------------------------
const { storage } = require("./utils/cloudinary");

const app = express();


// =======================
// CONFIG
// =======================

const BASE_URL =
  process.env.API_BASE_URL ||
  "https://boost-art-backend.onrender.com";


// =======================
// 🔥 CORS FIX (IMPORTANT)
// =======================

const corsOptions = {
  origin: [
    "https://boost-art-drab.vercel.app",
    "http://localhost:3000"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept"
  ],
  credentials: true
};

app.use(cors(corsOptions));
app.use(cors(corsOptions));


// =======================
// Middleware
// =======================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ❌ REMOVED: local static file serving — all media now lives on Cloudinary
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// =======================
// Multer Setup (Cloudinary)
// =======================
// We use the CloudinaryStorage engine imported above.  Files are
// streamed straight to Cloudinary; req.file.path contains the
// secure HTTPS URL that we persist in MongoDB.
// =======================

const upload = multer({
  storage,            // <-- CloudinaryStorage instance
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB cap
});


// =======================
// MongoDB Connection
// =======================

if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing in environment variables");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {

    console.log("✅ MongoDB Connected Successfully");

    try {

      console.log("🔍 Checking admin...");

      const userAdmin =
        await User.findOne({ username: "boostart" });

      if (!userAdmin) {

        console.log("📝 Creating default admin...");

        const newAdmin = new User({
          username: "boostart",
          email: "admin@boostart.com",
          password: "123456",
          fullName: "BoostArt Admin",
          isAdmin: true
        });

        await newAdmin.save();

        console.log("✅ Admin created");

      } else {

        console.log("✅ Admin already exists");

      }

    } catch (err) {

      console.error("Admin setup error:", err);

    }

  })
  .catch((err) => {

    console.error("❌ MongoDB Error:", err);

    process.exit(1);

  });


// =======================
// Test Route
// =======================

app.get("/", (req, res) => {

  res.json({
    message: "🚀 BOOST ART API Running..."
  });

});


// =======================
// API Routes
// =======================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", require("./routes/messageRoutes"));


// =======================
// CREATE POST
// =======================
// Streams the uploaded file directly to Cloudinary.
// req.file is populated by Multer + CloudinaryStorage.
// req.file.path  → secure Cloudinary URL (e.g. https://res.cloudinary.com/...)
// req.file.mimetype → "image/jpeg" or "video/mp4" etc.
// =======================

app.post(
  "/api/posts",
  adminAuth,
  upload.single("image"),   // field name matches frontend FormData key
  async (req, res) => {

    try {

      const {
        title,
        description,
        category
      } = req.body;

      if (!req.file) {

        return res
          .status(400)
          .json({ message: "Upload file required" });

      }

      // CloudinaryStorage returns the secure HTTPS URL in req.file.path
      const mediaUrl = req.file.path;

      // Derive mediaType from the file's MIME type
      const mediaType = req.file.mimetype.startsWith("video/") ? "video" : "image";

      const newPost = new Post({

        title,
        description,
        category,

        mediaUrl,    // <-- stored in MongoDB: only the Cloudinary URL
        mediaType,   // <-- "image" or "video"

        uploadedBy:
          req.admin._id

      });

      await newPost.save();

      res.json({
        message: "Post created",
        post: newPost
      });

    } catch (err) {

      console.error("POST ERROR:", err);

      res
        .status(500)
        .json({
          message: "Post failed"
        });

    }

  }
);


// =======================
// GET POSTS
// =======================

app.get("/api/posts", async (req, res) => {

  try {

    const posts =
      await Post.find()
        .sort({ createdAt: -1 });

    res.json(posts);

  } catch (err) {

    console.error("FETCH ERROR:", err);

    res
      .status(500)
      .json({
        message: "Failed to fetch posts"
      });

  }

});

app.get("/api/posts/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error("GET SINGLE POST ERROR:", error);
    res.status(500).json({ message: "Failed to fetch post" });
  }
});


// =======================
// SOCKET.IO
// =======================

const httpServer =
  http.createServer(app);

const io =
  new Server(httpServer, {

    cors: {
      origin:
        "https://boost-art-drab.vercel.app",
      methods: ["GET", "POST"],
      credentials: true
    }

  });
  app.use(express.json({ limit: "1gb" }));
app.use(express.urlencoded({ extended: true, limit: "1gb" }));


// =======================
// START SERVER
// =======================

const PORT =
  process.env.PORT || 5000;

httpServer.listen(PORT, () => {

  console.log(
    `🔥 Server running on port ${PORT}`
  );

  console.log(
    `🌐 API Base URL: ${BASE_URL}`
  );

});

