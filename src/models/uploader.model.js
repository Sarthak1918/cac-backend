import mongoose, { Schema } from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const uploaderSchema = new Schema({
    email : {
        type : String,
        required : true,
        unique : true,
    },
    fullName : {
        type : String,
        required : true,
        trim : true,
        index : true
    },
    password : {
        type : String,
        required : [true,"Password is required"]
    },
    avatar : {
        type : String,
        required : true
    },
    refreshToken:{
        type : String
    },
    isInstructor : {
        type : Boolean,
        default : true
    },
    uploadedCourses : [
        {
            type : mongoose.Schema.Types.ObjectId,
            ref : "Course"
        }
    ]
},{timestamps:true})


uploaderSchema.pre("save", async function(next){
        if(!this.isModified("password")) return next()
        this.password = await bcrypt.hash(this.password,8)
        next()
    })


    //jwt is bearer token means when any user(person) sent this token we accept him/her as user and we send data
    uploaderSchema.methods.isPasswordCorrect = async function(password){
       return await bcrypt.compare(password,this.password)
    }
    uploaderSchema.methods.generateAccessToken = function(){
       return jwt.sign(
        {
        _id : this._id,
        email : this.email,
        fullName : this.fullName
       },
       process.env.ACCESS_TOKEN_SECRET,
       {
        expiresIn : process.env.ACCESS_TOKEN_EXPIRY
       }
       )
    }
    uploaderSchema.methods.generateRefreshToken = function(){
       return jwt.sign(
        {
        _id : this._id
       },
       process.env.REFRESH_TOKEN_SECRET,
       {
        expiresIn : process.env.REFRESH_TOKEN_EXPIRY
       }
       )
    }
   


export const Uploader = mongoose.model("Uploader",uploaderSchema);
