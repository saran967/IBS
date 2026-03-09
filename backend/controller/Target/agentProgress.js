// backend/controllers/progressController.js

import AgentDailyProgress from "../../models/Target/agentDailyProgress.js";

export const getAgentDailyProgress = async (req, res) => {
  try {
    const agentId = req.user.userId;
    const date = req.query.date || new Date().toISOString().split("T")[0];

    const progress = await AgentDailyProgress.findOne({
      agentId,
      date,
    }).populate("agentId", "name email"); // optional

    if (!progress) {
      return res.json({
        success: true,
        message: "No progress found for today",
        progress: null,
      });
    }

    console.log("backend is reached successfully");

    return res.json({
      success: true,
      progress,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getAllAgentsDailyProgress = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0];

    const all = await AgentDailyProgress.find({ date })
      .populate("agentId", "name email") // optional
      .sort({ reachedTarget: -1, shopVisitProgress: -1 }); // best performers first

    return res.json({
      success: true,
      date,
      agents: all,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getProgressByDate = async (req, res) => {
  try {
    const { date } = req.params;
    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required",
      });
    }

    // Fetch progress for specific date
    const agents = await AgentDailyProgress.find({ date })
      .populate("agentId", "email customerName")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      date,
      agents,
    });
  } catch (error) {
    console.error("Get progress by date error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMonthlyTargetReport = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "month and year are required, example: ?month=02&year=2025",
      });
    }

    // Build regex: "2025-02"
    const datePrefix = `${year}-${String(month).padStart(2, "0")}`;

    // Fetch month data
    const monthly = await AgentDailyProgress.aggregate([
      {
        $match: {
          date: { $regex: `^${datePrefix}` },
        },
      },
      {
        $group: {
          _id: "$agentId",
          totalDays: { $sum: 1 },
          completedDays: {
            $sum: { $cond: ["$reachedTarget", 1, 0] },
          },
          details: {
            $push: {
              date: "$date",
              reachedTarget: "$reachedTarget",
              shopVisitProgress: "$shopVisitProgress",
              orderProgress: "$orderProgress",
              amountLevelProgress: "$amountLevelProgress",
            },
          },
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "agentInfo",
        },
      },
      { $unwind: "$agentInfo" },
      {
        $project: {
          _id: 0,
          agentId: "$_id",
          agentName: "$agentInfo.customerName",
          email: "$agentInfo.email",
          totalDays: "$totalDays",
          completedDays: "$completedDays",
          completionPercentage: {
            $multiply: [{ $divide: ["$completedDays", "$totalDays"] }, 100],
          },
          details: 1,
        },
      },
      { $sort: { completionPercentage: -1 } },
    ]);

    return res.json({
      success: true,
      month,
      year,
      report: monthly,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getDailyTargetReport = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date is required, example: ?date=2025-02-18",
      });
    }

    const daily = await AgentDailyProgress.aggregate([
      {
        $match: { date },
      },
      {
        $group: {
          _id: "$agentId",
          totalTargets: { $sum: 1 },
          completedTargets: {
            $sum: { $cond: ["$reachedTarget", 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "agentInfo",
        },
      },
      { $unwind: "$agentInfo" },
      {
        $project: {
          _id: 0,
          agentId: "$_id",
          agentName: "$agentInfo.customerName",
          email: "$agentInfo.email",
          completionPercentage: {
            $multiply: [
              { $divide: ["$completedTargets", "$totalTargets"] },
              100,
            ],
          },
        },
      },
      { $sort: { completionPercentage: -1 } },
    ]);

    return res.json({
      success: true,
      date,
      report: daily,
    });
  } catch (err) {
    console.error("Daily report error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
