const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "boostartsecretkey", {
    expiresIn: "7d"
  });
};

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email, and password required" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: "Username or email already exists" });
    }

    const newUser = new User({
      username,
      email,
      password,
      fullName: fullName || username
    });

    await newUser.save();

    const token = generateToken(newUser._id);

    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        isAdmin: newUser.isAdmin
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const loginField = username || email;
    if (!loginField || !password) {
      return res.status(400).json({ message: "Username/email and password required" });
    }

    const isEmail = loginField.includes('@');
    const user = isEmail 
      ? await User.findOne({ email: loginField })
      : await User.findOne({ username: loginField });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);

    res.json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
});

// GET /api/auth/profile - Protected
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to get profile" });
  }
});

// PUT /api/auth/update-profile - Protected
router.put("/update-profile", auth, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const updates = {};

    if (username) {
      const existing = await User.findOne({ username, _id: { $ne: req.user.id } });
      if (existing) return res.status(400).json({ message: "Username taken" });
      updates.username = username;
    }

    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (existing) return res.status(400).json({ message: "Email taken" });
      updates.email = email;
    }

    if (password) {
      if (password.length < 6) return res.status(400).json({ message: "Password too short" });
      // Manual hash since findByIdAndUpdate bypasses pre-save
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select("-password");

    const token = generateToken(updatedUser._id);

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
      token
    });
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
});

module.exports = router;
