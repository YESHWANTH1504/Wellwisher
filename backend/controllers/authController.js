const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const { getJwtSecret } = require('../middleware/authMiddleware');

class AuthController {
  static async register(req, res) {
    try {
      const { name, email, password } = req.body;

      const trimmedName = (name || '').trim();
      const trimmedEmail = (email || '').trim().toLowerCase();
      const trimmedPassword = (password || '').trim();

      if (!trimmedName || !trimmedEmail || !trimmedPassword) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and password are required.'
        });
      }

      // Basic email regex validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address.'
        });
      }

      if (trimmedPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters in length.'
        });
      }

      const existingUser = await UserModel.findByEmail(trimmedEmail);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists.'
        });
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(trimmedPassword, saltRounds);

      const userId = await UserModel.create(trimmedName, trimmedEmail, passwordHash);
      const secret = getJwtSecret();
      const token = jwt.sign({ id: userId, email: trimmedEmail }, secret, { expiresIn: '7d' });

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          token,
          user: { id: userId, name: trimmedName, email: trimmedEmail }
        }
      });
    } catch (err) {
      console.error('Registration error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to register user account'
      });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const trimmedEmail = (email || '').trim().toLowerCase();
      const trimmedPassword = (password || '').trim();

      if (!trimmedEmail || !trimmedPassword) {
        return res.status(400).json({
          success: false,
          message: 'Please provide both email and password.'
        });
      }

      const user = await UserModel.findByEmail(trimmedEmail);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      const isMatch = await bcrypt.compare(trimmedPassword, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      const secret = getJwtSecret();
      const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '7d' });

      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email
          }
        }
      });
    } catch (err) {
      console.error('Login error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to authenticate user'
      });
    }
  }

  static async getMe(req, res) {
    try {
      const user = await UserModel.findById(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found.'
        });
      }

      return res.json({
        success: true,
        data: user
      });
    } catch (err) {
      console.error('Get profile error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user details'
      });
    }
  }
}

module.exports = AuthController;
