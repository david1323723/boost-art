/**
 * ============================================================
 * BoostArt Server — Cloudinary Edition (Robust)
 * ============================================================
 * All media is uploaded to Cloudinary via direct SDK call.
 * Multer stores files temporarily in RAM (memoryStorage) and we
 * immediately upload the buffer to Cloudinary.
 *
 * This approach:
 *   • Works reliably with any version of multer
 *   • Captures upload errors explicitly
 *   • Does NOT depend on local filesystem or express.static
 * ============================================================
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const http = require("http");
const { Server } = require("socket.io");
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

// Cloudinary helpers
const { uploadToCloudinary, deleteFromCloudinary } = require("./utils/cloudinary");
const { uploadFile } = require("./utils/multer-memory-upload");

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
// 1. multer.memoryStorage() buffers the file in req.file.buffer
// 2. uploadToCloudinary() uploads the buffer to Cloudinary
// 3. MongoDB stores only the returned Cloudinary URL
// =======================

app.post(
  "/api/posts",
  adminAuth,
  uploadFile,                          // <-- multer memoryStorage
  async (req, res) => {
    try {
      const { title, description, category } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "Upload file required" });
      }

      // Upload buffer to Cloudinary (images + videos both supported)
      const uploadResult = await uploadToCloudinary(req.file);

      const mediaUrl = uploadResult.secure_url;
      const mediaType = req.file.mimetype.startsWith("video/") ? "video" : "image";

      const newPost = new Post({
        title,
        description,
        category,
        mediaUrl,     // <-- Cloudinary URL stored in MongoDB
        mediaType,
        uploadedBy: req.admin._id
      });

      await newPost.save();

      res.json({
        message: "Post created",
        post: newPost
      });

    } catch (err) {
      console.error("POST ERROR:", err);
      res.status(500).json({
        message: err.message || "Post failed"
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

