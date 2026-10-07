const mongoose = require("mongoose");

async function connectToDatabase() {
  const databaseUri = process.env.MONGODB_URI;

  if (!databaseUri) {
    throw new Error("MONGODB_URI is missing from the environment variables.");
  }

  await mongoose.connect(databaseUri);
  console.log("MongoDB connected successfully.");
}

module.exports = connectToDatabase;
