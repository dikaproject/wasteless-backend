const pool = require('../config/database');
const slugify = require('slugify');

const categoryController = {
    // Get all categories
    getAll: async (req, res) => {
        try {
            const [categories] = await pool.query('SELECT * FROM categories');
            res.json({ success: true, data: categories });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Create category
    create: async (req, res) => {
        try {
            const { name } = req.body;
            const slug = slugify(name, { lower: true });
            await pool.query('INSERT INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
            res.status(201).json({ success: true, message: 'Category created successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Update category
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { name } = req.body;
            const slug = slugify(name, { lower: true });
            await pool.query('UPDATE categories SET name = ?, slug = ? WHERE id = ?', [name, slug, id]);
            res.json({ success: true, message: 'Category updated successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    //  Get detail category
    getDetail: async (req, res) => {
        try {
            const { id } = req.params;
            const [category] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
            res.json({ success: true, data: category });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Delete category
    delete: async (req, res) => {
        try {
            const { id } = req.params;
            await pool.query('DELETE FROM categories WHERE id = ?', [id]);
            res.json({ success: true, message: 'Category deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};


module.exports = { categoryController };