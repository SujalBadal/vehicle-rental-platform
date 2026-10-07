const mongoose = require("mongoose");
const Notification = require("../models/Notification");

async function getNotifications(req, res) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.user.id }).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({ recipient: req.user.id, readAt: null }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Notifications loaded.",
      data: { notifications, unreadCount },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load notifications.", errors: [] });
  }
}

async function markNotificationRead(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Notification ID is invalid.", errors: [] });
  }

  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { $set: { readAt: new Date() } },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found.", errors: [] });
    }

    return res.status(200).json({ success: true, message: "Notification marked as read.", data: { notification } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not update notification.", errors: [] });
  }
}

async function markAllNotificationsRead(req, res) {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, readAt: null },
      { $set: { readAt: new Date() } },
    );

    return res.status(200).json({ success: true, message: "All notifications marked as read.", data: {} });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not update notifications.", errors: [] });
  }
}

module.exports = { getNotifications, markNotificationRead, markAllNotificationsRead };
