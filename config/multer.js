// config/multer.js
const multer = require('multer');
const path = require('path');

// Define storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = './uploads';
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to accept only images
const fileFilter = function (req, file, cb) {
  const ext = path.extname(file.originalname);
  if (!['.png', '.jpg', '.jpeg'].includes(ext.toLowerCase())) {
    return cb(new Error('Only images are allowed'));
  }
  cb(null, true);
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

module.exports = upload;