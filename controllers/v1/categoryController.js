const Category = require('../../models/v1/Category');

// Get all active categories
exports.getCategories = async (req, res) => {
  console.log('📂 Get Categories API hit');
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select('name description icon color sortOrder');

    console.log(`✅ Found ${categories.length} active categories`);
    
    res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      data: categories,
      count: categories.length
    });
  } catch (err) {
    console.error('❌ Get categories failed:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve categories',
      message: err.message
    });
  }
};

// Get single category by ID
exports.getCategoryById = async (req, res) => {
  console.log('📂 Get Category by ID API hit:', req.params.id);
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Category ID is required'
      });
    }

    const category = await Category.findOne({ 
      _id: id, 
      isActive: true 
    }).select('name description icon color sortOrder');

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    console.log(`✅ Category found: ${category.name}`);
    
    res.status(200).json({
      success: true,
      message: 'Category retrieved successfully',
      data: category
    });
  } catch (err) {
    console.error('❌ Get category by ID failed:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve category',
      message: err.message
    });
  }
};
