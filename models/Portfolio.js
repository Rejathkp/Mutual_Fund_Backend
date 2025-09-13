import mongoose from "mongoose";

const portfolioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  schemeCode: { type: Number, required: true, index: true },
  units: { type: Number, required: true },
  purchaseDate: { type: Date, default: Date.now },
  purchaseNav: { type: Number, required: true }, // NAV at time of purchase
  investedAmount: { type: Number, required: true }, // units × purchaseNav
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Portfolio", portfolioSchema);
