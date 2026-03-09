import pkg from "bullmq";
const { Worker } = pkg;

console.log("Ledger Worker Started");

import connection, { LEDGER_QUEUE_NAME } from "./queue.js";
import VendorLedger from "../models/vendors/VendorLedgerSchema.js";



// const ledgerWorker = new Worker(
//   LEDGER_QUEUE_NAME,
//   async (job) => {
//     console.log("Worker received job:", job.id);
//     const event = job.data;

//     await VendorLedger.create({
//       financialYearId: event.financialYearId,
//       vendorId: event.vendorId,
//       purchaseId: event.purchaseId,
//       type: event.type,
//       debit: event.debit,
//       credit: event.credit,
//       referenceId: event.referenceId,
//       note: event.note,
//       metadata: event.metadata,
//       createdBy: event.createdBy,
//     });


//     console.log(VendorLedger, 'vendor details');

//     console.log("Ledger stored:", event.purchaseId);
//   },
//   { connection }
// );

const ledgerWorker = new Worker(
  LEDGER_QUEUE_NAME,
  async (job) => {
    try {

      console.log("Worker received job:", job.id);

      const event = job.data;

     await VendorLedger.create({
  financialYearId: event.financialYearId,
  vendorId: event.vendorId,

  // 🔥 IMPORTANT for overdue calculation
  purchaseId: event.purchaseId || null,

  type: event.type,

  debit: Number(event.debit || 0),
  credit: Number(event.credit || 0),

  referenceId: event.referenceId || null,
  note: event.note || "",

  metadata: event.metadata || {},

  createdBy: event.createdBy || null,
});

      console.log("Ledger stored:", event.purchaseId);

    } catch (err) {
      console.error("Ledger Worker Error:", err);
    }
  },
  { connection }
);

export default ledgerWorker;