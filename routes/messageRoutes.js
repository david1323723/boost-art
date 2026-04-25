const express = require("express");
const Message = require("../models/Message");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

const router = express.Router();

// =======================
// SEND MESSAGE (REST fallback)
// POST /api/messages
// =======================
router.post("/", auth, async (req, res) => {
  try {
    const { receiverId, message } = req.body;

    if (!receiverId || !message || message.trim() === "") {
      return res.status(400).json({ message: "Receiver and message are required" });
    }

    // Role-based access check
    if (!req.user.isAdmin) {
      const receiver = await User.findById(receiverId);
      if (!receiver || !receiver.isAdmin) {
        return res.status(403).json({ message: "You can only chat with admin" });
      }
    }

    const newMessage = new Message({
      senderId: req.user._id,
      receiverId,
      message: message.trim()
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("senderId", "username fullName avatar")
      .populate("receiverId", "username fullName avatar");

    res.status(201).json({
      message: "Message sent successfully",
      messageData: populatedMessage
    });
  } catch (error) {
    console.error("SEND MESSAGE ERROR:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

// =======================
// GET CONVERSATIONS LIST (for sidebar)
// GET /api/messages/conversations
// =======================
router.get("/conversations", auth, async (req, res) => {
  try {
    const currentUserId = req.user._id.toString();

    const messages = await Message.find({
      $or: [{ senderId: currentUserId }, { receiverId: currentUserId }]
    })
      .populate("senderId", "username fullName avatar")
      .populate("receiverId", "username fullName avatar")
      .sort({ createdAt: -1 });

    const conversationsMap = new Map();

    messages.forEach((msg) => {
      const partnerId =
        msg.senderId._id.toString() === currentUserId
          ? msg.receiverId._id.toString()
          : msg.senderId._id.toString();

      if (!conversationsMap.has(partnerId)) {
        conversationsMap.set(partnerId, {
          user: msg.senderId._id.toString() === currentUserId ? msg.receiverId : msg.senderId,
          lastMessage: msg,
          unreadCount: 0
        });
      }

      if (msg.senderId._id.toString() === partnerId && !msg.isRead) {
        conversationsMap.get(partnerId).unreadCount += 1;
      }
    });

    const conversations = Array.from(conversationsMap.values()).sort(
      (a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );

    res.json({ conversations });
  } catch (error) {
    console.error("GET CONVERSATIONS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

// =======================
// GET UNREAD MESSAGES COUNT
// GET /api/messages/unread-count
// =======================
router.get("/unread-count", auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiverId: req.user._id,
      isRead: false
    });
    res.json({ unreadCount: count });
  } catch (error) {
    console.error("GET UNREAD COUNT ERROR:", error);
    res.status(500).json({ message: "Failed to get unread count" });
  }
});

// =======================
// MARK MESSAGES AS READ
// PUT /api/messages/read/:userId
// =======================
router.put("/read/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id.toString();

    await Message.updateMany(
      { senderId: userId, receiverId: currentUserId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("MARK READ ERROR:", error);
    res.status(500).json({ message: "Failed to mark messages as read" });
  }
});

// =======================
// GET CONVERSATION WITH SPECIFIC USER
// GET /api/messages/:userId
// NOTE: This must be LAST because it catches any single-segment path
// =======================
router.get("/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id.toString();

    // Role-based access check
    if (!req.user.isAdmin) {
      const otherUser = await User.findById(userId);
      if (!otherUser || !otherUser.isAdmin) {
        return res.status(403).json({ message: "You can only chat with admin" });
      }
    }

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId }
      ]
    })
      .populate("senderId", "username fullName avatar")
      .populate("receiverId", "username fullName avatar")
      .sort({ createdAt: 1 });

    // Mark messages from other user as read
    await Message.updateMany(
      { senderId: userId, receiverId: currentUserId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ messages });
  } catch (error) {
    console.error("GET CONVERSATION ERROR:", error);
    res.status(500).json({ message: "Failed to fetch conversation" });
  }
});

module.exports = router;

