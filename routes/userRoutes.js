const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Post = require("../models/Post");
const Message = require("../models/Message");
const auth = require("../middleware/auth").auth;

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
        _id: newUser._id,
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
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        bio: user.bio,
        isAdmin: user.isAdmin
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
      { returnDocument: 'after' }
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
router.get("/posts", async (req, res) => {
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
router.get("/posts/:id", async (req, res) => {
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
// GET ALL USERS (Admin only)
// =======================
router.get("/", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const users = await User.find({ isAdmin: false })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    console.error("GET USERS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// =======================
// GET ADMIN INFO (For normal users to chat with)
// =======================
router.get("/admin", auth, async (req, res) => {
  try {
    const admin = await User.findOne({ isAdmin: true }).select('-password');
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.json({ admin });
  } catch (error) {
    console.error("GET ADMIN ERROR:", error);
    res.status(500).json({ message: "Failed to fetch admin" });
  }
});

module.exports = router;
