const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Models
const Post = require("./models/Post");
const User = require("./models/User");
const Admin = require("./models/Admin");
const Message = require("./models/Message");

// Routes
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// =======================
// Middleware
// =======================

// Configure CORS to allow all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// =======================
// Multer Setup
// =======================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = "uploads/";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith("video/");

  if (extname || mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only images and videos are allowed"));
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// =======================
// MongoDB Connection
// =======================

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/boostart")
.then(() => {
  console.log("✅ MongoDB Connected Successfully");
})
.catch((err) => {
  console.error("❌ MongoDB Connection Error:", err);
});

// =======================
// Test Route
// =======================

app.get("/", (req, res) => {
  res.json({
    message: "🚀 BOOST ART API Running...",
    version: "2.0.0",
    features: ["image upload", "video upload", "comments", "messages", "admin panel"]
  });
});

// =======================
// API Routes
// =======================

// User routes
app.use("/api/users", userRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);

// =======================
// LEGACY: CREATE POST (Keep for backward compatibility)
// =======================

app.post("/api/posts", upload.single("image"), async (req, res) => {
  try {
    const { title, description, category } = req.body;

    if (!title || !category) {
      return res.status(400).json({
        message: "Title and category are required"
      });
    }

    let mediaUrl = "";
    let mediaType = "image";

    if (req.file) {
      mediaUrl = `http://localhost:5000/uploads/${req.file.filename}`;
      
      // Determine media type
      if (req.file.mimetype.startsWith("video/")) {
        mediaType = "video";
      }
    } else {
      return res.status(400).json({
        message: "Image is required"
      });
    }

    const newPost = new Post({
      title,
      description,
      mediaUrl,
      mediaType,
      category
    });

    const savedPost = await newPost.save();

    res.status(201).json({
      message: "Post created successfully",
      post: savedPost
    });
  } catch (error) {
    console.error("POST ERROR:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
});

// =======================
// LEGACY: GET POSTS (Keep for backward compatibility)
// =======================

app.get("/api/posts", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    console.error("FETCH ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch posts"
    });
  }
});

// =======================
// GET SINGLE POST (Public)
// =======================

app.get("/api/posts/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  } catch (error) {
    console.error("GET POST ERROR:", error);
    res.status(500).json({ message: "Failed to fetch post" });
  }
});

// =======================
// Error Handling Middleware
// =======================

app.use((err, req, res, next) => {
  console.error("ERROR:", err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large. Maximum size is 100MB." });
    }
    return res.status(400).json({ message: err.message });
  }
  
  res.status(500).json({
    message: "Internal server error",
    error: err.message
  });
});

// =======================
// 404 Handler
// =======================

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// =======================
// SERVER START
// =======================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
  console.log(`📁 Upload directory: ./uploads`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
});

