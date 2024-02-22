import { Router } from "express";
import { upload } from "../../middlewares/multer.middleware.js";
import { loginUploader, logoutUploader, registerUploader } from "../../controllers/uploader.controller.js";
import { verifyUploaderJWT } from "../../middlewares/auth.middleware.js";
const router = Router()


router.route("/register").post(
    upload.single("avatar"),
    registerUploader
)
router.route("/login").post(loginUploader)
router.route("/logout").get(verifyUploaderJWT,logoutUploader)


export default router