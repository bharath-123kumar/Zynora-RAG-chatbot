const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { logAuditEvent } = require('../utils/auditLogger');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

async function register(req, res, next) {
  try {
    const { email, password, name, role } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role || 'USER';

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: userRole
      }
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: 'USER_REGISTER',
      resource: `USER:${user.id}`,
      metadata: { email: user.email, role: user.role }
    });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await logAuditEvent({
        userEmail: email,
        action: 'LOGIN_FAILED',
        resource: 'AUTH',
        metadata: { reason: 'User not found' }
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        action: 'LOGIN_FAILED',
        resource: 'AUTH',
        metadata: { reason: 'Password mismatch' }
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      action: 'LOGIN_SUCCESS',
      resource: 'AUTH',
      metadata: { email: user.email, role: user.role }
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({
    user: req.user
  });
}

async function logout(req, res) {
  if (req.user) {
    await logAuditEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'LOGOUT',
      resource: 'AUTH'
    });
  }
  res.json({ message: 'Logged out successfully' });
}

module.exports = {
  register,
  login,
  me,
  logout
};
