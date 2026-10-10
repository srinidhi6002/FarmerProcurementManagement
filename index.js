/**
 * Smart Farmer Procurement System - Express API Server
 * Designed for Deployment on Render connected to Neon Cloud PostgreSQL
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware Configuration
app.use(cors({
    origin: '*', // Allows Vercel frontend, local development, and mobile clients
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import API Routes
const healthRoute = require('./routes/health');
const authRoute = require('./routes/auth');
const farmersRoute = require('./routes/farmers');
const centersRoute = require('./routes/centers');
const queueRoute = require('./routes/queue');
const verificationRoute = require('./routes/verification');
const payoutsRoute = require('./routes/payouts');
const adminRoute = require('./routes/admin');

// Mount Routes
app.use('/api/health', healthRoute);
app.use('/api/auth', authRoute);
app.use('/api/farmers', farmersRoute);
app.use('/api/centers', centersRoute);
app.use('/api/queue', queueRoute);
app.use('/api/verification', verificationRoute);
app.use('/api/payouts', payoutsRoute);
app.use('/api/admin', adminRoute);

// Root Welcome Endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Smart Farmer Procurement System REST API',
        status: 'Online',
        documentation: '/api/health',
        render_deployment: 'Ready'
    });
});

// Global 404 Route Handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Start Express Server
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🌾 AgriProcure Express Server Running on Port ${PORT}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
});
