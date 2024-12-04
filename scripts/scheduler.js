const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

// Ensure the logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

const logStream = fs.createWriteStream(path.join(logsDir, 'scheduler.log'), { flags: 'a' });

// Log function defined outside the main function
function log(message) {
    const timestamp = new Date().toISOString();
    logStream.write(`[${timestamp}] ${message}\n`);
} 

// Function to update expired products
async function updateExpiredProducts() {
    const connection = await pool.getConnection();
    let result;
    try {
        await connection.beginTransaction();

        // Get 'Pupuk' category ID
        const [pupukCategory] = await connection.query(
            "SELECT id FROM categories WHERE name = 'Pupuk' LIMIT 1"
        );

        if (!pupukCategory.length) {
            throw new Error("Category 'Pupuk' not found");
        }

        const pupukCategoryId = pupukCategory[0].id;
        const currentDate = new Date();

        // Update expired products EXCEPT those already in Pupuk category
        [result] = await connection.query(
            `
            UPDATE products 
            SET is_active = 0, category_id = ?, updated_at = NOW()
            WHERE expired <= ? 
            AND is_active = 1
            AND category_id != ?  /* Add this condition */
            `,
            [pupukCategoryId, currentDate, pupukCategoryId]
        );

        await connection.commit();

        const message = `${result.affectedRows} products updated due to expiration.`;
        console.log(message);
        log(message);
    } catch (error) {
        await connection.rollback();
        const errorMessage = 'Error updating expired products: ' + error.message;
        console.error(errorMessage);
        log(errorMessage);
    } finally {
        connection.release();
    }
}

module.exports = updateExpiredProducts;