import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import morgan from "morgan"

const app = express()
app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true
}))

app.use(express.json({limit : "20kb"}))
app.use(express.urlencoded({extended:true,limit : "20kb"}))
app.use(express.static("public"))
app.use(cookieParser())
app.use(morgan("dev"))

//import routes
import userRouter from "./routes/userRoutes/user.routes.js"
import uploaderRouter from "./routes/uploaderRoutes/uploader.routes.js"

//routes declaration
app.use("/api/v1/user",userRouter)
app.use("/api/v1/uploader",uploaderRouter)


export { app }