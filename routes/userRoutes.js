const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Post = require("../models/Post");
const Message = require("../models/Message");
const { auth, optionalAuth } = require("../middleware/auth");

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "boostartsecretkey", {
    expiresIn: "7d"
  });
};

// =======================
// USER REGISTRATION
// =======================
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    console.log("Registration attempt:", { username, email, fullName });

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email, and password are required"
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email 
          ? "Email already registered" 
          : "Username already taken"
      });
    }

    // Create new user
    const newUser = new User({
      username,
      email,
      password,
      fullName: fullName || username
    });

    console.log("Saving user to database...");
    await newUser.save();
    console.log("User saved successfully:", newUser._id);

    // Generate token
    const token = generateToken(newUser._id);

    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        avatar: newUser.avatar
      }
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
});

// =======================
// USER LOGIN (supports email or username)
// =======================
router.post("/login", async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    // Check if this is an admin login request (hardcoded credentials)
    const ADMIN_USERNAME = 'david';
    const ADMIN_PASSWORD = '0791323723';
    
    // Check if login is with admin credentials
    const loginId = email || username;
    if (loginId === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Generate admin token
      const adminToken = jwt.sign(
        { id: 'admin-001', role: 'admin' },
        process.env.JWT_SECRET || "boostartsecretkey",
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        message: "Admin login successful",
        token: adminToken,
        role: "admin",
        admin: {
          id: 'admin-001',
          username: 'david',
          email: 'david@boostart.com',
          fullName: 'David',
          role: 'admin'
        }
      });
    }

    // Regular user login - find user by email or username
    const loginField = email || username;
    if (!loginField) {
      return res.status(400).json({ message: "Email or username is required" });
    }

    // Check if input contains @ - treat as email, otherwise as username
    const isEmail = loginField.includes('@');
    
    let user;
    if (isEmail) {
      user = await User.findOne({ email: loginField });
    } else {
      user = await User.findOne({ username: loginField });
    }
    
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        bio: user.bio
      }
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

// =======================
// GET USER PROFILE
// =======================
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    res.status(500).json({ message: "Failed to get profile" });
  }
});

// =======================
// UPDATE USER PROFILE
// =======================
router.put("/profile", auth, async (req, res) => {
  try {
    const { fullName, bio, avatar } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { fullName, bio, avatar },
      { new: true }
    ).select("-password");

    res.json({
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// =======================
// CHANGE PASSWORD
// =======================
router.put("/password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
});

// =======================
// GET ALL POSTS (PUBLIC)
// =======================
router.get("/posts", optionalAuth, async (req, res) => {
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
// GET SINGLE POST
// =======================
router.get("/posts/:id", optionalAuth, async (req, res) => {
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
// ADD COMMENT TO POST
// =======================
router.post("/posts/:id/comments", auth, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Comment message is required" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = {
      userId: req.user._id,
      username: req.user.username,
      message: message.trim(),
      createdAt: new Date()
    };

    post.comments.push(comment);
    await post.save();

    res.status(201).json({
      message: "Comment added successfully",
      comment: post.comments[post.comments.length - 1]
    });
  } catch (error) {
    console.error("ADD COMMENT ERROR:", error);
    res.status(500).json({ message: "Failed to add comment" });
  }
});

// =======================
// DELETE COMMENT (OWN COMMENT)
// =======================
router.delete("/posts/:postId/comments/:commentId", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user owns the comment or is admin
    if (comment.userId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own comments" });
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
// SEND MESSAGE TO ADMIN
// =======================
router.post("/messages", auth, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Message is required" });
    }

    const newMessage = new Message({
      sender: req.user._id,
      senderName: req.user.fullName || req.user.username,
      senderEmail: req.user.email,
      message: message.trim()
    });

    await newMessage.save();

    res.status(201).json({
      message: "Message sent successfully",
      messageData: newMessage
    });
  } catch (error) {
    console.error("SEND MESSAGE ERROR:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

// =======================
// GET USER'S MESSAGES
// =======================
router.get("/messages", auth, async (req, res) => {
  try {
    const messages = await Message.find({ sender: req.user._id })
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    console.error("GET MESSAGES ERROR:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

module.exports = router;

