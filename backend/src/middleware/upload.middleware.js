const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads/';
    if (file.fieldname === 'photo') {
      folder += 'profiles/';
    } else {
      folder += 'documents/';
    }
    
    // Ensure directory exists
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|webp/;
  const allowedDocTypes = /pdf|doc|docx|jpeg|jpg|png/;

  const extname = path.extname(file.originalname).toLowerCase();

  if (file.fieldname === 'photo') {
    if (allowedImageTypes.test(extname)) {
      return cb(null, true);
    }
    return cb(new Error('Only images are allowed for profile photos'), false);
  } else {
    if (allowedDocTypes.test(extname)) {
      return cb(null, true);
    }
    return cb(new Error('Invalid file type for document'), false);
  }
};

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter 
});

module.exports = upload;
