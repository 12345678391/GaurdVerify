const express = require('express');
const router = express.Router();
const {
  login,
  demoLogin,
  getMe,
  logout,
  forgotPassword,
  registerCompany,
  validateInvitation,
  acceptInvitation,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');

// Public registration disabled - only Head Admin can provision companies & owners
router.post('/register-company', (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Public self-registration is disabled. Company and Owner accounts must be provisioned by the Head Administrator.',
  });
});
router.get('/invitations/:token', createRateLimiter({ max: 60 }), validateInvitation);
router.post('/accept-invitation', createRateLimiter({ max: 30 }), acceptInvitation);
router.post('/login', login);
router.post('/demo-login', createRateLimiter({ max: 30 }), demoLogin);
router.post('/forgot-password', forgotPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/change-password', protect, changePassword);

module.exports = router;
