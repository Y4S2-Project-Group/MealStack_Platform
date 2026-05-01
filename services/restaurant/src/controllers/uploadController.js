'use strict';

const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const { uploadImage, deleteImage } = require('../services/uploadService');
const { sendSuccess, sendError } = require('../../../../shared/utils/apiResponse');
const logger = require('../../../../shared/utils/logger');

/**
 * Upload restaurant image
 * POST /restaurants/:id/upload-image
 */
async function uploadRestaurantImage(req, res, next) {
  try {
    if (!req.file) {
      return sendError(res, req, {
        status: 400,
        code: 'NO_FILE',
        message: 'No image file provided',
      });
    }

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return sendError(res, req, {
        status: 404,
        code: 'RESTAURANT_NOT_FOUND',
        message: 'Restaurant not found',
      });
    }

    // Check authorization
    if (req.user?.role !== 'restaurantAdmin' || 
        (restaurant.ownerUserId && restaurant.ownerUserId !== req.user.userId)) {
      return sendError(res, req, {
        status: 403,
        code: 'FORBIDDEN',
        message: 'You are not allowed to modify this restaurant',
      });
    }

    // Upload to Cloudinary
    const result = await uploadImage(
      req.file.buffer,
      'mealstack/restaurants',
      `restaurant_${restaurant._id}`
    );

    // Update restaurant with new image URL
    restaurant.imageUrl = result.url;
    await restaurant.save();

    logger.info('[uploadController] Restaurant image uploaded', {
      restaurantId: restaurant._id,
      imageUrl: result.url,
    });

    return sendSuccess(res, req, {
      status: 200,
      message: 'Restaurant image uploaded successfully',
      data: { imageUrl: result.url },
      legacy: { imageUrl: result.url },
    });
  } catch (error) {
    logger.error('[uploadController] Restaurant image upload failed', {
      error: error.message,
      restaurantId: req.params.id,
    });
    next(error);
  }
}

/**
 * Upload menu item image
 * POST /restaurants/:id/menu/items/:itemId/upload-image
 */
async function uploadMenuItemImage(req, res, next) {
  try {
    if (!req.file) {
      return sendError(res, req, {
        status: 400,
        code: 'NO_FILE',
        message: 'No image file provided',
      });
    }

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return sendError(res, req, {
        status: 404,
        code: 'RESTAURANT_NOT_FOUND',
        message: 'Restaurant not found',
      });
    }

    // Check authorization
    if (req.user?.role !== 'restaurantAdmin' || 
        (restaurant.ownerUserId && restaurant.ownerUserId !== req.user.userId)) {
      return sendError(res, req, {
        status: 403,
        code: 'FORBIDDEN',
        message: 'You are not allowed to modify this restaurant',
      });
    }

    const menuItem = await MenuItem.findOne({
      _id: req.params.itemId,
      restaurantId: restaurant._id,
    });

    if (!menuItem) {
      return sendError(res, req, {
        status: 404,
        code: 'MENU_ITEM_NOT_FOUND',
        message: 'Menu item not found',
      });
    }

    // Upload to Cloudinary
    const result = await uploadImage(
      req.file.buffer,
      'mealstack/menu-items',
      `menu_item_${menuItem._id}`
    );

    // Update menu item with new image URL
    menuItem.imageUrl = result.url;
    await menuItem.save();

    logger.info('[uploadController] Menu item image uploaded', {
      menuItemId: menuItem._id,
      restaurantId: restaurant._id,
      imageUrl: result.url,
    });

    return sendSuccess(res, req, {
      status: 200,
      message: 'Menu item image uploaded successfully',
      data: { imageUrl: result.url },
      legacy: { imageUrl: result.url },
    });
  } catch (error) {
    logger.error('[uploadController] Menu item image upload failed', {
      error: error.message,
      restaurantId: req.params.id,
      itemId: req.params.itemId,
    });
    next(error);
  }
}

/**
 * Delete restaurant image
 * DELETE /restaurants/:id/image
 */
async function deleteRestaurantImage(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return sendError(res, req, {
        status: 404,
        code: 'RESTAURANT_NOT_FOUND',
        message: 'Restaurant not found',
      });
    }

    // Check authorization
    if (req.user?.role !== 'restaurantAdmin' || 
        (restaurant.ownerUserId && restaurant.ownerUserId !== req.user.userId)) {
      return sendError(res, req, {
        status: 403,
        code: 'FORBIDDEN',
        message: 'You are not allowed to modify this restaurant',
      });
    }

    // Delete from Cloudinary
    if (restaurant.imageUrl) {
      await deleteImage(`restaurant_${restaurant._id}`);
    }

    // Clear image URL
    restaurant.imageUrl = '';
    await restaurant.save();

    logger.info('[uploadController] Restaurant image deleted', {
      restaurantId: restaurant._id,
    });

    return sendSuccess(res, req, {
      status: 200,
      message: 'Restaurant image deleted successfully',
      data: {},
      legacy: {},
    });
  } catch (error) {
    logger.error('[uploadController] Restaurant image delete failed', {
      error: error.message,
      restaurantId: req.params.id,
    });
    next(error);
  }
}

/**
 * Delete menu item image
 * DELETE /restaurants/:id/menu/items/:itemId/image
 */
async function deleteMenuItemImage(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return sendError(res, req, {
        status: 404,
        code: 'RESTAURANT_NOT_FOUND',
        message: 'Restaurant not found',
      });
    }

    // Check authorization
    if (req.user?.role !== 'restaurantAdmin' || 
        (restaurant.ownerUserId && restaurant.ownerUserId !== req.user.userId)) {
      return sendError(res, req, {
        status: 403,
        code: 'FORBIDDEN',
        message: 'You are not allowed to modify this restaurant',
      });
    }

    const menuItem = await MenuItem.findOne({
      _id: req.params.itemId,
      restaurantId: restaurant._id,
    });

    if (!menuItem) {
      return sendError(res, req, {
        status: 404,
        code: 'MENU_ITEM_NOT_FOUND',
        message: 'Menu item not found',
      });
    }

    // Delete from Cloudinary
    if (menuItem.imageUrl) {
      await deleteImage(`menu_item_${menuItem._id}`);
    }

    // Clear image URL
    menuItem.imageUrl = '';
    await menuItem.save();

    logger.info('[uploadController] Menu item image deleted', {
      menuItemId: menuItem._id,
      restaurantId: restaurant._id,
    });

    return sendSuccess(res, req, {
      status: 200,
      message: 'Menu item image deleted successfully',
      data: {},
      legacy: {},
    });
  } catch (error) {
    logger.error('[uploadController] Menu item image delete failed', {
      error: error.message,
      restaurantId: req.params.id,
      itemId: req.params.itemId,
    });
    next(error);
  }
}

module.exports = {
  uploadRestaurantImage,
  uploadMenuItemImage,
  deleteRestaurantImage,
  deleteMenuItemImage,
};
