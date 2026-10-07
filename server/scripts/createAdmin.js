require("dotenv").config();

const bcrypt = require("bcryptjs");
const connectToDatabase = require("../src/config/database");
const User = require("../src/models/User");

async function createAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_MOBILE } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_MOBILE) {
    throw new Error("Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_MOBILE in server/.env.");
  }
  if (ADMIN_PASSWORD.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters long.");
  if (!/^[6-9]\d{9}$/.test(ADMIN_MOBILE)) throw new Error("ADMIN_MOBILE must be a valid 10-digit Indian mobile number.");

  await connectToDatabase();

  const adminEmail = ADMIN_EMAIL.trim().toLowerCase();
  const existingAdmin = await User.findOne({ role: "admin" });
  if (existingAdmin) {
    console.log("Admin already exists.");
    return;
  }

  const existingEmail = await User.findOne({ email: adminEmail });
  if (existingEmail) throw new Error("ADMIN_EMAIL is already used by a non-admin account.");

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.create({
    name: ADMIN_NAME.trim(),
    email: adminEmail,
    password: hashedPassword,
    mobile: ADMIN_MOBILE,
    role: "admin",
  });

  console.log("Admin created successfully.");
}

createAdmin()
  .catch((error) => {
    console.error("Could not create the admin:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await require("mongoose").disconnect();
  });
