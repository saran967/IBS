import Target from "../../models/Target/agentTargetModel.js";
import Agent from "../../models/customerModel.js";
import AgentDailyProgress from "../../models/Target/agentDailyProgress.js";

const todayISO = () => new Date().toISOString().split("T")[0];

export const assignDailyTarget = async (req, res) => {
  try {
    const {
      targetType,
      shopVisitTarget = 0,
      orderTarget = 0,
      amountLevelTarget,
      date,
    } = req.body;
    const targetDate = date || todayISO();

    if (
      !["shopVisit", "orderTaken", "amountLevel", "allOfThem"].includes(
        targetType
      )
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid targetType" });
    }

    // upsert target document for the date
    const target = await Target.findOneAndUpdate(
      { date: targetDate },
      { targetType, shopVisitTarget, orderTarget, amountLevelTarget },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // fetch all agents and update their AgentDailyProgress record for that date
    const agents = await Agent.find({ customerType: "agent" });

    const ops = agents.map((agent) => {
      return AgentDailyProgress.findOneAndUpdate(
        { agentId: agent._id, date: targetDate },
        {
          $set: {
            shopVisitTarget: shopVisitTarget,
            orderTarget: orderTarget,
            amountLevelTarget: amountLevelTarget,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    });

    await Promise.all(ops);

    res.json({
      success: true,
      message: "Target assigned to all agents",
      target,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getTargets = async (req, res) => {
  try {
    const targets = await Target.find().sort({ date: -1 });
    res.json({ success: true, targets });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getTargetByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const target = await Target.findOne({ date });
    res.json({ success: true, target });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
