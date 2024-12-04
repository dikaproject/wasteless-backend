const pool = require('../config/database');
const slugify = require('slugify');
const multer = require('multer');
const path = require('path');

// Multer configuration
const storage = multer.diskStorage({
    destination: './uploads/products',
    filename: (req, file, cb) => {
        cb(null, `product-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
}).single('photo');


const productController = {
    // Get all products with pagination
    getAll: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const [products] = await pool.query(`
                SELECT p.*, c.name as category_name 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id 
                LIMIT ? OFFSET ?
            `, [limit, offset]);

            const [total] = await pool.query('SELECT COUNT(*) as count FROM products');

            res.json({
                success: true,
                data: products,
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

    getAllDetailed: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12;
            const offset = (page - 1) * limit;
            const category = req.query.category;
            const province = req.query.province;
            const kabupaten = req.query.kabupaten;
            const kecamatan = req.query.kecamatan;
            const minPrice = parseInt(req.query.minPrice) || 0;
            const maxPrice = parseInt(req.query.maxPrice);
            const showExpired = req.query.showExpired === 'true';
            const onlyDiscounted = req.query.onlyDiscounted === 'true';
            const sort = req.query.sort || 'latest';
    
            let query = `
    SELECT 
        p.*, 
        c.name AS category_name, 
        ph.photo, 
        pr.price, 
        pr.is_discount, 
        pr.discount_percentage, 
        pr.discount_price, 
        pr.start_date, 
        pr.end_date,
        a.province,
        a.kabupaten,
        a.kecamatan,
        a.address,        
        u.name as seller_name,
        p.massa,
        COUNT(*) OVER() as total_count
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN photos ph ON p.photo_id = ph.id
    LEFT JOIN prices pr ON p.id = pr.product_id
    LEFT JOIN users u ON p.seller_id = u.id
    LEFT JOIN address a ON u.id = a.user_id
    WHERE p.is_active = 1
`;
    
            const queryParams = [];
    
            if (category && category !== 'All') {
                query += ` AND c.name = ?`;
                queryParams.push(category);
            }
    
            if (province) {
                query += ` AND a.province = ?`;
                queryParams.push(province);
            }
    
            if (kabupaten) {
                query += ` AND a.kabupaten = ?`;
                queryParams.push(kabupaten);
            }
    
            if (kecamatan) {
                query += ` AND a.kecamatan = ?`;
                queryParams.push(kecamatan);
            }

            if (!showExpired) {
                query += ` AND p.expired > NOW()`;
            }
    
            if (onlyDiscounted) {
                query += ` AND pr.is_discount = 1`;
            }
    
            if (minPrice) {
                query += ` AND (pr.discount_price > ? OR (pr.discount_price IS NULL AND pr.price > ?))`;
                queryParams.push(minPrice, minPrice);
            }
    
            if (maxPrice) {
                query += ` AND (pr.discount_price < ? OR (pr.discount_price IS NULL AND pr.price < ?))`;
                queryParams.push(maxPrice, maxPrice);
            }
    
            // Add sorting
            query += ` ORDER BY `;
        switch (sort) {
            case 'price_asc':
                query += `COALESCE(pr.discount_price, pr.price) ASC`;
                break;
            case 'price_desc':
                query += `COALESCE(pr.discount_price, pr.price) DESC`;
                break;
            default:
                query += `p.created_at DESC`;
        }

        query += ` LIMIT ? OFFSET ?`;
        queryParams.push(limit, offset);

        const [products] = await pool.query(query, queryParams);

        
        const total = products[0]?.total_count || 0;

        res.json({
            success: true,
            data: {
                products: products.map(p => ({
                    ...p,
                    total_count: undefined,
                    seller_name: p.seller_name || 'Unknown Seller',
                    massa: p.massa || 0
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
},

    create: async (req, res) => {
        // Wrap everything in a transaction
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Handle file upload first
            await new Promise((resolve, reject) => {
                upload(req, res, (err) => {
                    if (err) {
                        reject(err);
                    }
                    resolve();
                });
            });

            // Validate required fields
            const { 
                seller_id,
                category_id, 
                name, 
                quantity, 
                massa, 
                expired,
                is_active 
            } = req.body;

            if (!category_id || !name || !quantity || !massa || !expired) {
                throw new Error('Missing required fields');
            }

            const slug = slugify(name, { lower: true });

            // Insert product
            const [productResult] = await connection.query(`
                INSERT INTO products 
                (seller_id, category_id, name, slug, quantity, massa, expired, is_active) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                seller_id,
                category_id, 
                name, 
                slug, 
                quantity, 
                massa, 
                expired, 
                is_active === 'true' || is_active === true ? 1 : 0
            ]);

            const productId = productResult.insertId;

            // If there's a photo, save it
            if (req.file) {
                const [photoResult] = await connection.query(`
                    INSERT INTO photos (product_id, photo)
                    VALUES (?, ?)
                `, [productId, req.file.filename]);

                // Update product with photo_id
                await connection.query(
                    'UPDATE products SET photo_id = ? WHERE id = ?',
                    [photoResult.insertId, productId]
                );
            }

            // create prices for the product
            const prices = JSON.parse(req.body.prices);
            if (prices.length) {
                const priceValues = prices.map(price => `(${productId}, ${price.price}, ${price.is_discount ? 1 : 0}, ${price.discount_percentage || 0}, ${price.discount_price || 0}, ${price.start_date ? `'${price.start_date}'` : null}, ${price.end_date ? `'${price.end_date}'` : null})`).join(',');
                await connection.query(`INSERT INTO prices (product_id, price, is_discount, discount_percentage, discount_price, start_date, end_date) VALUES ${priceValues}`);
            }

            await connection.commit();

            res.status(201).json({ 
                success: true, 
                message: 'Product created successfully',
                data: {
                    id: productId,
                    photo: req.file ? req.file.filename : null
                }
            });

        } catch (error) {
            await connection.rollback();
            
            // Log the error for debugging
            console.error('Product creation error:', error);

            // If file was uploaded but database operation failed, you might want to remove the file
            if (req.file) {
                const fs = require('fs').promises;
                try {
                    await fs.unlink(path.join('./uploads/products', req.file.filename));
                } catch (unlinkError) {
                    console.error('Error removing uploaded file:', unlinkError);
                }
            }

            res.status(500).json({ 
                success: false, 
                message: error.message || 'Error creating product',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        } finally {
            connection.release();
        }
    },

        // Modified getDetail method
    getDetail: async (req, res) => {
        try {
            const { id } = req.params;
    
            const [product] = await pool.query(`
                SELECT p.*, 
                       c.name as category_name, 
                       ph.photo,
                       pr.id as price_id,
                       pr.price,
                       pr.is_discount,
                       pr.discount_percentage,
                       pr.discount_price,
                       pr.start_date,
                       pr.end_date
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id 
                LEFT JOIN photos ph ON p.photo_id = ph.id 
                LEFT JOIN prices pr ON p.id = pr.product_id
                WHERE p.id = ?
                ORDER BY pr.created_at DESC
                LIMIT 1
            `, [id]);
    
            res.json({ success: true, data: product[0] });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
        // Optimized update method
    update: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
    
            const { id } = req.params;
    
            // Get old photo info
            const [oldPhoto] = await connection.query(`
                SELECT ph.id, ph.photo 
                FROM products p
                LEFT JOIN photos ph ON p.photo_id = ph.id
                WHERE p.id = ?
            `, [id]);
    
            // Handle file upload
            await new Promise((resolve, reject) => {
                upload(req, res, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
    
            const {
                category_id,
                name,
                quantity,
                massa,
                expired,
                is_active,
                prices
            } = req.body;
    
            const slug = slugify(name, { lower: true });
    
            // Update product
            await connection.query(`
                UPDATE products 
                SET category_id = ?, 
                    name = ?, 
                    slug = ?, 
                    quantity = ?, 
                    massa = ?, 
                    expired = ?, 
                    is_active = ?
                WHERE id = ?
            `, [category_id, name, slug, quantity, massa, expired, is_active, id]);
    
            // Update photo if provided
            if (req.file) {
                // Insert new photo
                const [photoResult] = await connection.query(`
                    INSERT INTO photos (product_id, photo)
                    VALUES (?, ?)
                `, [id, req.file.filename]);
    
                // Update product's photo_id
                await connection.query(
                    'UPDATE products SET photo_id = ? WHERE id = ?',
                    [photoResult.insertId, id]
                );
    
                // Delete old photo file and record
                if (oldPhoto[0]?.photo) {
                    const fs = require('fs').promises;
                    try {
                        await fs.unlink(path.join('./uploads/products', oldPhoto[0].photo));
                        await connection.query('DELETE FROM photos WHERE id = ?', [oldPhoto[0].id]);
                    } catch (err) {
                        console.error('Error deleting old photo:', err);
                    }
                }
            }
    
            // Update prices
            if (prices) {
                const pricesArray = JSON.parse(prices);
                if (pricesArray.length) {
                    // Delete old prices
                    await connection.query('DELETE FROM prices WHERE product_id = ?', [id]);
    
                    // Insert new prices
                    const priceValues = pricesArray.map(price => 
                        `(${id}, ${price.price}, ${price.is_discount ? 1 : 0}, ${price.discount_percentage || 0}, ${price.discount_price || 0}, ${
                            price.start_date ? `'${price.start_date}'` : null
                        }, ${price.end_date ? `'${price.end_date}'` : null})`
                    ).join(',');
    
                    await connection.query(`
                        INSERT INTO prices 
                        (product_id, price, is_discount, discount_percentage, discount_price, start_date, end_date) 
                        VALUES ${priceValues}
                    `);
                }
            }
    
            await connection.commit();
    
            res.json({ 
                success: true, 
                message: 'Product updated successfully',
                data: {
                    id,
                    photo: req.file ? req.file.filename : null
                }
            });
    
        } catch (error) {
            await connection.rollback();
            if (req.file) {
                const fs = require('fs').promises;
                try {
                    await fs.unlink(path.join('./uploads/products', req.file.filename));
                } catch (err) {
                    console.error('Error removing uploaded file:', err);
                }
            }
            res.status(500).json({ 
                success: false, 
                message: error.message || 'Error updating product',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        } finally {
            connection.release();
        }
    },
    
    // Optimized delete method
    delete: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
    
            const { id } = req.params;
    
            // Get photo filenames
            const [photos] = await connection.query(
                'SELECT photo FROM photos WHERE product_id = ?', 
                [id]
            );
    
            // Delete prices
            await connection.query('DELETE FROM prices WHERE product_id = ?', [id]);
    
            // Delete photos from database
            await connection.query('DELETE FROM photos WHERE product_id = ?', [id]);
    
            // Delete product
            await connection.query('DELETE FROM products WHERE id = ?', [id]);
    
            await connection.commit();
    
            // Delete photo files
            if (photos.length) {
                const fs = require('fs').promises;
                for (const photo of photos) {
                    try {
                        await fs.unlink(path.join('./uploads/products', photo.photo));
                    } catch (err) {
                        console.error('Error deleting photo file:', err);
                    }
                }
            }
    
            res.json({ 
                success: true, 
                message: 'Product and related data deleted successfully' 
            });
    
        } catch (error) {
            await connection.rollback();
            res.status(500).json({ 
                success: false, 
                message: error.message || 'Error deleting product',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        } finally {
            connection.release();
        }
    }
};

module.exports = { productController };