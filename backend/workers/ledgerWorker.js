import "dotenv/config";
import mongoose from "mongoose";
import pkg from "bullmq";
const { Worker } = pkg;

import VendorLedger from "../models/vendors/VendorLedgerSchema.js";
import connection, { LEDGER_QUEUE_NAME } from "../services/queue.js";

// -------------------------------
// CONNECT TO MONGO
// -------------------------------

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("Ledger Worker connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// -------------------------------
// LEDGER WORKER PROCESSOR
// -------------------------------

const worker = new Worker(
  LEDGER_QUEUE_NAME,

  async (job) => {
    const event = job.data;

    const financialYearId = event.financialYearId;
    const vendorId = event.vendorId;
    const date = event.date ? new Date(event.date) : new Date();

    if (!financialYearId || !vendorId) {
      throw new Error("financialYearId and vendorId are required for ledger events");
    }

    // -------------------------------------
    // FIND LAST BALANCE FOR THIS VENDOR
    // -------------------------------------
    const lastRow = await VendorLedger.findOne({ financialYearId, vendorId })
      // .sort({ date: -1, createdAt: -1 })
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    const previousBalance = lastRow ? Number(lastRow.balance) : 0;

    const debit = Number(event.debit || 0);
    const credit = Number(event.credit || 0);

    const newBalance = Number((previousBalance + debit - credit).toFixed(2));

    // -------------------------------------
    // CREATE NEW LEDGER ENTRY
    // -------------------------------------
    const row = new VendorLedger({
      financialYearId,
      vendorId,
      date,
      type: event.type,
      debit,
      credit,
      balance: newBalance,
      referenceId: event.referenceId || null,
      note: event.note || "",
      metadata: event.metadata || {},
      createdBy: event.createdBy || null,
    });

    await row.save();

    return { success: true, newBalance };
  },

  {
    connection, // IMPORTANT: must be the Redis Cloud TLS connection
  },
);

// -------------------------------
// WORKER EVENTS
// -------------------------------

worker.on("completed", (job, result) => {
  console.log(
    ` Ledger job processed | Job ID: ${job.id} | Balance: ${result.newBalance}`,
  );
});

worker.on("failed", (job, err) => {
  console.error(`❌ Ledger job failed | Job ID: ${job?.id}`, err);
});

console.log("🚀 Ledger Worker started and waiting for ledger events...");
