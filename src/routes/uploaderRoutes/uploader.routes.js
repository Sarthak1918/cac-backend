import { Router } from "express";
import { upload } from "../../middlewares/multer.middleware.js";
import { createCourse, loginUploader, logoutUploader, registerUploader } from "../../controllers/uploader.controller.js";
import { verifyUploaderJWT } from "../../middlewares/auth.middleware.js";
import { isUploader } from "../../middlewares/isUploader.middleware.js";
const router = Router()


router.route("/register").post(
    upload.single("avatar"),
    registerUploader
)
router.route("/login").post(loginUploader)
router.route("/logout").get(verifyUploaderJWT,logoutUploader)
router.route("/create-course").post(createCourse)


export default router