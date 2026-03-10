const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  // Direction: 'user-to-admin' or 'admin-to-user'
  direction: {
    type: String,
    enum: ['user-to-admin', 'admin-to-user'],
    default: 'user-to-admin'
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  senderEmail: {
    type: String
  },
  // For admin-to-user messages: specific recipient
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  recipientName: {
    type: String
  },
  recipientEmail: {
    type: String
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  adminReply: {
    replyMessage: String,
    repliedAt: Date,
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin"
    },
    repliedByName: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
MessageSchema.index({ sender: 1, createdAt: -1 });
MessageSchema.index({ recipient: 1, createdAt: -1 });
MessageSchema.index({ isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Message", MessageSchema);

