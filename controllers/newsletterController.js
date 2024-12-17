const pool = require("../config/database");
const transporter = require("../config/mailer");

const newsletterController = {
  // Newsletter CRUD
  getAllNewsletters: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const [newsletters] = await connection.query(
        "SELECT * FROM newsletters ORDER BY created_at DESC"
      );
      res.json({ success: true, data: newsletters });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    } finally {
      connection.release();
    }
  },

  createNewsletter: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { title, content, image_url, status, scheduled_at } = req.body;
      const [result] = await connection.query(
        `INSERT INTO newsletters (title, content, image_url, status, scheduled_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [title, content, image_url || null, status, scheduled_at || null]
      );

      if (status === 'sent') {
        await sendNewsletterEmails(result.insertId);
      }

      res.json({ success: true, message: "Newsletter created successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    } finally {
      connection.release();
    }
  },

  updateNewsletter: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
      const { title, content, image_url, status, scheduled_at } = req.body;

      await connection.query(
        `UPDATE newsletters 
         SET title = ?, content = ?, image_url = ?, status = ?, scheduled_at = ? 
         WHERE id = ?`,
        [title, content, image_url, status, scheduled_at, id]
      );

      res.json({ success: true, message: "Newsletter updated successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    } finally {
      connection.release();
    }
  },

  deleteNewsletter: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
      await connection.query("DELETE FROM newsletters WHERE id = ?", [id]);
      res.json({ success: true, message: "Newsletter deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    } finally {
      connection.release();
    }
  },

  // Subscriber Management
  checkSubscription: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { email } = req.params;
      const [subscriber] = await connection.query(
        "SELECT is_active FROM newsletter_subscribers WHERE email = ?",
        [email]
      );
      res.json({ 
        success: true, 
        isSubscribed: subscriber.length > 0 && subscriber[0].is_active 
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    } finally {
      connection.release();
    }
  },

  // Update subscribe to send confirmation email
  subscribe: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { email } = req.body;
      
      // Check if already subscribed
      const [existing] = await connection.query(
        "SELECT * FROM newsletter_subscribers WHERE email = ?",
        [email]
      );

      if (existing.length > 0) {
        if (existing[0].is_active) {
          return res.status(400).json({
            success: false,
            message: "Email already subscribed"
          });
        }
        // Reactivate subscription
        await connection.query(
          "UPDATE newsletter_subscribers SET is_active = true WHERE email = ?",
          [email]
        );
      } else {
        // New subscription
        await connection.query(
          "INSERT INTO newsletter_subscribers (email) VALUES (?)",
          [email]
        );
      }

      // Send confirmation email
      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: email,
        subject: "Welcome to WasteLess Newsletter! 🌱",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #16a34a;">Welcome to WasteLess Newsletter! 🌱</h1>
            <p>Thank you for subscribing to our newsletter. You'll receive updates about:</p>
            <ul style="list-style-type: none; padding: 0;">
              <li style="margin: 10px 0;">✨ Tips for reducing food waste</li>
              <li style="margin: 10px 0;">🎁 Exclusive offers</li>
              <li style="margin: 10px 0;">📢 New product announcements</li>
            </ul>
            <p style="margin-top: 20px;">
              To unsubscribe, <a href="${process.env.NEXT_PUBLIC_URL}/newsletter/unsubscribe/${email}" 
              style="color: #16a34a;">click here</a>
            </p>
          </div>
        `
      });

      res.json({ success: true, message: "Successfully subscribed!" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    } finally {
      connection.release();
    }
  },

  unsubscribe: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { email } = req.params;
      await connection.query(
        "UPDATE newsletter_subscribers SET is_active = false WHERE email = ?",
        [email]
      );
      res.json({ success: true, message: "Unsubscribed successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    } finally {
      connection.release();
    }
  },

  getAllSubscribers: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const [subscribers] = await connection.query(
        "SELECT * FROM newsletter_subscribers ORDER BY created_at DESC"
      );
      res.json({ success: true, data: subscribers });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    } finally {
      connection.release();
    }
  }
};

// Helper function to send newsletter emails
async function sendNewsletterEmails(newsletterId) {
  const connection = await pool.getConnection();
  try {
    const [newsletter] = await connection.query(
      "SELECT * FROM newsletters WHERE id = ?",
      [newsletterId]
    );

    const [subscribers] = await connection.query(
      "SELECT email FROM newsletter_subscribers WHERE is_active = true"
    );

    const emailPromises = subscribers.map(sub => 
      transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: sub.email,
        subject: newsletter[0].title,
        html: newsletter[0].content
      })
    );

    await Promise.all(emailPromises);
    await connection.query(
      "UPDATE newsletters SET sent_at = NOW() WHERE id = ?",
      [newsletterId]
    );
  } catch (error) {
    console.error("Send newsletter error:", error);
    throw error;
  } finally {
    connection.release();
  }
}

const sendDraft = async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
  
      // Get newsletter data
      const [newsletter] = await connection.query(
        "SELECT * FROM newsletters WHERE id = ? AND status = 'draft'",
        [id]
      );
  
      if (newsletter.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "Draft newsletter not found" 
        });
      }
  
      // Get active subscribers
      const [subscribers] = await connection.query(
        "SELECT email FROM newsletter_subscribers WHERE is_active = true"
      );
  
      if (subscribers.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No active subscribers found"
        });
      }
  
      // Send emails
      const emailPromises = subscribers.map(subscriber =>
        transporter.sendMail({
          from: {
            name: process.env.MAIL_FROM_NAME,
            address: process.env.MAIL_FROM
          },
          to: subscriber.email,
          subject: newsletter[0].title,
          html: newsletter[0].content
        })
      );
  
      await Promise.all(emailPromises);
  
      // Update newsletter status
      await connection.query(
        "UPDATE newsletters SET status = 'sent', sent_at = NOW() WHERE id = ?",
        [id]
      );
  
      res.json({
        success: true,
        message: `Newsletter sent to ${subscribers.length} subscribers`
      });
  
    } catch (error) {
      console.error('Send draft error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to send newsletter" 
      });
    } finally {
      connection.release();
    }
  };
  
  module.exports = {
    ...newsletterController,
    sendDraft
  };