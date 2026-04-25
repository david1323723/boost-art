const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verify JWT token for admin users (uses User model with isAdmin=true)
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "boostartsecretkey");
    
    const admin = await User.findById(decoded.id).select("-password");
    
    if (!admin) {
      return res.status(401).json({ message: "Admin not found - ID: " + decoded.id });
    }

    if (!admin.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!admin.isActive) {
      return res.status(401).json({ message: "Admin account is deactivated" });
    }

    req.admin = admin;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

// Super admin only middleware
const superAdminAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "boostartsecretkey");
    
    const admin = await User.findById(decoded.id).select("-password");
    
    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    if (!admin.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    if (!admin.isActive) {
      return res.status(401).json({ message: "Admin account is deactivated" });
    }

    req.admin = admin;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = { adminAuth, superAdminAuth };

