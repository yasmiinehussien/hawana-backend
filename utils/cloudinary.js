// backend/utils/cloudinary.js
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// ✅ 1. Configure Cloudinary
cloudinary.config({
  cloud_name: "dqxzwf8nm", // your Cloud name from Cloudinary
  api_key: "344217995167538", // your API key from Cloudinary
  api_secret: "H_2_u2CXn4KYkowHy7_5hwpWlMg", // your API secret from Cloudinary
});

// ✅ 2. Setup Multer Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "hawana_categories", // Folder name in your Cloudinary media library
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

// ✅ 3. Export the configured uploader
const upload = multer({ storage });

module.exports = upload;
