import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../../controllers/user.controller.js";
import { upload } from "../../middlewares/multer.middleware.js";
import { verifyUserJWT } from "../../middlewares/auth.middleware.js";


const router = Router()

router.route("/register").post(
    upload.single("avatar"),
    registerUser
)
router.route("/login").post(loginUser)

router.route("/logout").get(verifyUserJWT,logoutUser)
router.route("/refresh-token").get(refreshAccessToken)

export default router