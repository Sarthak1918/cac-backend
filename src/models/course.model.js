import mongoose, { Schema } from "mongoose"

const courseSchema = new Schema({
    courseTitle : {
        type : String,//Cloudinary url
        required : true,
    },
    thumbnail : {
        type : String,//Cloudinary url
        required : true,
    },
    description : {
        type : String,
        required : true
    },
    isPublished  : {
        type : Boolean,
        default : true
    },
    owner : { //uploader
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
    },
    videos : [
        {
            type : mongoose.Schema.Types.ObjectId,
            ref : "Video"
        }
    ],
    document :{
            type : String, //url of the document
        }
    
},{timestamps : true})


export const Course = mongoose.model("Course",courseSchema)