const cron = require('node-cron');
const pool = require("../config/database");
const transporter = require("../config/mailer");

const checkScheduledNewsletters = async () => {
  const connection = await pool.getConnection();
  try {
    // Get newsletters scheduled for now or past
    const [newsletters] = await connection.query(
      `SELECT * FROM newsletters 
       WHERE status = 'scheduled' 
       AND scheduled_at <= NOW()
       AND sent_at IS NULL`
    );

    for (const newsletter of newsletters) {
      // Get active subscribers
      const [subscribers] = await connection.query(
        "SELECT email FROM newsletter_subscribers WHERE is_active = true"
      );

      // Send emails
      const emailPromises = subscribers.map(sub =>
        transporter.sendMail({
          from: {
            name: process.env.MAIL_FROM_NAME,
            address: process.env.MAIL_FROM
          },
          to: sub.email,
          subject: newsletter.title,
          html: newsletter.content
        })
      );

      await Promise.all(emailPromises);

      // Update newsletter status
      await connection.query(
        "UPDATE newsletters SET status = 'sent', sent_at = NOW() WHERE id = ?",
        [newsletter.id]
      );

      console.log(`Scheduled newsletter ${newsletter.id} sent to ${subscribers.length} subscribers`);
    }
  } catch (error) {
    console.error('Newsletter scheduler error:', error);
  } finally {
    connection.release();
  }
};

// Run every minute
cron.schedule('* * * * *', checkScheduledNewsletters);