// Script to clear all data from posts, messages, and users collections
// Keeps admins collection intact
// Run with: node clear-data.js

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/boostart';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    return clearCollections();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function clearCollections() {
  try {
    const db = mongoose.connection.db;

    // Clear posts collection
    const postsResult = await db.collection('posts').deleteMany({});
    console.log(`🗑️  Cleared ${postsResult.deletedCount} posts`);

    // Clear messages collection
    const messagesResult = await db.collection('messages').deleteMany({});
    console.log(`🗑️  Cleared ${messagesResult.deletedCount} messages`);

    // Clear users collection
    const usersResult = await db.collection('users').deleteMany({});
    console.log(`🗑️  Cleared ${usersResult.deletedCount} users`);

    // Check admins collection (should NOT be modified)
    const adminsCount = await db.collection('admins').countDocuments();
    console.log(`✅ Admins collection preserved (${adminsCount} documents)`);

    console.log('\n✅ All specified collections cleared successfully!');
    console.log('✅ Admins collection kept intact');

  } catch (error) {
    console.error('❌ Error clearing collections:', error);
  } finally {
    mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

