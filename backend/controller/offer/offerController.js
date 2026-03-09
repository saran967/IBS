import Offer from "../../models/offer/offerModel.js";
import productModel from "../../models/productModel.js";
import Customer from "../../models/customerModel.js";
import { sendNotification } from "../../utils/notificationMessage.js";

export const createOffer = async (req, res) => {
  try {
    const {
      title,
      offerType,
      value,
      applyOn,
      product,
      category,
      startDate,
      endDate,
      message,
    } = req.body;

    let productsApplied = [];

    if (applyOn === "category" && category) {
      const products = await productModel.find({ "category.en": category });

      if (!products.length) {
        return res.status(404).json({
          success: false,
          message: "No products found under this category",
        });
      }

      productsApplied = products.map((p) => p._id);
      await applyOfferToProducts(products, offerType, value);
    }

    if (applyOn === "product" && product) {
      const singleProduct = await productModel.findById(product);

      if (!singleProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      productsApplied = [singleProduct._id];
      await applyOfferToProducts([singleProduct], offerType, value);
    }

    const offer = await Offer.create({
      title,
      offerType,
      value,
      applyOn,
      product: productsApplied,
      category,
      startDate,
      endDate,
      message,
    });

    const customers = await Customer.find({
      fcmToken: { $ne: null },
    }).select("_id fcmToken customerName");

    console.log("📲 Customers with token:", customers.length);

    for (const customer of customers) {
      try {
        await sendNotification(
          customer.fcmToken,
          "🎉 New Offer Alert!",
          `${title} is now live! Grab the deal now `,
          {
            targetScreen: "OFFERS",
            offerId: offer._id.toString(),
          },
        );
      } catch (err) {
        console.error(
          "❌ Invalid FCM token removed for customer:",
          customer._id,
        );

        //  REMOVE INVALID TOKEN
        await Customer.updateOne(
          { _id: customer._id },
          { $set: { fcmToken: null } },
        );
      }
    }

    return res.status(201).json({
      success: true,
      message: "Offer created & notifications sent successfully",
      offer,
    });
  } catch (error) {
    console.error("❌ Create Offer Error:", error);

    return res.status(500).json({
      success: false,
      message: "Create offer failed",
      error: error.message,
    });
  }
};

export const getOffers = async (req, res) => {
  try {
    //  Pagination params
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    //  Total count
    const totalOffers = await Offer.countDocuments();

    //  Fetch paginated offers
    const offers = await Offer.find()
      .populate("product", "name category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      offers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalOffers / limit),
        totalOffers,
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE OFFER
export const updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.status(200).json({ success: true, offer });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// DELETE OFFER
export const deleteOffer = async (req, res) => {
  try {
    await Offer.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Offer deleted" });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// GET ACTIVE OFFERS FOR USERS
export const getActiveOffers = async (req, res) => {
  try {
    const today = new Date();
    const offers = await Offer.find({
      startDate: { $lte: today },
      endDate: { $gte: today },
      status: "active",
    });

    res.status(200).json({ success: true, offers });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const applyOfferToProducts = async (products, offerType, value) => {
  for (const product of products) {
    if (!product.originalSellingPriceB2B)
      product.originalSellingPriceB2B = product.sellingPriceforB2B;
    if (!product.originalSellingPriceB2C)
      product.originalSellingPriceB2C = product.sellingPriceforB2C;
    if (!product.originalSellingPriceforAgents)
      product.originalSellingPriceforAgents = product.sellingPriceforAgents;

    let updatedB2B = Number(product.sellingPriceforB2B);
    let updatedB2C = Number(product.sellingPriceforB2C);
    let updatedAgents = Number(product.sellingPriceforAgents);

    if (offerType === "fixed") {
      updatedB2B = value;
      updatedB2C = value;
      updatedAgents = value;
    }

    if (offerType === "percentage") {
      updatedB2B -= (updatedB2B * value) / 100;
      updatedB2C -= (updatedB2C * value) / 100;
      updatedAgents -= (updatedAgents * value) / 100;
    }

    if (offerType === "flat") {
      updatedB2B -= value;
      updatedB2C -= value;
      updatedAgents -= value;
    }

    product.sellingPriceforB2B = updatedB2B;
    product.sellingPriceforB2C = updatedB2C;
    product.sellingPriceforAgents = updatedAgents;
    await product.save();
  }
};
