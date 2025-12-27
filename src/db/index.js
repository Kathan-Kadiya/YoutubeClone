import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB = async() => {
    try{
        const rawUri = process.env.MONGODB_URI;
        const uri = rawUri ? rawUri.trim() : rawUri;
        if(!uri){
            console.log("MONGODB CONNECTION ERROR: MONGODB_URI is not defined in environment");
            process.exit(1);
        }
        const connectionInstance = await mongoose.connect(`${uri}/${DB_NAME}`);
        console.log(`\n MongoDB connected !! DB HOST : ${connectionInstance.connection.host}`);
    }catch(err){
        console.log("MONGODB CONNECTION ERROR: ", err);
        process.exit(1);
    }
}

export default connectDB;