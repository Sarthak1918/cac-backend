import multer from "multer"


const storage = multer.diskStorage({ //this method will return path
    destination: function (req, file, cb) {
      return cb(null, 'D:/GitHub/cac-backend/public/temp')
    },
    filename: function (req, file, cb) {
    
      return cb(null, `${Date.now()}-${file.originalname}`)
    }
  })
  
  export const upload = multer({ storage: storage })