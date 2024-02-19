import mongoose, { Schema } from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const  userSchema = new Schema({
    username : {
        type : String,
        required : true,
        unique : true,
        trim : true,
        index : true
    },
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
    avatar : {
        type : String, //cloudinary url
        required : true
    },
    coverImage : {
        type : String
    },
    watchHistory : [
        {
            type : mongoose.Schema.Types.ObjectId,
            ref : "Video"
        }
    ],
    password : {
        type : String,
        required : [true,"Password is required"]
    },
    refreshToken:{
        type : String
    },
    isInstructor : {
        type : Boolean,
        default : false
    }
},{timestamps:true})


    mongoose.pre("save",async function(next){
        if(!this.isModified("password")) return next()
        this.password = await bcrypt.hash(this.password,8)
        next()
    })


    //jwt is bearer token means when any user(person) sent this token we accept him/her as user and we send data
    userSchema.methods.isPasswordCorrect = async function(password){
       return await bcrypt.compare(password,this.password)
    }
    userSchema.methods.generateAccessToken = function(){
       return jwt.sign(
        {
        _id : this._id,
        email : this.email,
        username : this.username,
        fullName : this.fullName
       },
       process.env.ACCESS_TOKEN_SECRET,
       {
        expiresIn : process.env.ACCESS_TOKEN_EXPIRY
       }
       )
    }
    userSchema.methods.generateRefreshToken = function(){
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
   


export const User = mongoose.model("User",userSchema);
