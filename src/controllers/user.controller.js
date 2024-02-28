import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadFileOnCloudinary} from "../utils/Cloudinary.js";
import jwt from "jsonwebtoken"
import { Course } from "../models/course.model.js";
import fs from "fs"


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Error occued while generating access and refresh token")
    }
}


export const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, password } = req.body

    if ([fullName, email, password].some((field) => (field?.trim() === ""))) {
        throw new ApiError(400, "All fields are mandatory")
    }

    const existedUser = await User.findOne({ email })

    if (existedUser) {
        const avatarLocalPath = req?.file.path;
        fs.unlinkSync(avatarLocalPath)
        throw new ApiError(409, "User with same email already exists")
    } else {

        const avatarLocalPath = req.file.path;
        // console.log(avatarLocalPath);
        
        if (!avatarLocalPath) {
                throw new ApiError(400, "avatar required")
        }

        const avatar = await uploadFileOnCloudinary(avatarLocalPath)
        // console.log(avatar);

        const newUser = await User.create({
            fullName,
            email,
            password,
            avatar: {
                public_id : avatar.public_id,
                url : avatar.secure_url
            }
        })

        const userCreated = await User.findById(newUser._id).select("-password -refreshToken")  // checking if the new user is available on mongodb
        if (userCreated) {
            res.status(201).json(
                new ApiResponse(200, userCreated, "User Created Successfully")
            )
        } else {
            throw ApiError(500, "Something error occurred while creating user.Try Again")
        }
    }

})

export const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (!email) {
        throw new ApiError(400, "email is required")
    }

    const user = await User.findOne({ email })
    if (!user) {
        throw new ApiError(404, "User does not exists")
    }
    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid  user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const cookieOptions = {
        httpOnly: true,
        secure: true
    }
    return res.status(200).cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User LoggedIn Successfully"
            )
        )
})

export const logoutUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    await User.findByIdAndUpdate(userId,
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
        .json(new ApiResponse(200, {}, "User logged out"))

})

export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Access")
    }
    try {
        const decodedToken = jwt.verify(refreshAccessToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh  token does not match")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(user._id)
        return res.status(200)
            .cookie("accessToken", newAccessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(200,
                    {
                        accessToken: newAccessToken,
                        refreshToken: newRefreshToken
                    },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401,"unauthorized access")
    }

})

export const updatePassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body;
    const  user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave : false})

    return res.status(200).json(
        new ApiResponse(200,{},"Password changed successfully")
    )
})

export const getCurrentUser = asyncHandler(async(req,res)=>{
    const currentUser = req.user
    return res.status(200).json(
        new ApiResponse(200,{
            user : currentUser
        },"Current user fetched successfully")
    )
})








//courses related functions - getAllCourses,getParticular course

export const getAllCourses = asyncHandler(async(req,res)=>{
    const courses = await Course.find().select("-lectures") //here we are showing all the courses.so we will not show lectures
    if(!courses){
        throw new ApiError(404,"No courses available")
    }
    return res.status(200).json(
        new ApiResponse(200,
            {
                courses : courses
            }
            ,"Courses Fetched Successfully")
    )
})

export const enrollCourse = asyncHandler(async(req,res)=>{
    const user = req.user
    const {courseId} = req.params

    const isOptedCourse = user.optedCourses.some((course)=>course.courseId.toString()===courseId.toString())
    console.log((isOptedCourse));
    const course = await Course.findById(courseId)
    user.optedCourses.push({
        courseId: course._id,
        courseTitle: course.courseTitle
    });

    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200,null,"Enrolled to the course successfully.Check opted courses")
    )
})


export const getCourse = asyncHandler(async(req,res)=>{
    const user = req.user
    const {courseId} = req.params
    const isOpted = user ? (
        user.optedCourses.some((course)=>course.courseId.toString() === courseId)
    ) : false;
    const course = await Course.findById(courseId).select(`${(isOpted) ? "" : "-lectures"}`)
    if(!course){
        throw new ApiError(404,"course_not_found")
    }

    return res.status(200).json(
        new ApiResponse(200,
            {
                isLoggedIn: user ? true : false,
                isOpted,
                course : course
            },
            "Course Fetched Successfully"
            )
    )

    
})

export const getMyCourses = asyncHandler(async(req,res)=>{
    const user = req.user
    const courses = [];
    for (const cid of user.optedCourses) {
        const course = await Course.findById(cid.courseId).select("-lectures");
        course && courses.push(course);
    }

    return res.status(200).json(
        new ApiResponse(200,
            {
                courses : courses
            },
            "User Courses Fetched Successfully"
            )
    )

})











