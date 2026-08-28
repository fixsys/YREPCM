import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// Get all users
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        account: true,
        name: true,
        email: true,
        department: true,
        role: true,
        is_active: true,
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取使用者失敗' });
  }
});

// Create user (Admin only)
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  if ((!req.user?.level || req.user.level < 100)) return res.status(403).json({ error: '權限不足' });

  const { account, password, name, email, department_id, role_id } = req.body;
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        account,
        password_hash,
        name,
        email,
        department_id,
        role_id,
      },
      select: { id: true, account: true, name: true, email: true, department: true, role: true }
    });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '建立使用者失敗，帳號可能已存在' });
  }
});

// Update user
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  if ((!req.user?.level || req.user.level < 100)) return res.status(403).json({ error: '權限不足' });

  const { name, email, department_id, role_id, is_active } = req.body;
  try {
    const userId = req.params.id as string;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name, email, department_id, role_id, is_active },
      select: { id: true, account: true, name: true, email: true, department: true, role: true, is_active: true }
    });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '更新使用者失敗' });
  }
});

// Reset password (Admin only)
router.post('/:id/reset-password', authenticateToken, async (req: AuthRequest, res) => {
  if ((!req.user?.level || req.user.level < 100)) return res.status(403).json({ error: '權限不足' });
  
  const { newPassword } = req.body;
  try {
    const userId = req.params.id as string;
    const password_hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash },
    });
    res.json({ message: '密碼已重設' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '重設密碼失敗' });
  }
});

export default router;
