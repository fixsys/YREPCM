import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// Get settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings (Admin only)
router.post('/', authenticateToken, async (req, res) => {
  // @ts-ignore - level is added in auth
  if (req.user?.level < 100) {
    return res.status(403).json({ error: '權限不足' });
  }

  const { settings } = req.body; // Array of { key, value }
  
  try {
    for (const setting of settings) {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value }
      });
    }
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// --- Departments ---
router.get('/departments', authenticateToken, async (req, res) => {
  try {
    const departments = await prisma.department.findMany({ orderBy: { created_at: 'asc' }});
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

router.post('/departments', authenticateToken, async (req, res) => {
  // @ts-ignore
  if (req.user?.level < 100) return res.status(403).json({ error: '權限不足' });
  try {
    const dept = await prisma.department.create({ data: req.body });
    res.json(dept);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create department' });
  }
});

router.delete('/departments/:id', authenticateToken, async (req, res) => {
  // @ts-ignore
  if (req.user?.level < 100) return res.status(403).json({ error: '權限不足' });
  try {
    await prisma.department.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete department (might be in use)' });
  }
});

// --- Roles ---
router.get('/roles', authenticateToken, async (req, res) => {
  try {
    const roles = await prisma.role.findMany({ orderBy: { level: 'desc' }});
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

router.post('/roles', authenticateToken, async (req, res) => {
  // @ts-ignore
  if (req.user?.level < 100) return res.status(403).json({ error: '權限不足' });
  try {
    const { name, level, description } = req.body;
    const role = await prisma.role.create({ data: { name, level: Number(level), description } });
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create role' });
  }
});

router.delete('/roles/:id', authenticateToken, async (req, res) => {
  // @ts-ignore
  if (req.user?.level < 100) return res.status(403).json({ error: '權限不足' });
  try {
    await prisma.role.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete role (might be in use)' });
  }
});

export default router;
