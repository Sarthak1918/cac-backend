import { Router } from "express";
import { upload } from "../../middlewares/multer.middleware.js";
import { addLecture, createCourse, deleteCourse, deleteLecture, editCourse, getCourse, getCurrentUploader, loginUploader, logoutUploader, registerUploader } from "../../controllers/uploader.controller.js";
import { verifyUploaderJWT } from "../../middlewares/auth.middleware.js";
import { isUploader } from "../../middlewares/isUploader.middleware.js";
const router = Router()


router.route("/register").post(
    upload.single("avatar"),
    registerUploader
)
router.route("/login").post(loginUploader)
router.route("/logout").get(verifyUploaderJWT, logoutUploader)
router.route("/current-uploader").get(verifyUploaderJWT, getCurrentUploader)


router.route("/create-course").post(verifyUploaderJWT, isUploader, upload.fields([
    {
        name: "poster",
        maxCount: 1
    },
    {
        name: "document",
        maxCount: 1
    }
]), createCourse)
router.route("/course/:courseId").get(verifyUploaderJWT, getCourse)
router.route("/edit-course/:courseId").put(verifyUploaderJWT, isUploader, editCourse)
router.route("/delete-course/:courseId").delete(verifyUploaderJWT, isUploader, deleteCourse)


router.route("/add-lecture/:courseId").post(verifyUploaderJWT, isUploader,
    upload.single("video"),
    addLecture)
router.route("/delete-lecture").delete(verifyUploaderJWT, isUploader, deleteLecture)



export default router