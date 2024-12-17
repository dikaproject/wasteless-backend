// scheduleTask.js

const schedule = require('node-schedule');
const updateExpiredProducts = require('./scheduler');

// Schedule the task to run every day at midnight
schedule.scheduleJob('0 0 * * *', () => {
    updateExpiredProducts();
});