const pool = require('../config/database');
const slugify = require('slugify');

const usersController = {
    // Get all users with pagination
    getAll: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const [users] = await pool.query(`
                SELECT * FROM users
                LIMIT ? OFFSET ?
            `, [limit, offset]);

            const [total] = await pool.query('SELECT COUNT(*) as count FROM users');

            res.json({
                success: true,
                data: users,
                pagination: {
                    page,
                    limit,
                    total: total[0].count
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Create user
    create: async (req, res) => {
        try {
            const { 
                name, 
                email, 
                password, 
                role 
            } = req.body;

            const slug = slugify(name, { lower: true });

            await pool.query(`
                INSERT INTO users 
                (name, email, password, role) 
                VALUES (?, ?, ?, ?)
            `, [name, email, password, role]);

            res.status(201).json({ success: true, message: 'User created successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Update user
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                name, 
                email, 
                password, 
                role 
            } = req.body;

            await pool.query(`
                UPDATE users 
                SET name = ?, email = ?, password = ?, role = ?
                WHERE id = ?
            `, [name, email, password, role, id]);

            res.json({ success: true, message: 'User updated successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get user by id - detail user
    getById: async (req, res) => {
        try {
            const { id } = req.params;

            const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);

            res.json({ success: true, data: user[0] });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Delete user
    delete: async (req, res) => {
        try {
            const { id } = req.params;

            await pool.query('DELETE FROM users WHERE id = ?', [id]);

            res.json({ success: true, message: 'User deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = { usersController }