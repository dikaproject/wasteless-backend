// controllers/sellerProductController.js
const pool = require("../config/database");
const slugify = require("slugify");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;

// Multer configuration
const storage = multer.diskStorage({
  destination: "./uploads/products",
  filename: (req, file, cb) => {
    cb(null, `product-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only .png, .jpg and .jpeg format allowed!"));
  },
}).single("photo");

const sellerProductController = {
  // Get seller's products
  getAll: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const sellerId = req.userData.userId;

      const [products] = await pool.query(
        `
          SELECT 
            p.*,
            c.name as category_name,
            ph.photo,
            pr.price,
            pr.is_discount,
            pr.discount_percentage,
            pr.discount_price,
            pr.start_date,
            pr.end_date
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN photos ph ON p.photo_id = ph.id
          LEFT JOIN (
            SELECT 
              product_id,
              price,
              is_discount,
              discount_percentage,
              discount_price,
              start_date,
              end_date
            FROM prices 
            WHERE (start_date IS NULL OR start_date <= CURRENT_TIMESTAMP)
            AND (end_date IS NULL OR end_date >= CURRENT_TIMESTAMP)
            ORDER BY created_at DESC
          ) pr ON p.id = pr.product_id
          WHERE p.seller_id = ?
          ORDER BY p.created_at DESC
          LIMIT ? OFFSET ?
        `,
        [sellerId, limit, offset]
      );

      // Format prices and handle nulls
      const formattedProducts = products.map((product) => ({
        ...product,
        photo: product.photo || "default-product.jpg", // Provide default image
        price: product.price || 0,
        is_discount: Boolean(product.is_discount),
        discount_percentage: product.discount_percentage || 0,
        discount_price: product.discount_price || 0,
      }));

      const [total] = await pool.query(
        "SELECT COUNT(*) as count FROM products WHERE seller_id = ?",
        [sellerId]
      );

      res.json({
        success: true,
        data: formattedProducts,
        pagination: {
          page,
          limit,
          total: total[0].count,
        },
      });
    } catch (error) {
      console.error("Get products error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Create new product
  // Update create method in sellerProductController.js
  create: async (req, res) => {
    const connection = await pool.getConnection();
    if (!req.userData.isActive) {
      return res.status(403).json({ message: 'Your account is not activated yet' });
    }

    try {
      await connection.beginTransaction();

      // Debug log
      console.log("Request body:", req.body);
      console.log("Request file:", req.file);

      // Handle file upload
      await new Promise((resolve, reject) => {
        upload(req, res, (err) => {
          if (err) {
            console.error("Upload error:", err);
            reject(err);
          }
          resolve();
        });
      });

      const {
        category_id,
        name,
        quantity,
        massa,
        expired,
        price,
        is_discount,
        discount_percentage,
        discount_start_date,
        discount_end_date,
      } = req.body;

      // Validate required fields
      if (!category_id || !name || !quantity || !massa || !expired || !price) {
        throw new Error("Missing required fields");
      }

      const sellerId = req.userData.userId;
      const slug = slugify(name, { lower: true });

      // Insert product
      const [productResult] = await connection.query(
        `INSERT INTO products 
            (seller_id, category_id, name, slug, quantity, massa, expired, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [sellerId, category_id, name, slug, quantity, massa, expired]
      );

      const productId = productResult.insertId;

      // Handle photo
      if (req.file) {
        const [photoResult] = await connection.query(
          "INSERT INTO photos (product_id, photo) VALUES (?, ?)",
          [productId, req.file.filename]
        );

        await connection.query(
          "UPDATE products SET photo_id = ? WHERE id = ?",
          [photoResult.insertId, productId]
        );
      }

      // Calculate discount price if applicable
      let discountPrice = 0;
      if (is_discount === "true") {
        discountPrice = Math.floor(
          Number(price) * (1 - Number(discount_percentage) / 100)
        );
      }

      // Insert price
      await connection.query(
        `INSERT INTO prices 
            (product_id, price, is_discount, discount_percentage, discount_price, start_date, end_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          productId,
          price,
          is_discount === "true" ? 1 : 0,
          is_discount === "true" ? discount_percentage : 0,
          discountPrice,
          discount_start_date || null,
          discount_end_date || null,
        ]
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: "Product created and pending approval",
        data: {
          id: productId,
          photo: req.file?.filename,
        },
      });
    } catch (error) {
      console.error("Create product error:", error);
      await connection.rollback();

      // Cleanup uploaded file if exists
      if (req.file) {
        await fs
          .unlink(path.join("./uploads/products", req.file.filename))
          .catch((err) => console.error("Error removing uploaded file:", err));
      }

      res.status(500).json({
        success: false,
        message: error.message,
      });
    } finally {
      connection.release();
    }
  },

  // Update seller's product
  update: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      // Handle file upload
      await new Promise((resolve, reject) => {
        upload(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
  
      await connection.beginTransaction();
      console.log('Update request body:', req.body);
  
      const { id } = req.params;
      const sellerId = req.userData.userId;
  
      // Parse and validate form data
      const {
        name,
        category_id,
        quantity,
        massa,
        expired,
        price,
        is_discount,
        discount,
        start_date,
        end_date,
      } = req.body;
  
      // Check for required fields
      const requiredFields = { name, category_id, quantity, massa, expired, price };
      for (const [field, value] of Object.entries(requiredFields)) {
        if (!value) {
          throw new Error(`Field ${field} is required`);
        }
      }
  
      // Verify product ownership
      const [existingProduct] = await connection.query(
        `SELECT * FROM products WHERE id = ? AND seller_id = ?`,
        [id, sellerId]
      );
  
      if (existingProduct.length === 0) {
        throw new Error('Product not found or unauthorized');
      }
  
      // Update product details
      await connection.query(
        `UPDATE products 
         SET name = ?,
             category_id = ?,
             quantity = ?,
             massa = ?,
             expired = ?
         WHERE id = ? AND seller_id = ?`,
        [name, category_id, quantity, massa, expired, id, sellerId]
      );
  
      // Handle photo update
      if (req.file) {
        // Delete old photo file
        const [oldPhoto] = await connection.query(
          `SELECT ph.photo FROM photos ph
           INNER JOIN products p ON ph.id = p.photo_id
           WHERE p.id = ?`,
          [id]
        );
  
        if (oldPhoto.length > 0 && oldPhoto[0].photo) {
          await fs.unlink(path.join('./uploads/products', oldPhoto[0].photo))
            .catch(err => console.error('Error removing old photo:', err));
        }
  
        // Insert new photo
        const [photoResult] = await connection.query(
          'INSERT INTO photos (photo) VALUES (?)',
          [req.file.filename]
        );
        await connection.query(
          'UPDATE products SET photo_id = ? WHERE id = ?',
          [photoResult.insertId, id]
        );
      }
  
      // Delete old price data
      await connection.query(
        `DELETE FROM prices WHERE product_id = ?`,
        [id]
      );
  
      // Calculate discount details
      const priceValue = parseFloat(price);
      const isDiscounted = is_discount === 'true';
      const discountPercentage = isDiscounted ? parseFloat(discount) : 0;
      const discountPrice = isDiscounted
        ? Math.floor(priceValue - (priceValue * (discountPercentage / 100)))
        : null;
  
      // Insert new price data
      await connection.query(
        `INSERT INTO prices 
         (product_id, price, is_discount, discount_percentage, discount_price, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          priceValue,
          isDiscounted,
          discountPercentage,
          discountPrice,
          isDiscounted ? start_date : null,
          isDiscounted ? end_date : null,
        ]
      );
  
      await connection.commit();
      res.json({
        success: true,
        message: 'Product updated successfully',
      });
    } catch (error) {
      await connection.rollback();
      console.error('Product update error:', error);
  
      // Remove uploaded file if any
      if (req.file) {
        await fs.unlink(path.join('./uploads/products', req.file.filename))
          .catch(err => console.error('Error removing uploaded file:', err));
      }
  
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update product',
      });
    } finally {
      connection.release();
    }
  },

  delete: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
  
      const { id } = req.params;
      const sellerId = req.userData.userId;
  
      // Get product details
      const [product] = await connection.query(
        `SELECT p.*, ph.photo, ph.id as photo_id 
         FROM products p 
         LEFT JOIN photos ph ON p.photo_id = ph.id 
         WHERE p.id = ? AND p.seller_id = ?`,
        [id, sellerId]
      );
  
      if (product.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found or unauthorized"
        });
      }
  
      // Delete in correct order to handle foreign key constraints:
      // 1. Delete prices (no FK constraint)
      await connection.query('DELETE FROM prices WHERE product_id = ?', [id]);
  
      // 2. Set photo_id to NULL in products
      if (product[0].photo_id) {
        await connection.query(
          'UPDATE products SET photo_id = NULL WHERE id = ?',
          [id]
        );
      }
  
      // 3. Delete product
      await connection.query(
        'DELETE FROM products WHERE id = ? AND seller_id = ?',
        [id, sellerId]
      );
  
      // 4. Handle photo cleanup
      if (product[0].photo_id) {
        // Delete photo file
        if (product[0].photo) {
          const photoPath = path.join('./uploads/products', product[0].photo);
          try {
            await fs.unlink(photoPath);
          } catch (err) {
            console.error('Error deleting photo file:', err);
          }
        }
        
        // Delete photo record
        await connection.query('DELETE FROM photos WHERE id = ?', [product[0].photo_id]);
      }
  
      await connection.commit();
      res.json({
        success: true,
        message: "Product deleted successfully"
      });
  
    } catch (error) {
      await connection.rollback();
      console.error('Delete product error:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to delete product'
      });
    } finally {
      connection.release();
    }
  },

  getDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const sellerId = req.userData.userId;

      const [product] = await pool.query(
        `SELECT 
          p.*,
          c.name as category_name,
          ph.photo,
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
        WHERE p.id = ? AND p.seller_id = ?
        ORDER BY pr.created_at DESC
        LIMIT 1`,
        [id, sellerId]
      );

      if (!product.length) {
        return res.status(404).json({
          success: false,
          message: 'Product not found or unauthorized'
        });
      }

      // Format response
      const formattedProduct = {
        ...product[0],
        photo: product[0].photo || null,
        price: product[0].price || 0,
        is_discount: Boolean(product[0].is_discount),
        discount_percentage: product[0].discount_percentage || 0,
        discount_price: product[0].discount_price || 0,
        start_date: product[0].start_date,
        end_date: product[0].end_date
      };

      res.json({
        success: true,
        data: formattedProduct
      });

    } catch (error) {
      console.error('Get product detail error:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
};

module.exports = { sellerProductController };
