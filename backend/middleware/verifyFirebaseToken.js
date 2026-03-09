// middleware/verifyFirebaseToken.js
import admin from "../utils/firebase.js";

export const verifyFirebaseToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token missing" });

    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid Firebase token" });
  }
};
