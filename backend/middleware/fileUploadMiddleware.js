const multer = require('multer');
const path = require('path');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
];

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Unsupported file extension "${ext}". Allowed: PDF, PNG, JPG, JPEG, WEBP.`), false);
  }

  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    return cb(new Error(`Unsupported MIME type "${mime}". Allowed: PDF, PNG, JPG, JPEG, WEBP.`), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter
});

function handleUploadMiddleware(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          errorCode: 'FILE_TOO_LARGE',
          message: 'File exceeds maximum size of 10MB.'
        });
      }
      return res.status(400).json({
        success: false,
        errorCode: 'UPLOAD_ERROR',
        message: err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_FILE',
        message: err.message
      });
    }
    next();
  });
}

module.exports = {
  handleUploadMiddleware,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE
};
