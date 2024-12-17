// middleware/auth.js
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userData = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

const checkRole = (roles, requireActive = false) => {
  return (req, res, next) => {
    // Check role
    if (!roles.includes(req.userData.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Optionally check isActive status
    if (requireActive && !req.userData.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account not activated yet'
      });
    }

    next();
  };
};

module.exports = {
  auth,
  checkRole
};