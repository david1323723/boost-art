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
const BASE_URL = process.env.API_BASE_URL || 'https://boost-art-backend.onrender.com';

// =======================
// Middleware
// =======================
app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'multipart/form-data']
}));

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
  limits: { fileSize: 100 * 1024 * 1024 }
});

// =======================
// MongoDB Connection
// =======================
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected Successfully");

    try {
      console.log("🔍 Checking admin in database...");

      const userAdmin = await User.findOne({ username: 'boostart' });

      if (!userAdmin) {
        console.log("📝 Creating default admin user...");

        const newAdmin = new User({
          username: 'boostart',
          email: 'admin@boostart.com',
          password: '123456',
          fullName: 'BoostArt Admin',
          isAdmin: true
        });

        await newAdmin.save();

        console.log("✅ Admin user created successfully - boostart/123456");
      } else {
        console.log("✅ Admin user already exists");
      }

    } catch (adminError) {
      console.error("❌ Admin setup error:", adminError);
    }

  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);

    // STOP SERVER if MongoDB fails
    process.exit(1);
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
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", require("./routes/messageRoutes"));

// =======================
// CREATE POST
// =======================
app.post("/api/posts", adminAuth, upload.single("image"), async (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ message: "Category is required" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an image or video file" });
    }
    let mediaType = "image";
    if (req.file.mimetype.startsWith("video/")) {
      mediaType = "video";
    }
    const mediaUrl = `${BASE_URL}/uploads/${req.file.filename}`;
    const newPost = new Post({
      title: title.trim(),
      description: description ? description.trim() : '',
      mediaUrl,
      mediaType,
      category: category.trim(),
      uploadedBy: req.admin._id,
      uploadedByName: req.admin.fullName || req.admin.username || 'Admin'
    });
    const savedPost = await newPost.save();
    res.status(201).json({ message: "Post created successfully", post: savedPost });
  } catch (error) {
    console.error("POST ERROR:", error);
    if (req.file) {
      const filePath = path.join(__dirname, "uploads", req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.status(500).json({ message: "Failed to create post. Please try again." });
  }
});

// =======================
// GET POSTS
// =======================
app.get("/api/posts", async (req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=300");
    const count = await Post.countDocuments();
    if (count === 0) return res.json([]);
    const posts = await Post.find()
      .select('title description mediaUrl mediaType category createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    res.json(posts);
  } catch (error) {
    console.error("FETCH ERROR:", error);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
});

// =======================
// GET SINGLE POST
// =======================
app.get("/api/posts/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (error) {
    console.error("GET POST ERROR:", error);
    res.status(500).json({ message: "Failed to fetch post" });
  }
});

// =======================
// Error Handler
// =======================
app.use((err, req, res, next) => {
  console.error("ERROR:", err);
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large. Maximum size is 100MB." });
    }
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: "Internal server error", error: err.message });
});

// =======================
// 404 Handler
// =======================
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// =======================
// SOCKET.IO SETUP
// =======================
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Track online users across all sockets
const onlineUsers = new Map(); // userId -> Set of socket ids

// Socket.io JWT authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "boostartsecretkey");
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(new Error('User not found'));
    }
    if (!user.isActive) {
      return next(new Error('Account deactivated'));
    }
    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket auth error:', error.message);
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  console.log(`💬 Socket connected: ${socket.id} for user ${userId}`);

  // Join personal notification room
  socket.join(`user_${userId}`);

  // Track online status (support multiple tabs)
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
    io.emit('user-online', { userId });
  }
  onlineUsers.get(userId).add(socket.id);

  // Send current online list to new client
  socket.emit('online-users', { users: Array.from(onlineUsers.keys()) });

  // Join chat room
  socket.on('join-chat', ({ otherUserId }) => {
    try {
      if (!otherUserId) return;
      const roomId = [userId, otherUserId].sort().join('_');
      socket.join(roomId);
      console.log(`👥 User ${userId} joined room ${roomId}`);
    } catch (err) {
      console.error('join-chat error:', err);
    }
  });

  // Leave chat room
  socket.on('leave-chat', ({ otherUserId }) => {
    try {
      if (!otherUserId) return;
      const roomId = [userId, otherUserId].sort().join('_');
      socket.leave(roomId);
      console.log(`👋 User ${userId} left room ${roomId}`);
    } catch (err) {
      console.error('leave-chat error:', err);
    }
  });

  // Send message
  socket.on('send-message', async (data, callback) => {
    try {
      const { receiverId, message } = data;

      if (!receiverId || !message || message.trim().length === 0) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Receiver and message are required' });
        }
        return;
      }

      // Role-based access
      if (!socket.user.isAdmin) {
        const receiver = await User.findById(receiverId);
        if (!receiver || !receiver.isAdmin) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'You can only chat with admin' });
          }
          return;
        }
      }

      // Bad word filter
      const filterResult = filterMessage(message);
      if (!filterResult.clean) {
        if (typeof callback === 'function') {
          callback({ success: false, error: filterResult.warning, blocked: true });
        }
        socket.emit('message-blocked', { warning: filterResult.warning });
        return;
      }

      // Save to DB
      const chatMessage = new Message({
        senderId: userId,
        receiverId,
        message: message.trim()
      });
      await chatMessage.save();

      const populatedMessage = await Message.findById(chatMessage._id)
        .populate('senderId', 'username fullName avatar')
        .populate('receiverId', 'username fullName avatar');

      // Broadcast to conversation room (both sender and receiver)
      const roomId = [userId, receiverId].sort().join('_');
      io.to(roomId).emit('new-message', populatedMessage);

      // Also notify receiver's personal room (for sidebar updates when not in conversation)
      io.to(`user_${receiverId}`).emit('chat-notification', {
        senderId: userId,
        senderName: socket.user.username || socket.user.fullName,
        message: message.trim(),
        messageId: populatedMessage._id
      });

      if (typeof callback === 'function') {
        callback({ success: true, message: populatedMessage });
      }
    } catch (error) {
      console.error('SOCKET SEND MESSAGE ERROR:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Failed to send message' });
      }
    }
  });

  // Typing indicator
  socket.on('typing', ({ receiverId, isTyping }) => {
    try {
      if (!receiverId) return;
      const roomId = [userId, receiverId].sort().join('_');
      socket.to(roomId).emit('user-typing', {
        userId: userId,
        username: socket.user.username,
        isTyping
      });
    } catch (err) {
      console.error('typing error:', err);
    }
  });

  // Message read receipts
  socket.on('message-read', async ({ otherUserId }) => {
    try {
      if (!otherUserId) return;
      await Message.updateMany(
        { senderId: otherUserId, receiverId: userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );
      const roomId = [userId, otherUserId].sort().join('_');
      io.to(roomId).emit('messages-read-by', { readerId: userId });
    } catch (error) {
      console.error('MESSAGE READ ERROR:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`❌ Socket disconnected: ${socket.id} for user ${userId}, reason: ${reason}`);
    if (onlineUsers.has(userId)) {
      onlineUsers.get(userId).delete(socket.id);
      if (onlineUsers.get(userId).size === 0) {
        onlineUsers.delete(userId);
        io.emit('user-offline', { userId });
      }
    }
  });
});

// =======================
// SERVER START
// =======================
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
  console.log(`📁 Upload directory: ./uploads`);
  console.log(`🌐 API Base URL: ${BASE_URL}/api`);
  console.log(`💬 Socket.io ready for real-time chat`);
});

