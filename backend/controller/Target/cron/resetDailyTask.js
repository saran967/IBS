import cron from "node-cron";
import Agent from "../../../models/customerModel.js";
import AgentDailyProgress from "../../../models/Target/agentDailyProgress.js";
import Target from "../../../models/Target/agentTargetModel.js";

const getISTDate = () => {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};
const initDaily = async (dateISO) => {
  // For each agent, ensure a AgentDailyProgress record exists for the date.
  const agents = await Agent.find({ customerType: "agent" });

  // If admin already assigned a Target for this date, pick those targets; else default to 0.
  const target = await Target.findOne({ date: dateISO });

  const ops = agents.map((agent) => {
    return AgentDailyProgress.findOneAndUpdate(
      { agentId: agent._id, date: dateISO },
      {
        $setOnInsert: {
          agentId: agent._id,
          date: dateISO,
          shopVisitTarget: target ? target.shopVisitTarget : 0,
          orderTarget: target ? target.orderTarget : 0,
          amountLevelTarget: target ? target.amountLevelTarget : 0,
          shopVisitProgress: 0,
          orderProgress: 0,
          amountLevelProgress: 0,
          reachedTarget: false,
        },
      },
      { upsert: true }
    );
  });

  await Promise.all(ops);
  console.log(`Daily progress initialized for ${dateISO}`);
};

export default function scheduleDailyReset(cronExpr) {
  // call immediately for first-run (optional)
  const todayISO = getISTDate();
  initDaily(todayISO).catch((err) => console.error("initDaily error:", err));

  // schedule
  cron.schedule(
    cronExpr,
    async () => {
      const dateISO = getISTDate();
      try {
        await initDaily(dateISO);
      } catch (err) {
        console.error("Error initializing daily progress:", err);
      }
    },
    {
      scheduled: true,
    }
  );
}
