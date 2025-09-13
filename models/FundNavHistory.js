import mongoose from "mongoose";

const schema = new mongoose.Schema({
  schemeCode: { type: Number, required: true, index: true },
  nav: { type: Number, required: true },
  date: { type: String, required: true }, // DD-MM-YYYY
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("FundNavHistory", schema);
