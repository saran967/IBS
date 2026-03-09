import cron from "node-cron";
import Offer from "../../../models/offer/offerModel.js";
import Product from "../../../models/productModel.js";

const offerExpiryCheck = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("Checking expired offers...");

    const expiredOffers = await Offer.find({
      endDate: { $lt: new Date() },
      isActive: true,
    });

    for (const offer of expiredOffers) {
      const products = await Product.find({ _id: { $in: offer.product } });

      for (const product of products) {
        if (product.originalSellingPriceB2B !== undefined) {
          product.sellingPriceforB2B = product.originalSellingPriceB2B;
          product.originalSellingPriceB2B = undefined;
        }

        if (product.originalSellingPriceB2C !== undefined) {
          product.sellingPriceforB2C = product.originalSellingPriceB2C;
          product.originalSellingPriceB2C = undefined;
        }

        if (product.originalSellingPriceforAgents !== undefined) {
          product.sellingPriceforAgent = product.originalSellingPriceforAgents;
          product.originalSellingPriceforAgents = undefined;
        }

        await product.save();
      }

      offer.isActive = false;
      offer.status = "expired";
      await offer.save();
    }

    console.log(`Offer expiry check completed.`);
  });
};

export default offerExpiryCheck;
