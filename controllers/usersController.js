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
    try {
      const { name, email, password, phone, role } = req.body;
      const created_at = new Date();
      const updated_at = new Date();

      // Hash the password before saving
      const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

      await pool.query(
        "INSERT INTO users (name, email, password, phone, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, email, hashedPassword, phone, role, created_at, updated_at]
      );
      res.status(201).json({
        success: true,
        message: "User created successfully",
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Update user
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, password, phone, role } = req.body;
      const updated_at = new Date();

      // Check if user exists
      const [existingUser] = await pool.query("SELECT id FROM users WHERE id = ?", [id]);
      if (existingUser.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Build dynamic query based on provided fields
      let updateFields = [];
      let values = [];

      if (name) {
        updateFields.push("name = ?");
        values.push(name);
      }
      if (email) {
        updateFields.push("email = ?");
        values.push(email);
      }
      if (password) {
        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push("password = ?");
        values.push(hashedPassword);
      }
      if (phone) {
        updateFields.push("phone = ?");
        values.push(phone);
      }
      if (role) {
        updateFields.push("role = ?");
        values.push(role);
      }

      // Always update the updated_at field
      updateFields.push("updated_at = ?");
      values.push(updated_at);

      values.push(id); // Add id at the end for the WHERE clause

      const sql = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;

      await pool.query(sql, values);
      res.json({ success: true, message: "User updated successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get user detail
  getDetail: async (req, res) => {
    try {
      const { id } = req.params;
      // Exclude password from the response
      const [user] = await pool.query(
        "SELECT id, name, email, phone, role, created_at, updated_at FROM users WHERE id = ?",
        [id]
      );
      if (user.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      res.json({ success: true, data: user[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
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