const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token)
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'resetOTP', 'resetOTPExpiry', 'resetToken', 'resetTokenExpiry'] },
      include: [{ model: Role, as: 'role' }]
    });

    if (!req.user)
      return res.status(401).json({ success: false, message: 'User not found' });

    if (!req.user.isActive)
      return res.status(401).json({ success: false, message: 'Account is deactivated' });

    // Asynchronously update last active timestamp (heartbeat)
    User.update({ lastActiveAt: new Date() }, { where: { id: req.user.id } }).catch(() => {});

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

const superAdminOnly = (req, res, next) => {
  if (req.user?.isSuperAdmin) return next();
  return res.status(403).json({ success: false, message: 'Access denied: Super Admin only' });
};

const adminOnly = (req, res, next) => {
  const adminLevels = ['super_admin', 'org_admin', 'company_admin'];
  if (req.user?.isSuperAdmin || adminLevels.includes(req.user?.role?.level)) return next();
  return res.status(403).json({ success: false, message: 'Access denied: Admin only' });
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

module.exports = { protect, superAdminOnly, adminOnly, generateToken };
