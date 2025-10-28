const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const config = require('./config');
const { seedCategories } = require('./scripts/seedCategories');

// Load env vars
dotenv.config();

const app = express();

// Enable CORS for all origins and methods
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));

app.use(express.json());

// Connect to MongoDB
connectDB();

// Seed categories on startup
seedCategories().catch(err => {
  console.error('❌ Failed to seed categories:', err.message);
});

// Routes
app.use('/v1/auth', require('./routes/v1/authRoutes'));
app.use('/v1/categories', require('./routes/v1/categoryRoutes'));
app.use('/v1/territories', require('./routes/v1/territoryRoutes'));

const PORT = config.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
