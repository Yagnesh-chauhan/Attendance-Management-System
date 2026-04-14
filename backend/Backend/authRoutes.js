const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, getMe } = require('./authController');
const { protect } = require('./authMiddleware');

router.post(
	'/register',
	[
		body('name', 'Name is required').trim().notEmpty(),
		body('email', 'Please provide a valid email').isEmail(),
		body('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
		body('role', 'Role must be student or faculty').isIn(['student', 'faculty']),
	],
	register
);

router.post(
	'/login',
	[
		body('email', 'Please provide a valid email').isEmail(),
		body('password', 'Password is required').notEmpty(),
	],
	login
);

router.get('/me', protect, getMe);

module.exports = router;
