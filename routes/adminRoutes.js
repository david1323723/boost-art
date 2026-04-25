const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Post = require("../models/Post");
const Message = require("../models/Message");
const { adminAuth, superAdminAuth } = require("../middleware/adminAuth");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

// Multer setup for admin post edits
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
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
  if (extname || mimetype) cb(null, true);
  else cb(new Error("Only images and videos are allowed"));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 100 * 1024 * 1024 } });

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "boostartsecretkey", {
    expiresIn: "7d"
  });
};

// =======================
// ADMIN LOGIN (uses User model with isAdmin=true)
// =======================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log(`Admin login attempt: username=${username}`);

    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ 
        message: "Username and password are required" 
      });
    }

    let admin = await User.findOne({ username, isAdmin: true });
    console.log(`Admin found: ${!!admin}`, admin ? admin.username : 'none');

    if (!admin) {
      console.log('Admin not found, login failed');
      return res.status(400).json({ 
        message: "Invalid credentials" 
      });
    }

    const isMatch = await admin.comparePassword(password);
    console.log(`Password match: ${isMatch}`);

    if (!isMatch) {
      console.log('Password mismatch');
      return res.status(400).json({ 
        message: "Invalid credentials" 
      });
    }

    if (!admin.isActive) {
      return res.status(400).json({ 
        message: "Admin account is deactivated" 
      });
    }

    const token = generateToken(admin._id);

    console.log('Admin login successful');

    res.json({
      _id: admin._id,
      username: admin.username,
      isAdmin: admin.isAdmin,
      token
    });

  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);
    res.status(500).json({ 
      success: false,
      message: "Login failed" 
    });
  }
});

// =======================
// UPDATE ADMIN CREDENTIALS (Protected)
// =======================
router.put("/update-credentials", adminAuth, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const adminId = req.admin._id || req.admin.id;
    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Update username if provided
    if (username && username !== admin.username) {
      if (username.length < 3) {
        return res.status(400).json({ 
          message: "Username must be at least 3 characters" 
        });
      }
      
      const existingAdmin = await User.findOne({ 
        username, 
        _id: { $ne: admin._id } 
      });
      
      if (existingAdmin) {
        return res.status(400).json({ 
          message: "Username already taken" 
        });
      }
      
      admin.username = username;
    }

    // Update password if provided
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ 
          message: "Password must be at least 6 characters" 
        });
      }
      admin.password = password; // Will be hashed by pre-save hook
    }

    await admin.save();

    res.json({ 
      success: true,
      message: "Credentials updated successfully",
      admin: {
        id: admin._id,
        username: admin.username,
        isAdmin: admin.isAdmin
      }
    });

  } catch (error) {
    console.error("UPDATE CREDENTIALS ERROR:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update credentials" 
    });
  }
});

// =======================
// GET ADMIN PROFILE
// =======================
router.get("/profile", adminAuth, async (req, res) => {
  try {
    const admin = req.admin;
    res.json(admin);
  } catch (error) {
    console.error("GET ADMIN PROFILE ERROR:", error);
    res.status(500).json({ message: "Failed to get profile" });
  }
});

// PUT /api/admin/profile - Update profile (username, email)
router.put("/profile", adminAuth, async (req, res) => {
  try {
    const { username, email } = req.body;
    const adminId = req.admin._id || req.admin.id;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const updateData = {};
    if (username && username !== admin.username) {
      updateData.username = username;
    }
    if (email && email !== admin.email) {
      updateData.email = email;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No changes provided" });
    }

    Object.assign(admin, updateData);
    await admin.save();

    res.json({ 
      success: true,
      message: "Profile updated successfully",
      admin
    });
  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// PUT /api/admin/change-password
router.put("/change-password", adminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.admin._id || req.admin.id;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const admin = await User.findById(adminId);
    const isMatch = await admin.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(400).json({ message: "Current password incorrect" });
    }

    admin.password = newPassword; // hashed by pre-save
    await admin.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
});

// =======================
// Existing routes preserved (posts, stats, messages, etc.)
// =======================

// GET STATISTICS
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
// GET ALL COMMENTS (for admin moderation)
// GET /api/admin/comments
// =======================
router.get("/comments", adminAuth, async (req, res) => {
  try {
    const posts = await Post.find({ "comments.0": { $exists: true } })
      .select('title comments')
      .sort({ createdAt: -1 });

    const allComments = [];
    posts.forEach(post => {
      post.comments.forEach(comment => {
        allComments.push({
          _id: comment._id,
          postId: post._id,
          postTitle: post.title,
          userId: comment.userId,
          username: comment.username,
          message: comment.message,
          createdAt: comment.createdAt
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
// DELETE COMMENT (admin can delete any comment)
// DELETE /api/admin/posts/:postId/comments/:commentId
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
// DELETE POST
// DELETE /api/admin/posts/:postId
// =======================
router.delete("/posts/:postId", adminAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Delete associated media file if it exists locally
    if (post.mediaUrl) {
      try {
        const filename = path.basename(post.mediaUrl);
        const filePath = path.join(__dirname, "..", "uploads", filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileErr) {
        console.error("Failed to delete media file:", fileErr.message);
      }
    }

    await Post.findByIdAndDelete(req.params.postId);
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("DELETE POST ERROR:", error);
    res.status(500).json({ message: "Failed to delete post" });
  }
});

// =======================
// UPDATE POST
// PUT /api/admin/posts/:postId
// =======================
router.put("/posts/:postId", adminAuth, upload.single("media"), async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ message: "Title cannot be empty" });
    }
    if (category !== undefined && !category.trim()) {
      return res.status(400).json({ message: "Category cannot be empty" });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (category !== undefined) updateData.category = category.trim();

    // Handle media replacement
    if (req.file) {
      // Delete old media file
      if (post.mediaUrl) {
        try {
          const oldFilename = path.basename(post.mediaUrl);
          const oldFilePath = path.join(__dirname, "..", "uploads", oldFilename);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        } catch (fileErr) {
          console.error("Failed to delete old media file:", fileErr.message);
        }
      }

      const BASE_URL = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      updateData.mediaUrl = `${BASE_URL}/uploads/${req.file.filename}`;
      updateData.mediaType = req.file.mimetype.startsWith("video/") ? "video" : "image";
    }

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.postId,
      updateData,
      { new: true }
    );

    res.json({ message: "Post updated successfully", post: updatedPost });
  } catch (error) {
    console.error("UPDATE POST ERROR:", error);
    if (req.file) {
      const cleanupPath = path.join(__dirname, "..", "uploads", req.file.filename);
      if (fs.existsSync(cleanupPath)) fs.unlinkSync(cleanupPath);
    }
    res.status(500).json({ message: "Failed to update post" });
  }
});

// Export router
module.exports = router;
