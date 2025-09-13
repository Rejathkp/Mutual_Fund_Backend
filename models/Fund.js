import mongoose from "mongoose";

const fundSchema = new mongoose.Schema({
  schemeCode: { type: Number, required: true, unique: true },
  schemeName: String,
  isinGrowth: String,
  isinDivReinvestment: String,
  fundHouse: String,
  schemeType: String,
  schemeCategory: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Fund", fundSchema);
