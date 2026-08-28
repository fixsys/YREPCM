import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// Get all templates
router.get('/templates', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const templates = await prisma.workflowTemplate.findMany({
      include: {
        nodes: true,
        edges: true,
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(templates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取流程模板失敗' });
  }
});

// Save or Update a template (Visual Builder uses this)
router.post('/templates', authenticateToken, async (req: AuthRequest, res) => {
  if ((!req.user?.level || req.user.level < 100)) return res.status(403).json({ error: '權限不足' });

  const { id, name, description, nodes, edges } = req.body;
  try {
    let template;
    if (id) {
      template = await prisma.workflowTemplate.findUnique({ where: { id } });
    }

    if (template) {
      // Clear old nodes and edges
      await prisma.workflowEdge.deleteMany({ where: { template_id: template.id } });
      await prisma.workflowNode.deleteMany({ where: { template_id: template.id } });
      
      template = await prisma.workflowTemplate.update({
        where: { id: template.id },
        data: { name, description }
      });
    } else {
      template = await prisma.workflowTemplate.create({
        data: { name, description }
      });
    }

    // Insert new nodes
    const nodePromises = nodes.map((n: any) => prisma.workflowNode.create({
      data: {
        id: n.id,
        template_id: template!.id,
        name: n.name,
        type: n.type || 'TASK',
        department_id: n.department_id || null,
        position_x: n.position_x || 0,
        position_y: n.position_y || 0,
      }
    }));
    await Promise.all(nodePromises);

    // Insert new edges
    const edgePromises = edges.map((e: any) => prisma.workflowEdge.create({
      data: {
        id: e.id,
        template_id: template!.id,
        source_node_id: e.source_node_id,
        target_node_id: e.target_node_id,
        source_handle: e.source_handle || null,
        target_handle: e.target_handle || null,
        condition: e.condition || null
      }
    }));
    await Promise.all(edgePromises);

    res.json({ message: '模板儲存成功', templateId: template.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '儲存模板失敗' });
  }
});

// Delete a template
router.delete('/templates/:id', authenticateToken, async (req: AuthRequest, res) => {
  if ((!req.user?.level || req.user.level < 100)) return res.status(403).json({ error: '權限不足' });
  try {
    const id = req.params.id as string;
    // ensure no project is using it
    const inUse = await prisma.projectWorkflow.findFirst({ where: { template_id: id }});
    if (inUse) return res.status(400).json({ error: '此樣板已被專案使用，無法刪除' });

    await prisma.workflowEdge.deleteMany({ where: { template_id: id }});
    await prisma.workflowNode.deleteMany({ where: { template_id: id }});
    await prisma.workflowTemplate.delete({ where: { id }});
    res.json({ message: '模板已刪除' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '刪除模板失敗' });
  }
});

export default router;
