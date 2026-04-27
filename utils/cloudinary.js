/**
 * ============================================================
 * Cloudinary Configuration & Upload Helper
 * ============================================================
 * This module configures the Cloudinary SDK and provides a robust
 * upload function that streams file buffers directly to Cloudinary.
 *
 * Why not use multer-storage-cloudinary?
 * --------------------------------------
 * multer-storage-cloudinary v4 was designed for multer v1.x.
 * This project uses multer v2.x which has a completely rewritten
 * internal storage API.  Using multer.memoryStorage() + an explicit
 * upload function gives us:
 *
 *   • Guaranteed compatibility with any multer version
 *   • Full try/catch error handling around the Cloudinary API call
 *   • Zero local disk writes (Render-safe)
 * ============================================================
 */

require("dotenv").config();
const cloudinary = require("cloudinary").v2;

// ------------------------------------------------------------------
// 1. Validate env vars at startup — fail fast with a clear message
// ------------------------------------------------------------------
const required = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ MISSING ENV VAR: ${key}`);
    console.error("   Uploads will fail until this is set in Render dashboard.");
  }
}

// ------------------------------------------------------------------
// 2. Configure Cloudinary SDK
// ------------------------------------------------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ------------------------------------------------------------------
// 3. Upload a buffer straight to Cloudinary
// ------------------------------------------------------------------
/**
 * uploadBuffer — uploads a file buffer to Cloudinary.
 *
 * @param {Buffer} buffer     — the file bytes from multer (memoryStorage)
 * @param {String} mimetype   — e.g. "image/jpeg" or "video/mp4"
 * @param {String} original   — original filename (used for public_id base)
 *
 * @returns {Promise<{secure_url:String, resource_type:String}>}
 */
const uploadBuffer = (buffer, mimetype, original) => {
  return new Promise((resolve, reject) => {
    const isVideo = mimetype && mimetype.startsWith("video/");
    const resource_type = isVideo ? "video" : "image";

    // Build a sanitised public_id from timestamp + original name
    const safeName = original
      ? original.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_")
      : "upload";
    const public_id = `boostart/${Date.now()}-${safeName}`;

    const uploadOpts = {
      resource_type,
      public_id,
      folder: "boostart",
    };

    // Use Cloudinary's upload_stream wrapper for buffers
    const stream = cloudinary.uploader.upload_stream(
      uploadOpts,
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload_stream error:", error);
          return reject(error);
        }
        resolve({
          secure_url: result.secure_url,
          resource_type: result.resource_type,
        });
      }
    );

    stream.end(buffer);
  });
};

// ------------------------------------------------------------------
// 4. Delete an asset from Cloudinary by its URL
// ------------------------------------------------------------------
const deleteFromCloudinary = async (url) => {
  if (!url || typeof url !== "string") return;

  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/");

    const uploadIdx = segments.indexOf("upload");
    if (uploadIdx === -1) return;

    let afterUpload = segments.slice(uploadIdx + 1);
    if (afterUpload[0] && afterUpload[0].startsWith
