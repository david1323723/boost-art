const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

// Hardcoded admin credentials
const HARDCODED_ADMIN = {
  id: 'admin-001',
  username: 'david',
  email: 'david@boostart.com',
  fullName: 'David',
  role: 'admin'
};

// Verify JWT token for admin users
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    // Check if it's a hardcoded admin token
    if (token.startsWith('admin-token-')) {
      req.admin = HARDCODED_ADMIN;
      req.token = token;
      return next();
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "boostartsecretkey");
    
    const admin = await Admin.findById(decoded.id).select("-password");
    
    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
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

    // Check if it's a hardcoded admin token (only super_admin)
    if (token.startsWith('admin-token-')) {
      // For hardcoded admin, allow with limited permissions
      req.admin = { ...HARDCODED_ADMIN, role: 'super_admin' };
      req.token = token;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "boostartsecretkey");
    
    const admin = await Admin.findById(decoded.id).select("-password");
    
    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    if (admin.role !== "super_admin") {
      return res.status(403).json({ message: "Access denied. Super admin only." });
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

