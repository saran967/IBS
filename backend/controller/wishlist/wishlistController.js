import Wishlist from "../../models/wishlist/wishlistModel.js";

export const addToWishlist = async (req, res) => {
  try {
    const { userId } = req.user;
    console.log(userId, "user id");
    const { productId } = req.body;

    let wishlist = await Wishlist.findOne({ customer: userId });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        customer: userId,
        products: [{ product: productId }],
      });
      console.log(wishlist, "model");
      return res.status(201).json({
        message: "Product added to wishlist",
        wishlist,
      });
    }

    const exists = wishlist.products.some(
      (p) => p.product.toString() === productId
    );

    if (exists) {
      return res.status(400).json({
        message: "Product already in wishlist",
      });
    }

    wishlist.products.push({ product: productId });
    await wishlist.save();

    res.status(200).json({
      message: "Product added to wishlist",
      wishlist,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

export const getWishlist = async (req, res) => {
  try {
    const { userId } = req.user;
    console.log(userId, "req", req.user);

    const wishlist = await Wishlist.findOne({ customer: userId }).populate(
      "products.product"
    );

    if (!wishlist) {
      return res.status(200).json({ products: [] });
    }

    res.status(200).json(wishlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { userId } = req.user;
    const { productId } = req.body;

    const wishlist = await Wishlist.findOne({ customer: userId });

    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    wishlist.products = wishlist.products.filter(
      (p) => p.product.toString() !== productId
    );

    await wishlist.save();

    res.status(200).json({
      message: "Product removed from wishlist",
      wishlist,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};


export const clearWishlist = async (req, res) => {
  try {
    const { customerId } = req.params;

    await Wishlist.findOneAndUpdate({ customer: customerId }, { products: [] });

    res.status(200).json({ message: "Wishlist cleared" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
