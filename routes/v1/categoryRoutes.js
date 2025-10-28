const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/v1/categoryController');

// GET /v1/categories - Get all active categories
router.get('/', categoryController.getCategories);

// GET /v1/categories/:id - Get single category by ID
router.get('/:id', categoryController.getCategoryById);

module.exports = router;
