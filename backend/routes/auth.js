const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const { User, Role, Organization, Company, Department } = require('../models');
const { generateToken, protect } = require('../middleware/auth');

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Please provide email and password' });

    const user = await User.findOne({
      where: { email: email.toLowerCase() },
      include: [
        { model: Role, as: 'role' },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
      ]
    });

    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    if (!user.isActive)
      return res.status(401).json({ success: false, message: 'Account is deactivated. Contact admin.' });

    user.lastLogin = new Date();
    await user.save({ fields: ['lastLogin'] });

    const token = generateToken(user.id);

    // Log login action
    const { logAction } = require('../utils/auditLogger');
    await logAction({ user, ip: req.ip || req.headers['x-forwarded-for'] }, 'LOGIN', 'auth', user.id, user.name, 'User logged in successfully');

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      isSuperAdmin: user.isSuperAdmin,
      role: user.role,
      organization: user.organization,
      company: user.company,
      department: user.department,
      lastLogin: user.lastLogin
    };

    res.json({ success: true, message: 'Login successful', token, user: userData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) return res.json({ success: true, message: 'If this email exists, an OTP has been sent.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await user.update({ resetOTP: otp, resetOTPExpiry: otpExpiry, resetOTPVerified: false });

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: 'CRM — Password Reset OTP',
        html: `<div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#0f172a;color:#e2e8f0;border-radius:12px;"><h2 style="color:#818cf8;">🔐 Password Reset OTP</h2><p>Hello <strong>${user.name}</strong>,</p><div style="background:#1e293b;padding:20px;border-radius:8px;text-align:center;margin:20px 0;"><h1 style="color:#818cf8;font-size:48px;letter-spacing:8px;margin:0;">${otp}</h1></div><p>Valid for <strong>10 minutes</strong>.</p></div>`
      });
    } catch (e) { console.error('Email error:', e.message); }

    res.json({ success: true, message: 'If this email exists, an OTP has been sent.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user || !user.resetOTP)
      return res.status(400).json({ success: false, message: 'Invalid request' });

    if (user.resetOTPExpiry < new Date())
      return res.status(400).json({ success: false, message: 'OTP expired. Request a new one.' });

    if (user.resetOTP !== otp)
      return res.status(400).json({ success: false, message: 'Invalid OTP' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    await user.update({
      resetOTPVerified: true,
      resetToken,
      resetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000),
      resetOTP: null,
      resetOTPExpiry: null
    });

    res.json({ success: true, message: 'OTP verified', resetToken });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword)
      return res.status(400).json({ success: false, message: 'All fields required' });

    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const user = await User.findOne({ where: { email: email.toLowerCase(), resetToken } });
    if (!user || !user.resetOTPVerified)
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });

    if (user.resetTokenExpiry < new Date())
      return res.status(400).json({ success: false, message: 'Reset token expired' });

    await user.update({
      password: newPassword,
      resetToken: null,
      resetTokenExpiry: null,
      resetOTPVerified: false
    });

    res.json({ success: true, message: 'Password reset successfully. You can now login.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'resetOTP', 'resetOTPExpiry', 'resetToken', 'resetTokenExpiry'] },
      include: [
        { model: Role, as: 'role' },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
      ]
    });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
