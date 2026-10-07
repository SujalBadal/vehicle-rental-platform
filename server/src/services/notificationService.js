const Notification = require("../models/Notification");
const User = require("../models/User");

async function notifyUser(userId, notificationDetails) {
  try {
    const user = await User.findById(userId).select("isActive");
    if (!user || !user.isActive) return;

    await Notification.create({ recipient: user._id, ...notificationDetails });
  } catch (error) {
    console.error("Could not create in-app notification:", error.message);
  }
}

async function notifyUsersWithRoles(roles, notificationDetails) {
  try {
    const users = await User.find({ role: { $in: roles }, isActive: true }).select("_id");
    if (users.length === 0) return;

    await Notification.insertMany(users.map((user) => ({
      recipient: user._id,
      ...notificationDetails,
    })));
  } catch (error) {
    console.error("Could not create in-app notifications:", error.message);
  }
}

module.exports = { notifyUser, notifyUsersWithRoles };
