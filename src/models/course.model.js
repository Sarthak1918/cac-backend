import mongoose, { Schema } from "mongoose"

const courseSchema = new Schema({
    courseTitle: {
        type: String,//Cloudinary url
        required: true,
    },
    description: {
        type: String,
        required: true
    },
    price : {
        type : Number,
        required :true
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    lectures: [
        {
            title: {
                type: String,
                required: true
            },
            description: {
                type: String,
                required: true
            },
            video: {
                public_id: {
                    type: String,
                    required: true
                },
                url: {
                    type: String,
                    required: true
                }
            }
        }
    ],
    poster: {
        public_id: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        }
    },
    numOfVideos : {
        type : Number,
        default : 0
    },
    category : {
        type : String,
        required : true
    },
    createdBy:{
        type :String,
        required : [true,"Enter Uploader Name"]
    },

    document: {
        public_id: {
            type: String,
        },
        url: {
            type: String,
        }
    }

}, { timestamps: true })


export const Course = mongoose.model("Course", courseSchema)