import mongoose from "mongoose";

const schema = new mongoose.Schema({
  schemeCode: { type: Number, required: true, unique: true },
  nav: { type: Number, required: true },
  date: { type: String, required: true }, // DD-MM-YYYY
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("FundLatestNav", schema);
