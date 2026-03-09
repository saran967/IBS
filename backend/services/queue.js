import "dotenv/config";
import pkg from "bullmq";
const { Queue } = pkg;
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const LEDGER_QUEUE_NAME = "vendor-ledger-queue";

export const ledgerQueue = new Queue(LEDGER_QUEUE_NAME, { connection });

export const publishLedgerEvent = async (event) => {
  await ledgerQueue.add("ledger-event", event, {
    removeOnComplete: true,
    removeOnFail: true,
  });
};

export default connection;
