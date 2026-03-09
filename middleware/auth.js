const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verify JWT token for authenticated users
const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "boostartsecretkey");
    
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      return res.status(401).json({ message: "Token is not valid" });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

// Optional auth - continues without authentication but attaches user if token exists
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "boostartsecretkey");
      const user = await User.findById(decoded.id).select("-password");
      if (user) {
        req.user = user;
        req.token = token;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = { auth, optionalAuth };

