import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Uploader } from "../models/uploader.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { deleteDocOnCloudinary, deleteImageOnCloudinary, deleteVideoOnCloudinary, uploadFileOnCloudinary } from "../utils/Cloudinary.js";
import jwt from "jsonwebtoken"
import { Course } from "../models/course.model.js";
import fs from "fs"

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


export const registerUploader = asyncHandler(async (req, res) => {

    const { fullName, email, password } = req.body

    if ([fullName, email, password].some((field) => (field?.trim() === ""))) {
        throw new ApiError(400, "All fields are mandatory")
    }

    const existedUploader = await Uploader.findOne({ email })

    if (existedUploader) {
        const avatarLocalPath = req?.file.path;
        fs.unlinkSync(avatarLocalPath)
        throw new ApiError(409, "Instructor with same email already exists")
    } else {

        const avatarLocalPath = req.file.path;

        console.log(avatarLocalPath);

        if (!avatarLocalPath) {
            throw new ApiError(400, "avatar required")

        }

        const avatar = await uploadFileOnCloudinary(avatarLocalPath)

        const newUploader = await Uploader.create({
            fullName,
            email,
            password,
            avatar: {
                public_id: avatar.public_id,
                url: avatar.secure_url
            },
            isInstructor: true
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

export const loginUploader = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        throw new ApiError(400, "Email Required")
    }
    if (!password) {
        throw new ApiError(400, "Password Required")
    }

    const uploader = await Uploader.findOne({ email })
    if (!uploader) {
        throw new ApiError(404, "uploader does not exists")
    }
    const isPasswordValid = await uploader.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid uploader credentials")
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

export const logoutUploader = asyncHandler(async (req, res) => {
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

export const getCurrentUploader = asyncHandler(async (req, res) => {
    const uploaderId = req.uploader._id
    if (!uploaderId) {
        throw new ApiError(401, "Unauthorized Access!Login First")
    }
    const uploader = await Uploader.findById(uploaderId).select("-password")
    if (!uploader) {
        throw new ApiError(401, "Uploader doesn't exists")
    }
    return res.status(200).json(new ApiResponse(200,
        {
            uploader: uploader
        },
        "Current User details fetched successfully"
    ))
})


//courses apis

export const createCourse = asyncHandler(async (req, res) => {

    const uploaderId = req.uploader?._id
    const uploader = await Uploader.findById(uploaderId)

    if (!uploader) {
        throw new ApiError(404, "Uploader not found");
    }

    const { courseTitle, description, category, price } = req.body
    if ([courseTitle, description, category, price].some((field) => (field?.trim() === ""))) {
        throw new ApiError(400, "All fields are mandatory")
    }

    if (uploader.uploadedCourses.length > 0) {
        uploader.uploadedCourses.map((course) => {
            if (course.courseTitle === courseTitle) {
                const posterLocalPath = req?.files?.poster[0].path
                const documentLocalPath = req?.files?.document[0].path
                fs.unlinkSync(posterLocalPath)
                fs.unlinkSync(documentLocalPath)
                throw new ApiError(409, "Course Already Exist")
            }
        })
    }


    const posterLocalPath = req?.files?.poster[0]?.path
    if (!posterLocalPath) {
        throw new ApiError(400, "Poster  is required");
    }
    const documentLocalPath = req?.files?.document[0]?.path

    const cloudPoster = await uploadFileOnCloudinary(posterLocalPath)
    const cloudDocument = await uploadFileOnCloudinary(documentLocalPath)

    const newCourse = await Course.create({
        courseTitle, description, category, price,
        createdBy: uploader.fullName,
        poster: {
            public_id: cloudPoster.public_id,
            url: cloudPoster.secure_url
        },
        document: {
            public_id: cloudDocument.public_id,
            url: cloudDocument.secure_url
        }
    })



    uploader.uploadedCourses.push({
        courseId: newCourse._id,
        courseTitle: newCourse.courseTitle
    });

    await uploader.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200,
            {
                course: newCourse
            }
            , "course added")
    )
})

export const getCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.params
    if (!courseId) {
        throw new ApiError(400, "Provide Course Id")
    }
    const course = await Course.findById(courseId)
    if (!course) {
        throw new ApiError(404, "Course with provided Id does not exists")
    }
    return res.status(200).json(
        new ApiResponse(200, {
            course: course
        }, "Course fetched successfully")
    )
})



export const deleteCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.params
    if (!courseId) {
        throw new ApiError(400, "Provide Course Id")
    }
    const uploaderId = req.uploader?._id
    const uploader = await Uploader.findById(uploaderId)
    const isCourseExist = await uploader.uploadedCourses.some((course) => course.courseId.toString() === courseId.toString())
    if (!isCourseExist) {
        throw new ApiError(404, "course is not in your uploaded courses or invalid course id")
    }
    uploader.uploadedCourses = await uploader.uploadedCourses.filter(course => course.courseId.toString() !== courseId.toString());
    await uploader.save()

    // const uploaders = await Uploader.find({ 'uploadedCourses.courseId': courseId });
    // await Promise.all(uploaders.map(async (uploader) => {
    //     uploader.uploadedCourses = uploader.uploadedCourses.filter(course => course.courseId.toString() !== courseId.toString());
    //     await uploader.save();
    // }));

    //TODO-delete from all users also
    //const users = await User.find({ 'optedCourses.courseId': courseId });
    // await Promise.all(users.map(async (user) => {
    //     user.optedCourses = user.optedCourses.filter(course => course.courseId.toString() !== courseId.toString());
    //     await user.save();
    // }));

    //delete cloudinary files from cloud(videos,poster,document)
    const course = await Course.findById(courseId)
    deleteImageOnCloudinary(course.poster.public_id)
    deleteDocOnCloudinary(course.document.public_id)
    for(let i = 0;i<course.lectures.length;i++){
        const singleLecture = course.lectures[i]
        deleteVideoOnCloudinary(singleLecture.video.public_id)
    }

    await Course.findByIdAndDelete(courseId);

    return res.status(200).json(
        new ApiResponse(200, null, "course deleted successfully")
    )

})

export const editCourse = asyncHandler(async (req, res) => {
    const { courseTitle, price, description } = req.body

    //     if (!fullName) {
    //         throw new ApiError(400, "full name required")
    //     }

    //     const user = await User.findByIdAndUpdate(
    //         req.user?._id,
    //         {
    //             $set: {
    //                 fullName : fullName,
    //                 email: email
    //             }
    //         },
    //         {new: true}

    //     ).select("-password")

    //     return res
    //     .status(200)
    //     .json(new ApiResponse(200, user, "Account details updated successfully"))
})


//lectures API

export const addLecture = asyncHandler(async (req, res) => {
    const { courseId } = req.params
    const { title, description } = req.body

    const videoLocalPath = req.file?.path;

    if (!videoLocalPath) {
        throw new ApiError(400, "video required")
    }

    const cloudVideo = await uploadFileOnCloudinary(videoLocalPath)

    const course = await Course.findById(courseId);
    course.lectures.push({
        title,
        description,
        video: {
            public_id: cloudVideo.public_id,
            url: cloudVideo.secure_url
        }
    })
    course.numOfVideos = course.lectures.length
    await course.save({validateBeforeSave : false})

    return res.status(200).json(
        new ApiResponse(200,
            {
                video: {
                    public_id: cloudVideo.public_id,
                    url: cloudVideo.secure_url
                }
            },
            "Lecture Added Successfully"
        )
    )
})

export const deleteLecture = asyncHandler(async (req, res) => {
    const {courseId,lectureId} = req.query;
    const course = await Course.findById(courseId);

    if(!course){
        throw new ApiError("Course no found")
    }

    const lecture = course.lectures.find((lecture)=>lecture._id.toString()===lectureId.toString())
    
    if(!lecture){
        throw new ApiError(404,"Lecture not found")
    }

    deleteVideoOnCloudinary(lecture.video.public_id)

    course.lectures = course.lectures.filter((lecture)=>lecture._id.toString()!==lectureId.toString())

    course.numOfVideos = course.lectures.length
    await course.save({validateBeforeSave : false})

    return res.status(200).json(
        new ApiResponse(200,null,"Lecture deleted Successfully")
    )
})

export const editLecture = asyncHandler(async (req, res) => {

})







