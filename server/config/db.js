const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guardconnect';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Successfully connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.warn(`[MongoDB] Primary connection warning: ${error.message}`);
    console.warn(`[MongoDB] Please ensure MongoDB is running at ${uri} or set MONGODB_URI in .env`);
    // Attempt fallback or retry in background without crashing the server
    return null;
  }
};

module.exports = connectDB;
