const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const newsletterController = require('../controllers/newsletterController');

// Public routes
router.post('/subscribe', newsletterController.subscribe);  // Remove extra space
router.get('/unsubscribe/:email', newsletterController.unsubscribe);
router.get('/check/:email', newsletterController.checkSubscription);

// Admin routes
router.get('/admin/newsletters', auth, checkRole('admin'), newsletterController.getAllNewsletters);
router.post('/admin/newsletters', auth, checkRole('admin'), newsletterController.createNewsletter);
router.put('/admin/newsletters/:id', auth, checkRole('admin'), newsletterController.updateNewsletter);
router.delete('/admin/newsletters/:id', auth, checkRole('admin'), newsletterController.deleteNewsletter);
router.get('/admin/subscribers', auth, checkRole('admin'), newsletterController.getAllSubscribers);
router.post('/admin/newsletters/:id/send', auth, checkRole('admin'), newsletterController.sendDraft);

module.exports = router;