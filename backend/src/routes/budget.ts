import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get budget requirement tickets
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // For now, fetch tickets that are assigned to this user, or if admin fetch all.
    const isAdmin = ['SystemAdmin', 'Chairman', 'TopManagement'].includes(user.role);
    
    const requirements = await prisma.requirementTicket.findMany({
      where: isAdmin ? {} : {
        budget_assignee_names: { contains: user.account }
      },
      include: {
        lead: {
          include: {
            assignee: { select: { id: true, name: true } }
          }
        },
        budgetBook: {
          include: { quotation: true }
        }
      },
      orderBy: { lead: { created_at: 'desc' } }
    });

    res.json(requirements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch budget tickets' });
  }
});

// Takeover ticket
router.post('/:id/takeover', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const ticket = await prisma.requirementTicket.update({
      where: { id },
      data: { budget_status: '分析中' }
    });
    res.json(ticket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to takeover' });
  }
});

// Reject ticket
router.post('/:id/reject', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const ticket = await prisma.requirementTicket.update({
      where: { id },
      data: { budget_status: '退回修正' }
    });
    res.json(ticket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject' });
  }
});

// Save or Update BudgetBook
router.post('/:id/budget-book', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { items, total_amount, notes, analysis_data } = req.body;

    const budgetBook = await prisma.budgetBook.upsert({
      where: { requirement_ticket_id: id },
      update: { items, total_amount, notes, analysis_data },
      create: {
        requirement_ticket_id: id,
        items,
        total_amount,
        notes,
        analysis_data
      }
    });
    res.json(budgetBook);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save budget book' });
  }
});

// Save or Update Quotation
router.post('/:id/quotation', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { items, total_price, notes } = req.body;

    // Ensure budget book exists
    let budgetBook = await prisma.budgetBook.findUnique({
      where: { requirement_ticket_id: id }
    });
    
    if (!budgetBook) {
      budgetBook = await prisma.budgetBook.create({
        data: { requirement_ticket_id: id }
      });
    }

    const quotation = await prisma.quotation.upsert({
      where: { budget_id: budgetBook.id },
      update: { items, total_price, notes },
      create: {
        budget_id: budgetBook.id,
        items,
        total_price,
        notes
      }
    });
    res.json(quotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save quotation' });
  }
});

// Complete and return to sales
router.post('/:id/complete', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const ticket = await prisma.requirementTicket.update({
      where: { id },
      data: { budget_status: '已完成' }
    });
    res.json(ticket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to complete' });
  }
});

export default router;
