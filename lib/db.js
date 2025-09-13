// import mongoose from "mongoose";

// //Function to connect to the mongoDB database
// export const connectDB = async () => {
//     try {

//         mongoose.connection.on('connected', ()=> console.log('Database connected'));

//         await mongoose.connect(`${process.env.MONGO_URI}/Bancwise`)
//     } catch (error) {
//         console.log(error);

//     }
// }

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI not set in environment");
  process.exit(1);
}

export default async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {});
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}
