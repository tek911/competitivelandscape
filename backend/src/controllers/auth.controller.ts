import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../types';
import prisma from '../config/database';
import { generateToken } from '../middleware/auth';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';
import { UserRole } from '@prisma/client';

export class AuthController {
  async register(req: Request, res: Response) {
    const { email, name, password, role = UserRole.USER } = req.body;

    if (!email || !name || !password) {
      throw new BadRequestError('email, name, and password are required');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestError('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
      },
    });

    const token = generateToken(user);

    logger.info(`User registered: ${user.email}`);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });
  }

  async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new BadRequestError('email and password are required');
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = generateToken(user);

    logger.info(`User logged in: ${user.email}`);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });
  }

  async getProfile(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    res.json({
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      preferences: req.user.preferences,
      createdAt: req.user.createdAt,
    });
  }

  async updateProfile(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { name, preferences } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name,
        preferences,
      },
    });

    logger.info(`User profile updated: ${user.email}`);

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      preferences: user.preferences,
    });
  }

  async changePassword(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new BadRequestError('currentPassword and newPassword are required');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('User not found');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newPasswordHash },
    });

    logger.info(`Password changed for user: ${user.email}`);

    res.json({ message: 'Password changed successfully' });
  }
}

export const authController = new AuthController();
