import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { useReducer } from "react";

export const registerUser = asyncHandler( async (req,res) => {

    // collect info
    const {fullName,userName,email,password} = req.body;

    // check if info is missing
    if(!email || !userName || !password || !fullName){
        throw new ApiError(400,"All fields are required");
    }

    // check for the valid email and password
    if(password.length < 6){
        throw new ApiError(400,"password must contain at least 6 characters");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        throw new ApiError(400,"Invalid email format");
    }

    // check if user already exists
    const existUser = await User.findOne({
        $or: [{userName},{email}]
    });

    if(existUser){
        throw new ApiError(409,"User with this email or username already exists!");
    }

    // check for images and check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    // console.log("files:", req.files);
    // console.log("avatarLocalPath:", avatarLocalPath);

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required");
    }

    // upload files on the cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    // check avatar for added security
    if(!avatar){
        throw new ApiError(400,"Avatar is required from cloudinary");
    }

    const user = await User.create({
        fullName,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        userName: userName.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
});

const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return {accessToken,refreshToken};

    } catch (error) {
        throw new ApiError(500,"Error in generating access and refresh token.");
    }
}

export const loginUser = asyncHandler( async (req,res) => {
    // first take the input from the user
    const {email,password} = req.body;

    if(!email || !password){
        throw new ApiError(400,"All fields are required.");
    }

    const user = await User.findOne({email});

    if(!user){
        throw new ApiError(400,"User doesn't exist.");
    }

    const passwordCheck = await user.matchPassword(password);

    if(!passwordCheck){
        throw new ApiError(400,"User credentials Invalid");
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options).
    cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedUser, accessToken, refreshToken
            },
            "User Logged In Successfully."
        )
    );
});

export const logoutUser = asyncHandler( async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
});