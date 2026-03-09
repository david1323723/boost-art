const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  mediaUrl: {
    type: String,
    required: true
  },
  mediaType: {
    type: String,
    enum: ["image", "video"],
    default: "image"
  },
  thumbnail: {
    type: String
  },
  category: {
    type: String,
    enum: ["Graphic Design", "Photography", "Video Production", "Advertising"],
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    default: null
  },
  uploadedByName: {
    type: String,
    default: "Admin"
  },
  comments: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      username: {
        type: String,
        required: true
      },
      message: {
        type: String,
        required: true,
        maxlength: 500
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save - Mongoose 8+ doesn't use next()
PostSchema.pre("save", async function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model("Post", PostSchema);
