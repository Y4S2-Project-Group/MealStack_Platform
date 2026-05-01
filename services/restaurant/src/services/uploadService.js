'use strict';

const cloudinary = require('../config/cloudinary');
const logger = require('../../../../shared/utils/logger');

/**
 * Upload image to Cloudinary
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} folder - Cloudinary folder name (e.g., 'restaurants', 'menu-items')
 * @param {string} publicId - Optional public ID for the image
 * @returns {Promise<{url: string, publicId: string}>} Cloudinary upload result
 */
async function uploadImage(fileBuffer, folder = 'mealstack', publicId = null) {
  try {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
          { width: 800, height: 800, crop: 'limit' }, // Max size limit
          { quality: 'auto:good' }, // Auto optimize quality
          { fetch_format: 'auto' }, // Auto format (webp if supported)
        ],
      };

      if (publicId) {
        uploadOptions.public_id = publicId;
        uploadOptions.overwrite = true;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            logger.error('[uploadService] Cloudinary upload failed', { error: error.message });
            return reject(new Error(`Image upload failed: ${error.message}`));
          }
          
          logger.info('[uploadService] Image uploaded successfully', { 
            url: result.secure_url, 
            publicId: result.public_id 
          });
          
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );

      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    logger.error('[uploadService] Upload error', { error: error.message });
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<void>}
 */
async function deleteImage(publicId) {
  try {
    if (!publicId) return;
    
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info('[uploadService] Image deleted', { publicId, result });
  } catch (error) {
    logger.error('[uploadService] Delete error', { error: error.message, publicId });
    // Don't throw - deletion failure shouldn't block other operations
  }
}

module.exports = {
  uploadImage,
  deleteImage,
};
