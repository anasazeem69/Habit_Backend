const Territory = require('../../models/v1/Territory');
const Category = require('../../models/v1/Category');

// Get territories by category and location
exports.getTerritories = async (req, res) => {
  console.log('🗺️ Get Territories API hit');
  try {
    const { categoryId, latitude, longitude, radius = 0.01 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    // Build query
    const query = {
      coordinates: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      },
      isActive: true
    };

    // Add category filter if provided
    if (categoryId) {
      query.categoryId = categoryId;
    }

    const territories = await Territory.find(query)
      .populate('categoryId', 'name color icon')
      .populate('claimedBy', 'fullName email')
      .limit(50)
      .sort({ lastActivity: -1 });

    console.log(`✅ Found ${territories.length} territories`);

    res.status(200).json({
      success: true,
      message: 'Territories retrieved successfully',
      data: territories,
      count: territories.length
    });
  } catch (err) {
    console.error('❌ Get territories failed:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve territories',
      message: err.message
    });
  }
};

// Get territory by cell ID
exports.getTerritoryByCellId = async (req, res) => {
  console.log('🗺️ Get Territory by Cell ID API hit:', req.params.cellId);
  try {
    const { cellId } = req.params;

    const territory = await Territory.findOne({ cellId })
      .populate('categoryId', 'name color icon')
      .populate('claimedBy', 'fullName email');

    if (!territory) {
      return res.status(404).json({
        success: false,
        error: 'Territory not found'
      });
    }

    console.log(`✅ Found territory: ${territory.cellId}`);

    res.status(200).json({
      success: true,
      message: 'Territory retrieved successfully',
      data: territory
    });
  } catch (err) {
    console.error('❌ Get territory by cell ID failed:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve territory',
      message: err.message
    });
  }
};

// Claim a territory
exports.claimTerritory = async (req, res) => {
  console.log('🏴 Claim Territory API hit');
  try {
    const { cellId, categoryId, userId, latitude, longitude } = req.body;

    if (!cellId || !categoryId || !userId || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Check if territory already exists
    let territory = await Territory.findOne({ cellId });

    if (territory) {
      if (territory.status === 'claimed' && territory.claimedBy.toString() !== userId) {
        return res.status(409).json({
          success: false,
          error: 'Territory already claimed by another user'
        });
      }
      
      // Update existing territory
      territory.status = 'claimed';
      territory.claimedBy = userId;
      territory.claimDate = new Date();
      territory.lastActivity = new Date();
      territory.activityCount += 1;
      // Update coordinates to GeoJSON format
      territory.coordinates = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    } else {
      // Create new territory
      territory = new Territory({
        cellId,
        categoryId,
        claimedBy: userId,
        status: 'claimed',
        claimDate: new Date(),
        lastActivity: new Date(),
        activityCount: 1,
        coordinates: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        }
      });
    }

    await territory.save();

    // Populate the response
    await territory.populate('categoryId', 'name color icon');
    await territory.populate('claimedBy', 'fullName email');

    console.log(`✅ Territory ${cellId} claimed successfully`);

    res.status(200).json({
      success: true,
      message: 'Territory claimed successfully',
      data: territory
    });
  } catch (err) {
    console.error('❌ Claim territory failed:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to claim territory',
      message: err.message
    });
  }
};

// Release a territory
exports.releaseTerritory = async (req, res) => {
  console.log('🏴 Release Territory API hit');
  try {
    const { cellId, userId } = req.body;

    if (!cellId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Cell ID and User ID are required'
      });
    }

    const territory = await Territory.findOne({ cellId });

    if (!territory) {
      return res.status(404).json({
        success: false,
        error: 'Territory not found'
      });
    }

    if (territory.claimedBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only release territories you have claimed'
      });
    }

    // Release the territory
    territory.status = 'unclaimed';
    territory.claimedBy = null;
    territory.claimDate = null;
    territory.lastActivity = new Date();

    await territory.save();

    console.log(`✅ Territory ${cellId} released successfully`);

    res.status(200).json({
      success: true,
      message: 'Territory released successfully',
      data: territory
    });
  } catch (err) {
    console.error('❌ Release territory failed:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to release territory',
      message: err.message
    });
  }
};

// Update territory activity
exports.updateActivity = async (req, res) => {
  console.log('📊 Update Territory Activity API hit');
  try {
    const { cellId, userId } = req.body;

    if (!cellId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Cell ID and User ID are required'
      });
    }

    const territory = await Territory.findOne({ cellId });

    if (!territory) {
      return res.status(404).json({
        success: false,
        error: 'Territory not found'
      });
    }

    // Update activity
    territory.lastActivity = new Date();
    territory.activityCount += 1;

    await territory.save();

    console.log(`✅ Territory ${cellId} activity updated`);

    res.status(200).json({
      success: true,
      message: 'Territory activity updated successfully',
      data: territory
    });
  } catch (err) {
    console.error('❌ Update territory activity failed:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update territory activity',
      message: err.message
    });
  }
};
