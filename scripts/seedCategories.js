const Category = require('../models/v1/Category');

const seedCategories = async () => {
  try {
    console.log('🌱 Starting category seed data...');
    
    // Check if categories already exist
    const existingCategories = await Category.countDocuments();
    if (existingCategories > 0) {
      console.log(`✅ Categories already exist (${existingCategories} found). Skipping seed.`);
      return;
    }

    const categories = [
      {
        name: 'Fitness',
        description: 'Physical health and exercise habits',
        icon: 'fitness',
        color: '#FF6B6B',
        sortOrder: 1
      },
      {
        name: 'Study',
        description: 'Learning and educational habits',
        icon: 'book',
        color: '#4ECDC4',
        sortOrder: 2
      },
      {
        name: 'Health',
        description: 'Mental and physical wellness habits',
        icon: 'heart',
        color: '#45B7D1',
        sortOrder: 3
      },
      {
        name: 'Productivity',
        description: 'Work and efficiency habits',
        icon: 'briefcase',
        color: '#96CEB4',
        sortOrder: 4
      },
      {
        name: 'Social',
        description: 'Relationships and social habits',
        icon: 'people',
        color: '#FFEAA7',
        sortOrder: 5
      },
      {
        name: 'Creative',
        description: 'Artistic and creative habits',
        icon: 'brush',
        color: '#DDA0DD',
        sortOrder: 6
      },
      {
        name: 'Mindfulness',
        description: 'Meditation and mindfulness habits',
        icon: 'leaf',
        color: '#98D8C8',
        sortOrder: 7
      },
      {
        name: 'Finance',
        description: 'Money management habits',
        icon: 'card',
        color: '#F7DC6F',
        sortOrder: 8
      }
    ];

    await Category.insertMany(categories);
    console.log(`✅ Successfully seeded ${categories.length} categories`);
    
  } catch (error) {
    console.error('❌ Error seeding categories:', error.message);
    throw error;
  }
};

module.exports = { seedCategories };
