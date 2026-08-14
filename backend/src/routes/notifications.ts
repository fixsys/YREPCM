import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// Get user notifications
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  try {
    const notifications = await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50
    });
    
    // Check if SMTP is configured
    const smtpHost = await prisma.systemSetting.findUnique({ where: { key: 'SMTP_HOST' } });
    const isSmtpConfigured = !!smtpHost?.value;
    
    res.json({ notifications, isSmtpConfigured });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark as read
router.patch('/:id/read', authenticateToken, async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const userId = req.user?.id;
  
  try {
    await prisma.notification.updateMany({
      where: { id, user_id: userId },
      data: { is_read: true }
    });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

export default router;
