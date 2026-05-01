'use strict';

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dseiiqqtb',
  api_key: process.env.CLOUDINARY_API_KEY || '646464617695364',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'Z9k9IJ4AmrJcD0OPvvGit5qnUM8',
});

module.exports = cloudinary;
