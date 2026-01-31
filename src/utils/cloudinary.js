import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

const uploadOnCloudinary = async (localFilePath) => {

    // Configure on each upload to ensure env vars are loaded
    cloudinary.config({
        cloud_name: process.env.CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    // console.log("filePath:", localFilePath);
    // console.log(process.env.CLOUD_NAME," ", process.env.CLOUDINARY_API_KEY, " ", process.env.CLOUDINARY_API_SECRET);

    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        // console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        // console.log(error);
        return null;
    }
}



export {uploadOnCloudinary}