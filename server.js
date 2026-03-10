const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Models
const Post = require("./models/Post");
const User = require("./models/User");
const Admin = require("./models/Admin");
const Message = require("./models/Message");

// Routes
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// =======================
// CONFIG
// =======================

// Detect base URL automatically
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

// =======================
// Middleware
// =======================

app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =======================
// Multer Setup
// =======================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {

    const uploadPath = path.join(__dirname, "uploads");

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

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

  if (extname || mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only images and videos are allowed"));
  }

};

const upload = multer({
  storage,
  fileFilter,
  limits:{
    fileSize:100 * 1024 * 1024
  }
});

// =======================
// MongoDB Connection
// =======================

mongoose.connect(process.env.MONGO_URI)
.then(()=>{
  console.log("✅ MongoDB Connected Successfully");
})
.catch((err)=>{
  console.error("❌ MongoDB Connection Error:",err);
});

// =======================
// Test Route
// =======================

app.get("/",(req,res)=>{
  res.json({
    message:"🚀 BOOST ART API Running...",
    version:"2.0.0",
    features:["image upload","video upload","comments","messages","admin panel"]
  });
});

// =======================
// API Routes
// =======================

app.use("/api/users",userRoutes);
app.use("/api/admin",adminRoutes);

// =======================
// CREATE POST
// =======================

app.post("/api/posts", upload.single("image"), async(req,res)=>{

  try{

    const {title,description,category} = req.body;

    if(!title || !category){
      return res.status(400).json({
        message:"Title and category are required"
      });
    }

    if(!req.file){
      return res.status(400).json({
        message:"Image or video is required"
      });
    }

    let mediaType = "image";

    if(req.file.mimetype.startsWith("video/")){
      mediaType = "video";
    }

    const mediaUrl = `${BASE_URL}/uploads/${req.file.filename}`;

    const newPost = new Post({
      title,
      description,
      mediaUrl,
      mediaType,
      category
    });

    const savedPost = await newPost.save();

    res.status(201).json({
      message:"Post created successfully",
      post:savedPost
    });

  }catch(error){

    console.error("POST ERROR:",error);

    res.status(500).json({
      message:"Internal server error",
      error:error.message
    });

  }

});

// =======================
// GET POSTS (Optimized)
// =======================

app.get("/api/posts", async (req, res) => {
  try {
    // Check if collection is empty first for fast response
    const count = await Post.countDocuments();
    
    // Return empty array immediately if no posts
    if (count === 0) {
      return res.json([]);
    }
    
    // Fetch only latest 10 posts with lean() for better performance
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    res.json(posts);
  } catch (error) {
    console.error("FETCH ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch posts"
    });
  }
});

// =======================
// GET SINGLE POST
// =======================

app.get("/api/posts/:id", async(req,res)=>{

  try{

    const post = await Post.findById(req.params.id);

    if(!post){
      return res.status(404).json({message:"Post not found"});
    }

    res.json(post);

  }catch(error){

    console.error("GET POST ERROR:",error);

    res.status(500).json({
      message:"Failed to fetch post"
    });

  }

});

// =======================
// Error Handler
// =======================

app.use((err,req,res,next)=>{

  console.error("ERROR:",err);

  if(err instanceof multer.MulterError){

    if(err.code === "LIMIT_FILE_SIZE"){
      return res.status(400).json({
        message:"File too large. Maximum size is 100MB."
      });
    }

    return res.status(400).json({
      message:err.message
    });

  }

  res.status(500).json({
    message:"Internal server error",
    error:err.message
  });

});

// =======================
// 404 Handler
// =======================

app.use((req,res)=>{
  res.status(404).json({message:"Route not found"});
});

// =======================
// SERVER START
// =======================

const PORT = process.env.PORT || 5000;

app.listen(PORT,()=>{
  console.log(`🔥 Server running on port ${PORT}`);
  console.log(`📁 Upload directory: ./uploads`);
  console.log(`🌐 API Base URL: ${BASE_URL}/api`);
});