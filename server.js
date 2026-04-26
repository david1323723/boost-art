const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
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

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// =======================
// Multer Setup
// =======================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "uploads");

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },

  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }
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

app.post(
  "/api/posts",
  adminAuth,
  upload.single("image"),
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

      const mediaUrl =
        `${BASE_URL}/uploads/${req.file.filename}`;

      const newPost = new Post({

        title,
        description,
        category,

        mediaUrl,

        uploadedBy:
          req.admin._id

      });

      await newPost.save();

      res.json({
        message: "Post created"
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