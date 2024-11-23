const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

const authController = {
  register: async (req, res) => {
    try {
      const { name, email, password, role, phone } = req.body;

      // Validate phone number
      if (!phone || !/^[0-9]{10,13}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        const [userResult] = await connection.query(
          "INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)",
          [name, email, hashedPassword, role, phone]
        );

        await connection.query("INSERT INTO address (user_id) VALUES (?)", [
          userResult.insertId,
        ]);

        await connection.commit();

        res.status(201).json({
          success: true,
          message: "User registered successfully",
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
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
  
      // Generate token
      const token = jwt.sign({
        userId: user.id,
        email: user.email,
        role: user.role || 'user'
      }, process.env.JWT_SECRET, {
        expiresIn: '1h'
      });
  
      // Prepare user data
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        has_address: addressRows[0].address_count > 0
      };
  
      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        token: token,
        user: userData
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
