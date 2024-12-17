const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const upload = require("../config/multer"); 
const transporter = require('../config/mailer');
const fs = require('fs').promises;
const path = require('path');

const validateEmailConfig = () => {
  const requiredFields = ['MAIL_HOST', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_FROM', 'ADMIN_EMAIL'];
  const missingFields = requiredFields.filter(field => !process.env[field]);
  
  if (missingFields.length > 0) {
    console.error('Missing email configuration:', missingFields);
    return false;
  }
  return true;
};

const sendAdminNotification = async (sellerData) => {
  try {
    if (!validateEmailConfig()) {
      throw new Error('Incomplete email configuration');
    }

    await transporter.sendMail({
      from: {
        name: 'WasteLess Admin',
        address: process.env.MAIL_FROM
      },
      to: process.env.ADMIN_EMAIL,
      subject: 'New Seller Registration - Action Required',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #16a34a;">New Seller Registration</h1>
          <p><strong>Name:</strong> ${sellerData.name}</p>
          <p><strong>Email:</strong> ${sellerData.email}</p>
          <p><strong>Phone:</strong> ${sellerData.phone}</p>
          <p><strong>Location:</strong><br>
            ${sellerData.address}<br>
            ${sellerData.kecamatan}, ${sellerData.kabupaten}<br>
            ${sellerData.province}
          </p>
          <p style="margin-top: 20px;">Please review this application in the admin dashboard.</p>
        </div>
      `
    });

    console.log('Admin notification email sent successfully');
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

const authController = {
  register: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Handle file uploads
      await new Promise((resolve, reject) => {
        upload.fields([
          { name: 'photo_ktp', maxCount: 1 },
          { name: 'photo_usaha', maxCount: 1 },
        ])(req, res, (err) => {
          if (err) {
            reject(err);
          }
          resolve();
        });
      });

      const { name, email, password, role, phone } = req.body;
      const isSeller = role === 'seller';

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Set is_active to false for sellers
      const isActive = isSeller ? false : true;

      const [userResult] = await connection.query(
        "INSERT INTO users (name, email, password, role, phone, is_active) VALUES (?, ?, ?, ?, ?, ?)",
        [name, email, hashedPassword, role, phone, isActive]
      );

      const userId = userResult.insertId;

      // Insert into address
      const addressData = [userId];

      let addressQuery = "INSERT INTO address (user_id";
      let addressValues = " VALUES (?";

      if (isSeller) {
        // Save file paths
        const photoKtp = req.files['photo_ktp'] ? req.files['photo_ktp'][0].filename : null;
        const photoUsaha = req.files['photo_usaha'] ? req.files['photo_usaha'][0].filename : null;

        addressQuery += ", photo_ktp, photo_usaha";
        addressValues += ", ?, ?";
        addressData.push(photoKtp, photoUsaha);
      }

      addressQuery += ")";
      addressValues += ")";
      const finalAddressQuery = addressQuery + addressValues;

      await connection.query(finalAddressQuery, addressData);

      await connection.commit();

      res.status(201).json({
        success: true,
        message: isSeller ? 'Seller registered successfully, pending approval' : 'User registered successfully',
      });
    } catch (error) {
      await connection.rollback();

      // Delete uploaded files if any
      if (req.files) {
        for (const key in req.files) {
          const file = req.files[key][0];
          await fs.unlink(path.join('./uploads', file.filename)).catch((err) => console.error('Error deleting file:', err));
        }
      }

      res.status(500).json({
        success: false,
        message: error.message,
      });
    } finally {
      connection.release();
    }
  },

  registerSeller:async (req, res) => {
    const connection = await pool.getConnection();
  try {
    console.log('Register seller request:', req.body);
    console.log('Files:', req.files);

    await connection.beginTransaction();

    // Handle file uploads
    await new Promise((resolve, reject) => {
      upload.fields([
        { name: 'photo_ktp', maxCount: 1 },
        { name: 'photo_usaha', maxCount: 1 }
      ])(req, res, (err) => {
        if (err) {
          console.error('File upload error:', err);
          reject(err);
        }
        resolve();
      });
    });
  
      const { 
        name, 
        email, 
        password, 
        phone,
        province,
        kabupaten,
        kecamatan,
        address,
        code_pos 
      } = req.body;
  
      // Validate required files
      if (!req.files?.photo_ktp?.[0] || !req.files?.photo_usaha?.[0]) {
        throw new Error('KTP and business photos are required');
      }
  
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create user as inactive seller
      const [userResult] = await connection.query(
        "INSERT INTO users (name, email, password, role, phone, is_active) VALUES (?, ?, ?, 'seller', ?, false)",
        [name, email, hashedPassword, phone]
      );
  
      const userId = userResult.insertId;
      const photoKtp = req.files['photo_ktp'][0].filename;
      const photoUsaha = req.files['photo_usaha'][0].filename;
  
      // Create address record with photos
      await connection.query(
        `INSERT INTO address 
         (user_id, province, kabupaten, kecamatan, address, code_pos, photo_ktp, photo_usaha)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, province, kabupaten, kecamatan, address, code_pos, photoKtp, photoUsaha]
      );
  
      await connection.commit();
  
      // Send notification email to admin (optional)
      const emailSent = await sendAdminNotification({
        name,
        email,
        phone,
        address,
        kecamatan,
        kabupaten,
        province
      });
  
      if (!emailSent) {
        console.warn('Admin notification email could not be sent');
      }
  
      res.status(201).json({
        success: true,
        message: 'Pendaftaran berhasil! Tim kami akan meninjau aplikasi Anda.'
      });
  
    } catch (error) {
      console.error('Registration error:', error);
      await connection.rollback();
    
    // Delete uploaded files if any
    if (req.files) {
      for (const key in req.files) {
        const file = req.files[key][0];
        await fs.unlink(path.join('./uploads', file.filename))
          .catch(err => console.error('Error deleting file:', err));
      }
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    connection.release();
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

      await pool.query(
        `UPDATE address 
             SET kabupaten = ?, kecamatan = ?, address = ?, code_pos = ? 
             WHERE user_id = ?`,
        [kabupaten, kecamatan, address, code_pos, userId]
      );

      res.json({
        success: true,
        message: "Address updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  getProfile: async (req, res) => {
    try {
      const userId = req.userData.userId;

      const [rows] = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, 
                        a.kabupaten, a.kecamatan, a.address, a.code_pos
                 FROM users u
                 LEFT JOIN address a ON u.id = a.user_id
                 WHERE u.id = ?`,
        [userId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        data: rows[0],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Get user data
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  
      if (rows.length < 1) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
  
      const user = rows[0];
  
      // Verify password
      const compare = await bcrypt.compare(password, user.password);
      if (!compare) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
  
      // Check address completion
      const [addressRows] = await pool.query(
        'SELECT COUNT(*) as address_count FROM address WHERE user_id = ? AND address IS NOT NULL', 
        [user.id]
      );
  

      const token = jwt.sign({
        userId: user.id,
        email: user.email,
        role: user.role || 'user',
        isActive: user.is_active,
      }, process.env.JWT_SECRET, {
        expiresIn: '1h',
      });
    
      // Prepare user data
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        has_address: addressRows[0].address_count > 0,
        isActive: user.is_active,
      };
    
      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        token: token,
        user: userData,
      });
  
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred during authentication'
      });
    }
  },
  logout: async (req, res) => {
    try {
      // Since JWT is stateless, we just send success response
      // The actual logout happens on frontend by removing the token
      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Logout failed",
      });
    }
  },
};

module.exports = authController;
