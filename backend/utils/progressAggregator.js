// backend/utils/progressAggregator.js
import AgentDailyProgress from "../models/Target/agentDailyProgress.js";
import RoutePath from "../models/Location/routeModel.js";

const getISTDate = () => {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

export const updateDailyProgressForAgent = async (agentId) => {
 
  const date = getISTDate();

 
  const routes = await RoutePath.find({
    user: agentId,
    startedAt: {
      $gte: new Date(date + "T00:00:00.000Z"),
      $lte: new Date(date + "T23:59:59.999Z"),
    },
  }).select("shops");

  let shopVisitProgress = 0;
  let orderProgress = 0;
  let amountLevelProgress = 0;

  // Merge all routes
  for (const route of routes) {
    shopVisitProgress += route.shops.length;

    for (const shop of route.shops) {
      orderProgress += shop.order?.length || 0;

      amountLevelProgress += Number(shop.grandTotal || 0);
    }
  }

  // Find or create daily progress entry
  let progress = await AgentDailyProgress.findOne({ agentId, date });

  if (!progress) {
    progress = await AgentDailyProgress.create({
      agentId,
      date,
      shopVisitProgress,
      orderProgress,
      amountLevelProgress,
    });
  } else {
    progress.shopVisitProgress = shopVisitProgress;
    progress.orderProgress = orderProgress;
    progress.amountLevelProgress = amountLevelProgress;
  }

  // Check if target is reached
  const shopOK = progress.shopVisitProgress >= progress.shopVisitTarget;
  const orderOK = progress.orderProgress >= progress.orderTarget;
  const amountOK = progress.amountLevelProgress >= progress.amountLevelTarget;

  progress.reachedTarget = shopOK && orderOK && amountOK;

  await progress.save();
  return progress;
};
