const pool = require("../config/database");

const addressController = {
    // Get user's address
    getAddress: async (req, res) => {
        try {
        const userId = req.userData.userId;
        const [addressRows] = await pool.query(
            "SELECT * FROM address WHERE user_id = ?",
            [userId]
        );
    
        if (addressRows.length === 0) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }
    
        res.json({ success: true, data: addressRows[0] });
        } catch (error) {
        console.error('Get address error:', error);
        res.status(500).json({ success: false, message: error.message });
        }
    },
    
    updateAddress: async (req, res) => {
        try {
        const userId = req.userData.userId;
        const { kabupaten, kecamatan, address, code_pos } = req.body;
    
        // Validate required fields
        if (!kabupaten || !kecamatan || !address || !code_pos) {
            return res.status(400).json({
            success: false,
            message: "All address fields are required",
            });
        }
    
        const [existingAddress] = await pool.query(
            "SELECT id FROM address WHERE user_id = ?",
            [userId]
        );
    
        if (existingAddress.length === 0) {
            await pool.query(
            "INSERT INTO address (user_id, kabupaten, kecamatan, address, code_pos) VALUES (?, ?, ?, ?, ?)",
            [userId, kabupaten, kecamatan, address, code_pos]
            );
        } else {
            await pool.query(
            "UPDATE address SET kabupaten = ?, kecamatan = ?, address = ?, code_pos = ? WHERE user_id = ?",
            [kabupaten, kecamatan, address, code_pos, userId]
            );
        }
    
        res.json({ success: true, message: "Address updated successfully" });
        } catch (error) {
        console.error('Update address error:', error);
        res.status(500).json({ success: false, message: error.message });
        }
    },
}

module.exports = { addressController }