import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Uploader } from "../models/uploader.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadFileOnCloudinary } from "../utils/Cloudinary.js";
import jwt from "jsonwebtoken"


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const uploader = await Uploader.findById(userId)
        const accessToken = await uploader.generateAccessToken()
        const refreshToken = await uploader.generateRefreshToken()

        uploader.refreshToken = refreshToken
        await uploader.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Error occued while generating access and refresh token")
    }
}


const registerUploader = asyncHandler(async (req, res) => {
    //get user details from frontend
    //validation - not empty(main checking)
    //check is user already exists-email
    //create user object - create entry in db
    //remove password and refresh token field from response(user object)
    //check for user creation
    //return response


    const { fullName, email, password } = req.body

    if ([fullName, email, password].some((field) => (field?.trim() === ""))) {
        throw new ApiError(400, "All fields are mandatory")
    }

    const existedUploader = await Uploader.findOne({ email })

    if (existedUploader) {
        throw new ApiError(409, "Instructor with same email already exists")
    } else {

        const avatarLocalPath = req.file.path;
        console.log(avatarLocalPath);

        if (!avatarLocalPath) {
            throw new ApiError(400, "avatar required")

        }

        const avatar = await uploadFileOnCloudinary(avatarLocalPath)
        console.log(avatar);

        const newUploader = await Uploader.create({
            fullName,
            email,
            password,
            avatar: avatar.url,
            isInstructor :true
        })

        const uploaderCreated = await Uploader.findById(newUploader._id).select("-password -refreshToken")  // checking if the new uploader is available on mongodb
        if (uploaderCreated) {
            res.status(201).json(
                new ApiResponse(200, uploaderCreated, "uploader Created Successfully")
            )
        } else {
            throw ApiError(500, "Something error occurred while creating uploader.Try Again")
        }
    }

})

const loginUploader = asyncHandler(async(req,res)=>{
    const{email ,password} = req.body;

    if(!email){
        throw new ApiError(400,"Email Required")
    }
    if(!password){
        throw new ApiError(400,"Password Required")
    }

    const uploader = await Uploader.findOne({email})
    if(!uploader){
        throw new ApiError(404,"uploader does not exists")
    }
    const isPasswordValid =  await uploader.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(400,"Invalid uploader credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(uploader._id)
    const loggedInUploader = await Uploader.findById(uploader._id).select("-password -refreshToken")
    
    const cookieOptions = {
        httpOnly: true,
        secure: true
    }
    return res.status(200).cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(200,
                {
                    uploader: loggedInUploader,
                    accessToken,
                    refreshToken
                },
                "Uploader LoggedIn Successfully"
            )
        )


})

const logoutUploader = asyncHandler(async (req, res) => {
    const uploaderId = req.uploader._id;
    await Uploader.findByIdAndUpdate(uploaderId,
        {
            $set: {
                refreshToken: undefined
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

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "Uploader logged out"))

})


export { registerUploader,loginUploader,logoutUploader }