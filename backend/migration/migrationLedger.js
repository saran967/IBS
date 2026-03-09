import "dotenv/config";
import mongoose from "mongoose";
import Purchase from "../models/purchaseModel.js";
import VendorPayment from "../models/vendorPaymentModel.js";
import VendorLedger from "../models/vendorLedgerModel.js";
import FinancialYear from "../models/FinancialYear.js";

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/isb";

async function migrate() {
  await mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected to Mongo for migration");

  const activeFY = await FinancialYear.findOne({ isActive: true });

if (!activeFY) {
  throw new Error("No active financial year found");
}


  const vendors = await Purchase.distinct("vendorId");
  const vendorPaymentsVendors = await VendorPayment.distinct("vendorId");
  const allVendors = Array.from(
    new Set([...vendors.map(String), ...vendorPaymentsVendors.map(String)])
  );

  for (const v of allVendors) {
    console.log("Migrating vendor", v);
    // const purchases = await Purchase.find({ vendorId: v })
    const purchases = await Purchase.find({
  vendorId: v,
  financialYearId: activeFY._id,
})
      .sort({ purchaseDate: 1 })
      .lean();
    // const payments = await VendorPayment.find({ vendorId: v })
    const payments = await VendorPayment.find({
  vendorId: v,
  financialYearId: activeFY._id,
})
      .sort({ paymentDate: 1 })
      .lean();

    // merge by date
    const events = [];
    purchases.forEach((p) =>
      events.push({
        date: p.purchaseDate || p.createdAt,
        src: "PURCHASE",
        doc: p,
      })
    );
    payments.forEach((p) =>
      events.push({
        date: p.paymentDate || p.createdAt,
        src: "PAYMENT",
        doc: p,
      })
    );
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    let running = 0;
    for (const e of events) {
      if (e.src === "PURCHASE") {
        const debit = Number(e.doc.totalAmount || 0);
        running = Number((running + debit).toFixed(2));
        await VendorLedger.create({
          financialYearId: activeFY._id,
          vendorId: v,
          date: e.date,
          type: "PURCHASE",
          debit,
          credit: 0,
          balance: running,
          referenceId: e.doc._id,
          note: `Migrated purchase ${e.doc._id}`,
        });
      } else {
        const credit = Number(e.doc.amount || 0);
        running = Number((running - credit).toFixed(2));
        await VendorLedger.create({
          financialYearId: activeFY._id,
          vendorId: v,
          date: e.date,
          type: "PAYMENT",
          debit: 0,
          credit,
          balance: running,
          referenceId: e.doc._id,
          note: `Migrated payment ${e.doc._id}`,
        });
      }
    }
  }

  console.log("Migration complete");
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
