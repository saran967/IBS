import Cart from "../../models/cart/CartModel.js";
import Product from "../../models/productModel.js";

//  Add product to cart
export const addToCart = async (req, res) => {
  try {
    console.log(req.user.userId, "req details");
    const customerId = req.user.userId;
    console.log(customerId);

    if (!customerId)
      return res.status(400).json({ message: "Customer ID missing" });

    const { productId, quantity } = req.body;
    if (!productId)
      return res.status(400).json({ message: "Product ID is required" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    let cart = await Cart.findOne({ customer: customerId });

    if (!cart) {
      // Create new cart
      cart = await Cart.create({
        customer: customerId,
        items: [{ product: productId, quantity: quantity || 1 }],
      });
    } else {
      // Check if product already in cart
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId,
      );
      if (itemIndex > -1) {
        // Update quantity
        cart.items[itemIndex].quantity += quantity || 1;
      } else {
        cart.items.push({ product: productId, quantity: quantity || 1 });
      }
      await cart.save();
    }

    const updatedCart = await Cart.findById(cart._id).populate("items.product");
    res.status(200).json({ success: true, cart: updatedCart });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//  Remove a product from cart
export const removeFromCart = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { productId } = req.params;

    let cart = await Cart.findOne({ customer: customerId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId,
    );
    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate("items.product");
    res.status(200).json({ success: true, cart: updatedCart });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//  Increment quantity
export const incrementItem = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { productId } = req.params;

    const cart = await Cart.findOne({ customer: customerId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find((i) => i.product.toString() === productId);
    if (!item) return res.status(404).json({ message: "Product not in cart" });

    item.quantity += 1;
    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate("items.product");
    res.status(200).json({ success: true, cart: updatedCart });
  } catch (error) {
    console.error("Increment cart item error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//  Decrement quantity
export const decrementItem = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { productId } = req.params;

    const cart = await Cart.findOne({ customer: customerId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const itemIndex = cart.items.findIndex(
      (i) => i.product.toString() === productId,
    );
    if (itemIndex === -1)
      return res.status(404).json({ message: "Product not in cart" });

    if (cart.items[itemIndex].quantity > 1) {
      cart.items[itemIndex].quantity -= 1;
    } else {
      // Remove item if quantity goes below 1
      cart.items.splice(itemIndex, 1);
    }

    await cart.save();
    const updatedCart = await Cart.findById(cart._id).populate("items.product");
    res.status(200).json({ success: true, cart: updatedCart });
  } catch (error) {
    console.error("Decrement cart item error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//  Clear cart
export const clearCart = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const cart = await Cart.findOne({ customer: customerId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = [];
    await cart.save();

    res.status(200).json({ success: true, message: "Cart cleared", cart });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//  Get cart
export const getCart = async (req, res) => {
  try {
    console.log(req.user, "hjgchjgfhjg");

    const customerId = req.user.userId;
    console.log(customerId, req.user.userId);
    const cart = await Cart.findOne({ customer: customerId }).populate(
      "items.product",
    );
    // if (!cart) return res.status(200).json({ success: true, cart: { items: [] } });
    res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
