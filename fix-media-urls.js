// Script to fix mediaUrl in MongoDB for production
// Run with: node fix-media-urls.js

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/boostart';

// Old and new URLs
const OLD_URL = 'http://localhost:5000';
const NEW_URL = 'https://boost-art-backend.onrender.com';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    return fixMediaUrls();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function fixMediaUrls() {
  try {
    const db = mongoose.connection.db;
    const postsCollection = db.collection('posts');

    // Find all posts with old localhost URLs
    const oldPosts = await postsCollection.find({
      mediaUrl: { $regex: '^http://localhost:5000/uploads' }
    }).toArray();

    console.log(`� Found ${oldPosts.length} posts with old localhost URLs`);

    if (oldPosts.length === 0) {
      console.log('✅ No posts need to be updated');
      mongoose.disconnect();
      return;
    }

    // Update all posts with old URLs
    const result = await postsCollection.updateMany(
      { mediaUrl: { $regex: '^http://localhost:5000/uploads' } },
      [
        {
          $set: {
            mediaUrl: {
              $replaceOne: {
                input: '$mediaUrl',
                find: OLD_URL,
                replacement: NEW_URL
              }
            }
          }
        }
      ]
    );

    console.log(`✅ Updated ${result.modifiedCount} posts`);
    console.log(`   Old URL: ${OLD_URL}`);
    console.log(`   New URL: ${NEW_URL}`);

    // Verify the updates
    const remainingOldPosts = await postsCollection.countDocuments({
      mediaUrl: { $regex: '^http://localhost:5000/uploads' }
    });

    if (remainingOldPosts === 0) {
      console.log('✅ All posts successfully updated!');
    } else {
      console.log(`⚠️  ${remainingOldPosts} posts still have old URLs`);
    }

  } catch (error) {
    console.error('❌ Error updating posts:', error);
  } finally {
    mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

