const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const Admin = require("../models/Admin");
const User = require("../models/User");
const Post = require("../models/Post");
const Message = require("../models/Message");
const { adminAuth, superAdminAuth } = require("../middleware/adminAuth");

const router = express.Router();

// =======================
// MULTER SETUP FOR ADMIN
// =======================

// Storage for images
const imageStorage = multer.diskStorage({
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

// File filter for images and videos
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
  storage: imageStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for videos
  }
});

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "boostartsecretkey", {
    expiresIn: "7d"
  });
};

// =======================
// ADMIN REGISTRATION
// =======================
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ $or: [{ email }, { username }] });
    if (existingAdmin) {
      return res.status(400).json({
        message: existingAdmin.email === email 
          ? "Email already registered" 
          : "Username already taken"
      });
    }

    // Create new admin (first admin becomes super_admin)
    const adminCount = await Admin.countDocuments();
    const role = adminCount === 0 ? "super_admin" : "admin";

    const newAdmin = new Admin({
      username,
      email,
      password,
      fullName: fullName || username,
      role
    });

    await newAdmin.save();

    const token = generateToken(newAdmin._id);

    res.status(201).json({
      message: "Admin registered successfully",
      token,
      admin: {
        id: newAdmin._id,
        username: newAdmin.username,
        email: newAdmin.email,
        fullName: newAdmin.fullName,
        role: newAdmin.role
      }
    });
  } catch (error) {
    console.error("ADMIN REGISTER ERROR:", error);
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
});

// =======================
// ADMIN LOGIN
// =======================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!admin.isActive) {
      return res.status(400).json({ message: "Admin account is deactivated" });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = generateToken(admin._id);

    res.json({
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role
      }
    });
  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

// =======================
// GET ADMIN PROFILE
// =======================
router.get("/profile", adminAuth, async (req, res) => {
  try {
    // Handle hardcoded admin
    const adminId = req.admin._id || req.admin.id;
    if (adminId && adminId.startsWith('admin-')) {
      return res.json(req.admin);
    }
    
    const admin = await Admin.findById(req.admin._id).select("-password");
    res.json(admin);
  } catch (error) {
    console.error("GET ADMIN PROFILE ERROR:", error);
    res.status(500).json({ message: "Failed to get profile" });
  }
});

// =======================
// UPDATE ADMIN PROFILE
// =======================
router.put("/profile", adminAuth, async (req, res) => {
  try {
    const { fullName, avatar } = req.body;
    
    // Handle hardcoded admin
    const adminId = req.admin._id || req.admin.id;
    if (adminId && adminId.startsWith('admin-')) {
      return res.status(400).json({ message: "Cannot update profile for hardcoded admin account" });
    }
    
    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.admin._id,
      { fullName, avatar },
      { returnDocument: 'after' }
    ).select("-password");

    res.json({
      message: "Profile updated successfully",
      admin: updatedAdmin
    });
  } catch (error) {
    console.error("UPDATE ADMIN PROFILE ERROR:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// =======================
// CHANGE ADMIN PASSWORD
// =======================
router.put("/password", adminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Handle hardcoded admin
    const adminId = req.admin._id || req.admin.id;
    if (adminId && adminId.startsWith('admin-')) {
      return res.status(400).json({ message: "Cannot change password for hardcoded admin account" });
    }
    
    const admin = await Admin.findById(req.admin._id);
    const isMatch = await admin.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
});

// =======================
// UPDATE ADMIN SETTINGS (Username, Email & Password)
// =======================
router.put("/settings", adminAuth, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Get the admin ID - handle both hardcoded and database admins
    const adminId = req.admin._id || req.admin.id;
    
    // For hardcoded admin, allow username and email updates (stored in localStorage)
    if (!adminId || adminId.startsWith('admin-')) {
      // Validate inputs for hardcoded admin
      if (username && username.length < 3) {
        return res.status(400).json({ success: false, message: "Username must be at least 3 characters" });
      }
      
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ success: false, message: "Invalid email format" });
        }
      }
      
      if (password && password.length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
      }
      
      // Return success with updated data (frontend will handle localStorage)
      const updatedAdmin = { ...req.admin };
      
      if (username) updatedAdmin.username = username;
      if (email) updatedAdmin.email = email;
      
      return res.json({ 
        success: true, 
        message: "Admin settings updated successfully",
        admin: updatedAdmin,
        isHardcodedAdmin: true
      });
    }
    
    const admin = await Admin.findById(adminId);
    
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    
    // Update username if provided
    if (username && username !== admin.username) {
      // Check if username is already taken by another admin
      const existingUser = await Admin.findOne({ 
        username, 
        _id: { $ne: admin._id } 
      });
      
      if (existingUser) {
        return res.status(400).json({ success: false, message: "Username already taken" });
      }
      
      admin.username = username;
    }
    
    // Update email if provided
    if (email && email !== admin.email) {
      // Check if email is already taken by another admin
      const existingEmail = await Admin.findOne({ 
        email, 
        _id: { $ne: admin._id } 
      });
      
      if (existingEmail) {
        return res.status(400).json({ success: false, message: "Email already registered" });
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
      }
      
      admin.email = email;
    }
    
    // Update password if provided
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
      }
      admin.password = password;
    }
    
    await admin.save();

    res.json({ 
      success: true, 
      message: "Admin profile updated successfully",
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role
      }
    });
  } catch (error) {
    console.error("UPDATE SETTINGS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to update settings" });
  }
});

// =======================
// GET STATISTICS
// =======================
router.get("/stats", adminAuth, async (req, res) => {
  try {
    const totalPosts = await Post.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalComments = await Post.aggregate([
      { $project: { commentCount: { $size: "$comments" } } },
      { $group: { _id: null, total: { $sum: "$commentCount" } } }
    ]);
    const totalMessages = await Message.countDocuments();
    const unreadMessages = await Message.countDocuments({ isRead: false });

    res.json({
      totalPosts,
      totalUsers,
      totalComments: totalComments[0]?.total || 0,
      totalMessages,
      unreadMessages
    });
  } catch (error) {
    console.error("GET STATS ERROR:", error);
    res.status(500).json({ message: "Failed to get statistics" });
  }
});

// =======================
// UPLOAD POST (IMAGE/VIDEO)
// =======================
router.post("/posts", adminAuth, upload.single("media"), async (req, res) => {
  try {
    const { title, description, category, mediaType } = req.body;

    if (!title || !category) {
      return res.status(400).json({ message: "Title and category are required" });
    }

    let mediaUrl = "";
    let finalMediaType = mediaType || "image";

    if (req.file) {
      mediaUrl = `http://localhost:5000/uploads/${req.file.filename}`;
      
      // Determine media type based on mime type
      if (req.file.mimetype.startsWith("video/")) {
        finalMediaType = "video";
      }
    } else {
      return res.status(400).json({ message: "Media file is required" });
    }

    const newPost = new Post({
      title,
      description,
      mediaUrl,
      mediaType: finalMediaType,
      category,
      uploadedBy: req.admin._id,
      uploadedByName: req.admin.fullName || req.admin.username
    });

    const savedPost = await newPost.save();

    res.status(201).json({
      message: "Post created successfully",
      post: savedPost
    });
  } catch (error) {
    console.error("UPLOAD POST ERROR:", error);
    res.status(500).json({ message: "Failed to create post", error: error.message });
  }
});

// =======================
// UPDATE POST (with optional file upload)
// =======================
router.put("/posts/:id", adminAuth, upload.single("media"), async (req, res) => {
  try {
    const { title, description, category } = req.body;
    
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Update text fields
    if (title) post.title = title;
    if (description !== undefined) post.description = description;
    if (category) post.category = category;

    // Update media if new file uploaded
    if (req.file) {
      post.mediaUrl = `http://localhost:5000/uploads/${req.file.filename}`;
      
      // Determine media type based on mime type
      if (req.file.mimetype.startsWith("video/")) {
        post.mediaType = "video";
      } else {
        post.mediaType = "image";
      }
    }

    await post.save();

    res.json({
      message: "Post updated successfully",
      post
    });
  } catch (error) {
    console.error("UPDATE POST ERROR:", error);
    res.status(500).json({ message: "Failed to update post" });
  }
});

// =======================
// DELETE POST
// =======================
router.delete("/posts/:id", adminAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("DELETE POST ERROR:", error);
    res.status(500).json({ message: "Failed to delete post" });
  }
});

// =======================
// GET ALL POSTS (ADMIN)
// =======================
router.get("/posts", adminAuth, async (req, res) => {
  try {
    const posts = await Post.find()
      .select("-comments")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    console.error("GET POSTS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
});

// =======================
// GET ALL COMMENTS (ACROSS POSTS)
// =======================
router.get("/comments", adminAuth, async (req, res) => {
  try {
    const posts = await Post.find().select("comments title");
    
    let allComments = [];
    posts.forEach(post => {
      post.comments.forEach(comment => {
        allComments.push({
          ...comment.toObject(),
          postTitle: post.title,
          postId: post._id
        });
      });
    });

    // Sort by newest first
    allComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(allComments);
  } catch (error) {
    console.error("GET COMMENTS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});

// =======================
// DELETE COMMENT (ANY COMMENT)
// =======================
router.delete("/posts/:postId/comments/:commentId", adminAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    post.comments.pull({ _id: req.params.commentId });
    await post.save();

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("DELETE COMMENT ERROR:", error);
    res.status(500).json({ message: "Failed to delete comment" });
  }
});

// =======================
// GET ALL MESSAGES
// =======================
router.get("/messages", adminAuth, async (req, res) => {
  try {
    const messages = await Message.find()
      .populate("sender", "username email")
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    console.error("GET MESSAGES ERROR:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// =======================
// MARK MESSAGE AS READ
// =======================
router.put("/messages/:id/read", adminAuth, async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { returnDocument: 'after' }
    );
    
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({ message: "Message marked as read", messageData: message });
  } catch (error) {
    console.error("MARK READ ERROR:", error);
    res.status(500).json({ message: "Failed to mark message as read" });
  }
});

// =======================
// REPLY TO MESSAGE
// =======================
router.post("/messages/:id/reply", adminAuth, async (req, res) => {
  try {
    const { replyMessage } = req.body;
    
    if (!replyMessage || replyMessage.trim() === "") {
      return res.status(400).json({ message: "Reply message is required" });
    }

    const message = await Message.findByIdAndUpdate(
      req.params.id,
      {
        adminReply: {
          replyMessage: replyMessage.trim(),
          repliedAt: new Date(),
          repliedBy: req.admin._id
        }
      },
      { returnDocument: 'after' }
    );

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({ message: "Reply sent successfully", messageData: message });
  } catch (error) {
    console.error("REPLY MESSAGE ERROR:", error);
    res.status(500).json({ message: "Failed to reply to message" });
  }
});

// =======================
// GET UNREAD MESSAGES COUNT (For Notifications)
// =======================
router.get("/messages/unread-count", adminAuth, async (req, res) => {
  try {
    const count = await Message.countDocuments({ 
      isRead: false,
      direction: 'user-to-admin'
    });
    res.json({ unreadCount: count });
  } catch (error) {
    console.error("GET UNREAD COUNT ERROR:", error);
    res.status(500).json({ message: "Failed to get unread count" });
  }
});

// =======================
// SEND MESSAGE TO SPECIFIC USER (Admin to User)
// =======================
router.post("/messages/to-user", adminAuth, async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ message: "User ID and message are required" });
    }
    
    if (message.trim() === "") {
      return res.status(400).json({ message: "Message cannot be empty" });
    }
    
    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Create the message (admin-to-user)
    const newMessage = new Message({
      direction: 'admin-to-user',
      sender: req.admin._id || req.admin.id,
      senderName: req.admin.fullName || req.admin.username || 'Admin',
      senderEmail: req.admin.email || 'admin@boostart.com',
      recipient: userId,
      recipientName: user.fullName || user.username,
      recipientEmail: user.email,
      message: message.trim(),
      isRead: false
    });
    
    await newMessage.save();
    
    res.status(201).json({
      message: "Message sent successfully",
      messageData: newMessage
    });
  } catch (error) {
    console.error("SEND TO USER ERROR:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

// =======================
// DELETE MESSAGE
// =======================
router.delete("/messages/:id", adminAuth, async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("DELETE MESSAGE ERROR:", error);
    res.status(500).json({ message: "Failed to delete message" });
  }
});

// =======================
// GET ALL USERS (ADMIN)
// =======================
router.get("/users", adminAuth, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("GET USERS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// =======================
// DELETE USER (ADMIN)
// =======================
router.delete("/users/:id", adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

module.exports = router;

