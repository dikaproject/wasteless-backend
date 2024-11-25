const express = require('express');
const cors = require('cors');
require('dotenv').config();
const schedule = require('node-schedule');
const { updateExpiredProducts } = require('./scripts/scheduler');

const app = express();

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/uploads', express.static('uploads'));

// routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/seller', require('./routes/sellerRoutes'));

schedule.scheduleJob('0 0 * * *', () => {
    updateExpiredProducts();
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    });