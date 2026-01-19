const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { pool } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic test route
app.get('/', (req, res) => {
    res.send('Cotton Mill Contract System API is running.');
});

// Routes
// Routes
const authRoutes = require('./routes/auth.routes');
const vendorRoutes = require('./routes/vendor.routes');
const contractRoutes = require('./routes/contract.routes');
const uploadRoutes = require('./routes/upload.routes');
const path = require('path');

// Serve Static Uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', authRoutes);
app.use('/api', vendorRoutes);
app.use('/api', contractRoutes);
app.use('/api/upload', uploadRoutes);

app.listen(PORT, () => {
    console.log("=================================");
    console.log(`SERVER STARTED ON PORT ${PORT}`);
    console.log("=================================");
});
