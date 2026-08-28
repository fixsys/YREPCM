import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

// Login
router.post('/login', async (req, res) => {
  const { account, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ 
      where: { account },
      include: { role: true, department: true }
    });
    if (!user) {
      return res.status(401).json({ error: '無效的帳號或密碼' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: '此帳號已被停用' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: '無效的帳號或密碼' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        account: user.account, 
        role: user.role?.name || '', 
        department: user.department?.name || '',
        level: user.role?.level || 0
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    // 檢查是否需要強制修改密碼 (第一次登入或被管理員重置)
    const requirePasswordChange = user.force_password_change;

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        department: user.department?.name || '', 
        role: user.role?.name || '',
        level: user.role?.level || 0,
        permissions: (user.department?.permissions as string[]) || []
      }, 
      requirePasswordChange 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '登入失敗' });
  }
});

// Change Password
router.post('/change-password', authenticateToken, async (req: AuthRequest, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: '未授權' });

  // 密碼強度要求: 6位數以上並且包含英文
  if (newPassword.length < 6 || !/[a-zA-Z]/.test(newPassword)) {
    return res.status(400).json({ error: '新密碼必須至少6位數，且包含英文字母' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: '找不到使用者' });

    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: '舊密碼錯誤' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password_hash,
        force_password_change: false 
      },
    });

    res.json({ message: '密碼修改成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '修改密碼失敗' });
  }
});

export default router;
