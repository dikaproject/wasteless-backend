const pool = require("../config/database");
const bcrypt = require("bcryptjs"); // Import bcryptjs for password hashing

const usersController = {
  // Get all users
  getAll: async (req, res) => {
    try {
      // Exclude password from the response
      const [users] = await pool.query(
        "SELECT id, name, email, phone, role, created_at, updated_at FROM users"
      );
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Create user
  create: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
  
      const { 
        name, 
        email, 
        password, 
        phone, 
        role,
        province,
        kabupaten,
        kecamatan,
        code_pos,
        address
      } = req.body;
      
      const created_at = new Date();
      const updated_at = new Date();
  
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Insert user
      const [userResult] = await connection.query(
        "INSERT INTO users (name, email, password, phone, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, email, hashedPassword, phone, role, created_at, updated_at]
      );
  
      // Handle seller photos
      let photoKtp = null;
      let photoUsaha = null;
  
      if (role === 'seller' && req.files) {
        if (req.files.photo_ktp) {
          photoKtp = req.files.photo_ktp[0].filename;
        }
        if (req.files.photo_usaha) {
          photoUsaha = req.files.photo_usaha[0].filename;
        }
      }
  
      // Insert address with photos if seller
      await connection.query(
        "INSERT INTO address (user_id, province, kabupaten, kecamatan, code_pos, address, photo_ktp, photo_usaha) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [userResult.insertId, province, kabupaten, kecamatan, code_pos, address, photoKtp, photoUsaha]
      );
  
      await connection.commit();
      
      res.status(201).json({
        success: true,
        message: "User created successfully",
      });
    } catch (error) {
      await connection.rollback();
      res.status(500).json({ success: false, message: error.message });
    } finally {
      connection.release();
    }
  },

  // Update user
  update: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      const { 
        name, 
        email, 
        password, 
        phone, 
        role,
        province,
        kabupaten,
        kecamatan,
        code_pos,
        address
      } = req.body;
      
      // Check if user exists
      const [existingUser] = await connection.query(
        "SELECT role FROM users WHERE id = ?", 
        [id]
      );
      
      if (existingUser.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      // Update user basic info
      const userUpdateFields = [];
      const userValues = [];

      if (name) {
        userUpdateFields.push("name = ?");
        userValues.push(name);
      }
      if (email) {
        userUpdateFields.push("email = ?");
        userValues.push(email);
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        userUpdateFields.push("password = ?");
        userValues.push(hashedPassword);
      }
      if (phone) {
        userUpdateFields.push("phone = ?");
        userValues.push(phone);
      }
      if (role) {
        userUpdateFields.push("role = ?");
        userValues.push(role);
      }

      userUpdateFields.push("updated_at = NOW()");
      userValues.push(id); // For WHERE clause

      if (userUpdateFields.length > 1) { // > 1 because we always have updated_at
        const userSql = `UPDATE users SET ${userUpdateFields.join(", ")} WHERE id = ?`;
        await connection.query(userSql, userValues);
      }

      // Update or insert address
      const [existingAddress] = await connection.query(
        "SELECT id FROM address WHERE user_id = ?",
        [id]
      );

      let photoKtp = null;
      let photoUsaha = null;

      if (role === 'seller' && req.files) {
        if (req.files.photo_ktp) {
          photoKtp = req.files.photo_ktp[0].filename;
        }
        if (req.files.photo_usaha) {
          photoUsaha = req.files.photo_usaha[0].filename;
        }
      }

      if (existingAddress.length > 0) {
        // Update existing address
        const addressUpdateFields = [];
        const addressValues = [];

        if (province) {
          addressUpdateFields.push("province = ?");
          addressValues.push(province);
        }
        if (kabupaten) {
          addressUpdateFields.push("kabupaten = ?");
          addressValues.push(kabupaten);
        }
        if (kecamatan) {
          addressUpdateFields.push("kecamatan = ?");
          addressValues.push(kecamatan);
        }
        if (code_pos) {
          addressUpdateFields.push("code_pos = ?");
          addressValues.push(code_pos);
        }
        if (address) {
          addressUpdateFields.push("address = ?");
          addressValues.push(address);
        }
        if (photoKtp) {
          addressUpdateFields.push("photo_ktp = ?");
          addressValues.push(photoKtp);
        }
        if (photoUsaha) {
          addressUpdateFields.push("photo_usaha = ?");
          addressValues.push(photoUsaha);
        }

        if (addressUpdateFields.length > 0) {
          addressValues.push(id); // For WHERE clause
          const addressSql = `UPDATE address SET ${addressUpdateFields.join(", ")} WHERE user_id = ?`;
          await connection.query(addressSql, addressValues);
        }
      } else {
        // Insert new address
        await connection.query(
          `INSERT INTO address (user_id, province, kabupaten, kecamatan, code_pos, address, photo_ktp, photo_usaha) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, province, kabupaten, kecamatan, code_pos, address, photoKtp, photoUsaha]
        );
      }

      await connection.commit();
      res.json({ 
        success: true, 
        message: "User updated successfully" 
      });
    } catch (error) {
      await connection.rollback();
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    } finally {
      connection.release();
    }
  },

  // Update getDetail to include address
  getDetail: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
      
      const [user] = await connection.query(
        "SELECT id, name, email, phone, role, created_at, updated_at FROM users WHERE id = ?",
        [id]
      );

      if (user.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      const [address] = await connection.query(
        "SELECT province, kabupaten, kecamatan, code_pos, address, photo_ktp, photo_usaha FROM address WHERE user_id = ?",
        [id]
      );

      res.json({ 
        success: true, 
        data: {
          user: user[0],
          address: address[0] || null
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    } finally {
      connection.release();
    }
  },

  // Delete user
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if user exists
      const [existingUser] = await pool.query("SELECT id FROM users WHERE id = ?", [id]);
      if (existingUser.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      await pool.query("DELETE FROM users WHERE id = ?", [id]);
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Reset password
  resetPassword: async (req, res) => {
    try {
      const { id } = req.params;

      // Get user's name
      const [user] = await pool.query("SELECT name FROM users WHERE id = ?", [id]);
      if (user.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const newPasswordPlain = `WasteLess${user[0].name}`;

      // Hash the new password
      const newPasswordHashed = await bcrypt.hash(newPasswordPlain, 10);
      const updated_at = new Date();

      // Reset password to 'WasteLess{username}'
      await pool.query("UPDATE users SET password = ?, updated_at = ? WHERE id = ?", [
        newPasswordHashed,
        updated_at,
        id,
      ]);

      res.json({
        success: true,
        newPassword: newPasswordPlain, // Return the plain new password for the user
        message: `Password reset successfully for user ${user[0].name} and new password is ${newPasswordPlain}`,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = { usersController };