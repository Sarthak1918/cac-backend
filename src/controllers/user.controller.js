import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadFileOnCloudinary } from "../utils/Cloudinary.js";
import jwt from "jsonwebtoken"
import { Course } from "../models/course.model.js";


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

    const existedUser = await User.findOne({ email })

    if (existedUser) {
        throw new ApiError(409, "User with same email already exists")
    } else {

        // const avatarLocalPath = req.file.path;
        // console.log(avatarLocalPath);

        // if (!avatarLocalPath) {
        //     throw new ApiError(400, "avatar required")

        // }

        // const avatar = await uploadFileOnCloudinary(avatarLocalPath)
        // console.log(avatar);

        const newUser = await User.create({
            fullName,
            email,
            password,
            // avatar: avatar.url
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
        new ApiResponse(200,currentUser,"Current user fetched successfully")
    )
})

export const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName} = req.body

    if (!fullName) {
        throw new ApiError(400, "full name required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName : fullName,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});

//export const changeAvatar = asyncHandler(async(req,res)=>{

// })





//courses related functions - getAllCourses,getParticular course

//BEFORE ENROLLMENT-(FOR ALL USERS)
export const getAllCourses = asyncHandler(async(req,res)=>{
    const courses = await Course.find().select("-lectures") //here we are showing all the courses.so we will not show lectures
    if(!courses){
        throw new ApiError(404,"No courses available")
    }
    return res.status(200).json(
        new ApiResponse(200,courses,"Courses Fetched Successfully")
    )
})

//we will use the following api when we want to display course description
export const getCourseDetails = asyncHandler(async(req,res)=>{
    const course = await Course.findById(req.params.id)
    if(!course){
        throw new ApiError(400,"course does not exists")
    }
    return res.status(200).json(
        new ApiResponse(200,course,"Courses Fetched Successfully")
    )
})



//will se the following api when the user enrolled and want to see the videos.
// export const getCourseLectures = asyncHandler(async(req,res)=>{
//     const course = await Course.findById(req.params.id)
//     const courses = await Course.find().select("-lectures") //here we are showing all the courses.so we will not show lectures
//     if(!courses){
//         throw new ApiError(404,"No courses available")
//     }
//     return res.status(200).json(
//         new ApiResponse(200,courses,"Courses Fetched Successfully")
//     )
// })



// export { registerUser, loginUser, logoutUser,refreshAccessToken,updatePassword,getCurrentUser,updateAccountDetails }