const Booking = require("../models/Booking");
const Maintenance = require("../models/Maintenance");
const Payment = require("../models/Payment");
const Rental = require("../models/Rental");
const Vehicle = require("../models/Vehicle");

function readMonthRange(req, res) {
  const requestedMonths = Number.parseInt(req.query.months, 10);
  const months = Number.isInteger(requestedMonths) ? Math.min(Math.max(requestedMonths, 1), 12) : 6;
  const startDate = new Date();
  startDate.setUTCDate(1);
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCMonth(startDate.getUTCMonth() - months + 1);

  return { months, startDate };
}

async function getOverview(req, res) {
  try {
    const [bookingCounts, vehicleCounts, activeRentals, openMaintenance] = await Promise.all([
      Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Vehicle.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Rental.countDocuments({ status: "active" }),
      Maintenance.countDocuments({ status: { $in: ["scheduled", "in_progress"] } }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Operational overview loaded.",
      data: {
        bookingsByStatus: bookingCounts.map((item) => ({ status: item._id, count: item.count })),
        vehiclesByStatus: vehicleCounts.map((item) => ({ status: item._id, count: item.count })),
        activeRentals,
        openMaintenance,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load reports.", errors: [] });
  }
}

async function getBookingReport(req, res) {
  const { months, startDate } = readMonthRange(req, res);

  try {
    const monthly = await Booking.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.month": 1, "_id.status": 1 } },
    ]);

    return res.status(200).json({
      success: true,
      message: "Booking report loaded.",
      data: { months, monthly: monthly.map((item) => ({ month: item._id.month, status: item._id.status, count: item.count })) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load booking report.", errors: [] });
  }
}

async function getFleetReport(req, res) {
  try {
    const [byStatus, byCategory] = await Promise.all([
      Vehicle.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Vehicle.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, category: { $ifNull: ["$category.name", "Uncategorized"] }, count: 1 } },
        { $sort: { category: 1 } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      message: "Fleet report loaded.",
      data: {
        byStatus: byStatus.map((item) => ({ status: item._id, count: item.count })),
        byCategory,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load fleet report.", errors: [] });
  }
}

async function getMaintenanceReport(req, res) {
  const { months, startDate } = readMonthRange(req, res);

  try {
    const [byStatus, monthlyCost] = await Promise.all([
      Maintenance.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Maintenance.aggregate([
        { $match: { status: "completed", completedAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$completedAt" } },
            cost: { $sum: "$cost" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      message: "Maintenance report loaded.",
      data: {
        months,
        byStatus: byStatus.map((item) => ({ status: item._id, count: item.count })),
        monthlyCost: monthlyCost.map((item) => ({ month: item._id, cost: item.cost })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load maintenance report.", errors: [] });
  }
}

async function getRevenueReport(req, res) {
  const { months, startDate } = readMonthRange(req, res);

  try {
    const [monthlyRevenue, lifetimeTotal] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "received", receivedAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$receivedAt" } },
            amount: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Payment.aggregate([
        { $match: { status: "received" } },
        { $group: { _id: null, amount: { $sum: "$amount" } } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      message: "Revenue report loaded from recorded payment receipts.",
      data: {
        months,
        lifetimeRecordedReceipts: lifetimeTotal[0]?.amount || 0,
        monthly: monthlyRevenue.map((item) => ({ month: item._id, amount: item.amount })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load revenue report.", errors: [] });
  }
}

module.exports = { getOverview, getBookingReport, getFleetReport, getMaintenanceReport, getRevenueReport };
