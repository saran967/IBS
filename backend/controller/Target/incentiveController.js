import mongoose from "mongoose";
import Incentive from "../../models/Target/incentiveModel.js";
import Customer from "../../models/customerModel.js";
import { sendNotification } from "../../utils/notificationMessage.js";

export const createIncentive = async (req, res) => {
  try {
    const { agents, amount, purpose, month, year } = req.body;

    console.log(req.body, "agent", agents);

    if (!agents || !Array.isArray(agents) || agents.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Agents required",
      });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a valid number",
      });
    }

    if (!purpose || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "Purpose, month, and year are required",
      });
    }

    // STEP 1 — Convert to clean ID list
    const agentIds = agents
      .map((a) => (typeof a === "object" ? a._id : a))
      .filter((id) => id);

    // Check missing _id case
    if (agentIds.length !== agents.length) {
      return res.status(400).json({
        success: false,
        message: "Each agent must contain a valid _id.",
      });
    }

    // Validate ObjectId format
    for (let id of agentIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: `Invalid agent ObjectId: ${id}`,
        });
      }
    }

    // STEP 2 — Ensure agents exist
    const validAgents = await Customer.find({ _id: { $in: agentIds } });
    console.log(validAgents, "agent details");
    if (validAgents.length !== agentIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some agent IDs do not exist.",
      });
    }

    // Normalize today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find or create incentive record
    let incentive = await Incentive.findOne({
      month: String(month),
      year,
    });

    if (!incentive) {
      incentive = new Incentive({
        month: String(month),
        year,
        purpose,
        agents: [],
      });
    }

    // STEP 3 — Process agents
    for (let agentId of agentIds) {
      let agentEntry = incentive.agents.find(
        (a) => String(a.agent) === String(agentId)
      );

      if (!agentEntry) {
        incentive.agents.push({
          agent: new mongoose.Types.ObjectId(agentId),
          dailyEntries: [],
          totalAmount: 0,
        });

        // Re-fetch the newly created agentEntry from incentive
        agentEntry = incentive.agents.find(
          (a) => String(a.agent) === String(agentId)
        );
      }

      const todayEntry = agentEntry.dailyEntries.find(
        (d) => new Date(d.date).getTime() === today.getTime()
      );

      if (todayEntry) {
        todayEntry.amount += numericAmount;
      } else {
        agentEntry.dailyEntries.push({
          date: today,
          amount: numericAmount,
        });
      }

      agentEntry.totalAmount += numericAmount;

      await Customer.findByIdAndUpdate(agentId, {
        $inc: { totalIncentive: numericAmount },
      });
    }

    // Save incentive
    await incentive.save();

    // Push notifications
    for (let agent of validAgents) {
      if (agent.fcmToken) {
        await sendNotification(
          agent.fcmToken,
          "Incentive Updated",
          `${agent.customerName}, you received ₹${numericAmount} for ${purpose}.`,
          {
            targetScreen: "INCENTIVE",
            incentiveId: incentive._id.toString(),
          }
        );
      }
    }

    return res.status(201).json({
      success: true,
      message: "Incentive updated successfully",
      data: incentive,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDailyIncentives = async (req, res) => {
  try {
    // Read day/month/year from query or default to today
    const today = new Date();

    const day = req.query.day ? Number(req.query.day) : today.getDate();
    const month = req.query.month
      ? Number(req.query.month)
      : today.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : today.getFullYear();

    // Construct the target date at midnight
    const queryDate = new Date(year, month - 1, day);
    queryDate.setHours(0, 0, 0, 0);

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch incentives with agent data populated
    const incentives = await Incentive.find().populate(
      "agents.agent",
      "customerName"
    );

    let results = [];

    incentives.forEach((inc) => {
      inc.agents.forEach((agentData) => {
        agentData.dailyEntries.forEach((entry) => {
          const entryDate = new Date(entry.date);
          entryDate.setHours(0, 0, 0, 0);

          if (entryDate.getTime() === queryDate.getTime()) {
            results.push({
              incentiveId: inc._id,
              month: inc.month,
              year: inc.year,
              purpose: inc.purpose,
              agentId: agentData.agent?._id,
              agentName: agentData.agent?.customerName,
              date: entry.date,
              amount: entry.amount,
            });
          }
        });
      });
    });

    const totalRecords = results.length;
    const totalPages = Math.ceil(totalRecords / limit);

    const paginatedData = results.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      queryDate,
      day,
      month,
      year,
      page,
      limit,
      totalPages,
      totalRecords,
      data: paginatedData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDailyIncentivesforUser = async (req, res) => {
  try {
    // Logged-in agent ID
    const loggedInAgentId = req.user?.userId;
    if (!loggedInAgentId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Agent ID missing",
      });
    }

    console.log(loggedInAgentId);

    // Date filters
    const today = new Date();
    const day = req.query.day ? Number(req.query.day) : today.getDate();
    const month = req.query.month
      ? Number(req.query.month)
      : today.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : today.getFullYear();

    const queryDate = new Date(year, month - 1, day);
    queryDate.setHours(0, 0, 0, 0);

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch incentives containing this agent
    const incentives = await Incentive.find({
      "agents.agent": loggedInAgentId,
    }).populate("agents.agent", "customerName");

    let results = [];

    incentives.forEach((inc) => {
      const agentData = inc.agents.find(
        (ag) => ag.agent?._id.toString() === loggedInAgentId.toString()
      );

      if (agentData) {
        agentData.dailyEntries.forEach((entry) => {
          const entryDate = new Date(entry.date);
          entryDate.setHours(0, 0, 0, 0);

          if (entryDate.getTime() === queryDate.getTime()) {
            results.push({
              incentiveId: inc._id,
              month: inc.month,
              year: inc.year,
              purpose: inc.purpose,
              agentId: agentData.agent?._id,
              agentName: agentData.agent?.customerName,
              date: entry.date,
              amount: entry.amount,
            });
          }
        });
      }
    });

    const totalRecords = results.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const paginatedData = results.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      queryDate,
      day,
      month,
      year,
      page,
      limit,
      totalPages,
      totalRecords,
      data: paginatedData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMonthlyIncentives = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const incentives = await Incentive.find({
      month: String(month),
      year: String(year),
    }).populate("agents.agent", "customerName");

    const results = [];

    incentives.forEach((inc) => {
      inc.agents.forEach((agentData) => {
        const monthlyTotal = agentData.dailyEntries
          .filter((d) => {
            const dt = new Date(d.date);
            return (
              dt.getMonth() + 1 === Number(month) &&
              dt.getFullYear() === Number(year)
            );
          })
          .reduce((sum, d) => sum + d.amount, 0);

        results.push({
          incentiveId: inc._id,
          month: inc.month,
          year: inc.year,
          purpose: inc.purpose,
          agentId: agentData.agent?._id,
          agentName: agentData.agent?.customerName,
          monthlyTotal,
          dailyEntries: agentData.dailyEntries, // return full daily breakdown also
        });
      });
    });

    return res.status(200).json({
      success: true,
      month,
      year,
      totalRecords: results.length,
      data: results,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateIncentive = async (req, res) => {
  try {
    const { agentId, amount } = req.body;

    const updated = await Customer.findByIdAndUpdate(
      agentId,
      { $inc: { totalIncentive: -amount } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      agent: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
