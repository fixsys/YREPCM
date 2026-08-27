import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = express.Router();
const prisma = new PrismaClient();

// GET all leads (accessible based on role)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userRole = req.user?.role || '';
    const userId = req.user?.id;

    let whereClause: any = {};
    if (!['SystemAdmin', 'Chairman', 'TopManagement'].includes(userRole)) {
      whereClause = {
        OR: [
          { assignee_id: userId },
          { created_by: userId }
        ]
      };
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        requirementTicket: true,
      },
      orderBy: { updated_at: 'desc' }
    });

    res.json(leads);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET single lead details
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const userRole = req.user?.role || '';
    const userId = req.user?.id;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        interactions: {
          orderBy: { created_at: 'desc' },
          include: { creator: { select: { id: true, name: true } } }
        },
        requirementTicket: {
          include: {
            budgetBook: {
              include: { quotation: true }
            }
          }
        },
      }
    });

    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Check visibility
    if (!['SystemAdmin', 'Chairman', 'TopManagement'].includes(userRole)) {
      if (lead.assignee_id !== userId && lead.created_by !== userId) {
        return res.status(403).json({ error: '您沒有權限檢視此名單' });
      }
    }

    res.json(lead);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// POST new lead
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name, company, site_name, phone, email, source, assignee_id, referrer_name } = req.body;
    const creatorId = req.user?.id!;

    // if user specifies assignee, use it, otherwise assign to creator
    const targetAssignee = assignee_id || creatorId;

    const lead = await prisma.lead.create({
      data: {
        name,
        company,
        site_name,
        phone,
        email,
        source: source || 'SELF',
        referrer_name,
        assignee_id: targetAssignee,
        created_by: creatorId,
        status: 'NEW'
      }
    });

    // Notify assignee if it's someone else
    if (targetAssignee !== creatorId) {
      await prisma.notification.create({
        data: {
          user_id: targetAssignee,
          title: '新潛在客戶指派',
          content: `您被指派了新的潛在客戶：${name}`,
          type: 'INFO',
          link: `/crm/leads/${lead.id}`
        }
      });
    }

    res.json(lead);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// PUT update lead
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const data = req.body;
    const userRole = req.user?.role || '';
    const userId = req.user?.id;

    const existingLead = await prisma.lead.findUnique({ where: { id } });
    if (!existingLead) return res.status(404).json({ error: 'Lead not found' });

    if (!['SystemAdmin', 'Chairman', 'TopManagement'].includes(userRole)) {
      if (existingLead.assignee_id !== userId && existingLead.created_by !== userId) {
        return res.status(403).json({ error: '您沒有權限修改此名單' });
      }
    }

    const lead = await prisma.lead.update({
      where: { id },
      data
    });
    res.json(lead);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE lead
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const userRole = req.user?.role || '';
    const userId = req.user?.id;

    const existingLead = await prisma.lead.findUnique({ where: { id } });
    if (!existingLead) return res.status(404).json({ error: 'Lead not found' });

    if (!['SystemAdmin', 'Chairman', 'TopManagement'].includes(userRole)) {
      if (existingLead.assignee_id !== userId && existingLead.created_by !== userId) {
        return res.status(403).json({ error: '您沒有權限刪除此名單' });
      }
    }

    // Prisma might throw constraint errors if there are interactions/requirements
    // Use transaction or cascading delete if needed, but since schema.prisma doesn't have onDelete: Cascade
    // we need to manually delete dependencies first.
    await prisma.$transaction([
      prisma.interactionLog.deleteMany({ where: { lead_id: id } }),
      prisma.requirementTicket.deleteMany({ where: { lead_id: id } }),
      prisma.lead.delete({ where: { id } })
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// POST interaction log
router.post('/:id/interactions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { action_type, summary, result, next_contact_date } = req.body;
    const creatorId = req.user?.id!;

    if (!next_contact_date) {
      return res.status(400).json({ error: '預計下次聯繫日期為必填 (強制防呆)' });
    }

    const interaction = await prisma.interactionLog.create({
      data: {
        lead_id: id,
        action_type,
        summary,
        result,
        next_contact_date: new Date(next_contact_date),
        created_by: creatorId
      }
    });

    // Update lead status if it was NEW
    const lead: any = await prisma.lead.findUnique({ where: { id } });
    if (lead?.status === 'NEW') {
      await prisma.lead.update({
        where: { id },
        data: { status: 'CONTACTED' }
      });
    }

    res.json(interaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add interaction log' });
  }
});

// POST requirement ticket
router.post('/:id/requirements', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const body = req.body;
    const creatorId = req.user?.id!;

    // Check if requirement already exists
    const existing = await prisma.requirementTicket.findUnique({ where: { lead_id: id } });
    if (existing) {
      return res.status(400).json({ error: '此潛在客戶已建立需求單' });
    }

    const toDecimal = (val: any) => val ? Number(val) : null;
    const toInt = (val: any) => val ? parseInt(val, 10) : null;

    const hasDesignAssignees = Array.isArray(body.design_survey_assignees) && body.design_survey_assignees.length > 0;
    const hasBudgetAssignees = Array.isArray(body.budget_analysis_assignees) && body.budget_analysis_assignees.length > 0;

    const designUsers = hasDesignAssignees ? await prisma.user.findMany({ where: { id: { in: body.design_survey_assignees } }, select: { name: true } }) : [];
    const budgetUsers = hasBudgetAssignees ? await prisma.user.findMany({ where: { id: { in: body.budget_analysis_assignees } }, select: { name: true } }) : [];

    const design_assignee_names = designUsers.map(u => u.name).join(', ') || null;
    const budget_assignee_names = budgetUsers.map(u => u.name).join(', ') || null;

    const ticket = await prisma.requirementTicket.create({
      data: {
        lead_id: id,
        created_by: creatorId,
        design_status: hasDesignAssignees ? '現勘中' : '待安排',
        budget_status: hasBudgetAssignees ? '分析中' : '待分析',
        design_assignee_names,
        budget_assignee_names,

        // 1
        contract_type: body.contract_type,
        grid_connection_type: body.grid_connection_type,
        module_model: body.module_model,
        module_count: toInt(body.module_count),
        installation_capacity: toDecimal(body.installation_capacity),
        power_type: body.power_type,
        land_area: toDecimal(body.land_area),
        has_existing_pv: Boolean(body.has_existing_pv),
        existing_pv_capacity: toDecimal(body.existing_pv_capacity),
        other_notes: body.other_notes,

        // 2
        foundation_type: body.foundation_type,
        concrete_strength: body.concrete_strength,

        // 3
        is_guaranteed_power: Boolean(body.is_guaranteed_power),
        guaranteed_power_percent: toDecimal(body.guaranteed_power_percent),
        required_height: body.required_height,
        required_slope: body.required_slope,
        required_span: body.required_span,
        required_spacing: body.required_spacing,
        wind_resistance: body.wind_resistance,
        is_coastal: Boolean(body.is_coastal),
        coastal_distance: toDecimal(body.coastal_distance),
        main_structure_column_type: body.main_structure_column_type,
        main_structure_column_material: body.main_structure_column_material,
        main_structure_column_surface: body.main_structure_column_surface,
        main_structure_beam_type: body.main_structure_beam_type,
        main_structure_beam_material: body.main_structure_beam_material,
        main_structure_beam_surface: body.main_structure_beam_surface,
        module_fixing_method: body.module_fixing_method,
        has_length_limit: Boolean(body.has_length_limit),
        length_limit_m: toDecimal(body.length_limit_m),

        // 4
        needs_corrugated_board: Boolean(body.needs_corrugated_board),
        corrugated_board_area: toDecimal(body.corrugated_board_area),
        corrugated_board_method: body.corrugated_board_method,
        corrugated_board_material: body.corrugated_board_material,
        corrugated_board_type: body.corrugated_board_type,
        corrugated_board_color: body.corrugated_board_color,

        // 5
        has_maintenance_walkway: Boolean(body.has_maintenance_walkway),
        maintenance_walkway_material: body.maintenance_walkway_material,
        maintenance_walkway_width: body.maintenance_walkway_width,
        safety_rope_material: body.safety_rope_material,
        safety_fence_type: body.safety_fence_type,
        climbing_equipment: body.climbing_equipment,

        // 6
        cable_brand: body.cable_brand,
        inverter_brand: body.inverter_brand,
        transformer: body.transformer,
        electrical_equipment: body.electrical_equipment,

        // 7
        panel_type: body.panel_type,
        panel_brand: body.panel_brand,
        waterproof_level: body.waterproof_level,
        panel_material: body.panel_material,
        panel_thickness: body.panel_thickness,
        panel_surface: body.panel_surface,

        // 8
        design_basis: body.design_basis,
        client_provided_files: body.client_provided_files,
        road_width: body.road_width,
        crane_tonnage: body.crane_tonnage,
        needs_excavation: Boolean(body.needs_excavation),
        excavation_depth: toDecimal(body.excavation_depth),
        new_distribution_site: body.new_distribution_site,

        // 9
        certification_drawing: body.certification_drawing,
        manufacturing_drawing: body.manufacturing_drawing,
        mep_drawing: body.mep_drawing,
        delivery_date: body.delivery_date ? new Date(body.delivery_date) : null
      }
    });

    // Update lead status
    await prisma.lead.update({
      where: { id },
      data: { status: 'REQUIREMENT' }
    });

    const lead: any = await prisma.lead.findUnique({ where: { id } });

    // Create assigned tasks
    const baseTaskName = `[尚未成案] ${lead.company ? lead.company + ' - ' : ''}${lead.name}`;
      
    if (Array.isArray(body.design_survey_assignees) && body.design_survey_assignees.length > 0) {
      await prisma.task.create({
        data: {
          name: `${baseTaskName} - 設計現勘`,
          description: '業務開發階段建立需求單自動產生之設計現勘任務',
          status: '未開始',
          task_type: 'PROJECT',
          assignees: {
            connect: body.design_survey_assignees.map((userId: string) => ({ id: userId }))
          }
        }
      });
    }

    if (Array.isArray(body.budget_analysis_assignees) && body.budget_analysis_assignees.length > 0) {
      await prisma.task.create({
        data: {
          name: `${baseTaskName} - 預算分析`,
          description: '業務開發階段建立需求單自動產生之預算分析任務',
          status: '未開始',
          task_type: 'PROJECT',
          assignees: {
            connect: body.budget_analysis_assignees.map((userId: string) => ({ id: userId }))
          }
        }
      });
    }

    // Notify Design and Budget departments
    // For simplicity, find users in Design ("設計部") and Budget ("聯合預算組") departments
    const notifyDepts = await prisma.user.findMany({
      where: {
        department: {
          name: { in: ['設計部', '聯合預算組'] }
        }
      }
    });

    const notifications = notifyDepts.map(u => ({
      user_id: u.id,
      title: '新客戶需求單成立',
      content: `業務已針對客戶「${lead?.name}」建立需求單，請安排後續評估。`,
      type: 'INFO',
      link: `/crm/leads/${id}`
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }

    res.json(ticket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create requirement ticket' });
  }
});

// POST convert requirement to project
router.post('/:id/convert', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { project_code, project_name, start_date } = req.body;
    const creatorId = req.user?.id!;

    const lead: any = await prisma.lead.findUnique({ 
      where: { id },
      include: { requirementTicket: true }
    });

    if (!lead || !lead.requirementTicket) {
      return res.status(400).json({ error: '無法轉換：無客戶需求單' });
    }

    if (lead.status === 'CONVERTED') {
      return res.status(400).json({ error: '此名單已經轉換為專案' });
    }

    // Create Project
    const project = await prisma.project.create({
      data: {
        project_code,
        name: project_name || `${lead.name} 專案`,
        status: '評估中',
        start_date: start_date ? new Date(start_date) : new Date(),
        content: `從潛在客戶 ${lead.name} 轉換。案場地址: ${lead.requirementTicket.address || '無'}。特殊需求: ${lead.requirementTicket.special_requirements || '無'}`,
        sales_rep_id: lead.assignee_id
      }
    });

    // Update Lead status
    await prisma.lead.update({
      where: { id },
      data: { status: 'CONVERTED' }
    });

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to convert to project' });
  }
});

// GET daily log auto-generation string
router.get('/utils/daily-log-auto', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const creatorId = req.user?.id!;
    
    // Get today's start and end
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's interactions
    const interactions = await prisma.interactionLog.findMany({
      where: {
        created_by: creatorId,
        created_at: { gte: today, lt: tomorrow }
      },
      include: { lead: true }
    });

    // Get today's new leads
    const newLeads = await prisma.lead.findMany({
      where: {
        created_by: creatorId,
        created_at: { gte: today, lt: tomorrow }
      }
    });

    let autoText = '【今日業務開發紀錄自動彙整】\r\n';
    
    if (newLeads.length > 0) {
      autoText += `\r\n[新增潛在名單] (共 ${newLeads.length} 筆)\r\n`;
      newLeads.forEach(l => {
        autoText += `- ${l.name} (${l.company || '無公司'}) | 案源: ${l.source}\r\n`;
      });
    }

    if (interactions.length > 0) {
      autoText += `\r\n[今日互動與追蹤] (共 ${interactions.length} 筆)\r\n`;
      interactions.forEach(i => {
        autoText += `- 客戶 ${i.lead.name}: 進行 ${i.action_type}，摘要: ${i.summary}。下次預計聯繫: ${new Date(i.next_contact_date).toLocaleDateString()}\r\n`;
      });
    }

    if (newLeads.length === 0 && interactions.length === 0) {
      autoText += '\r\n今日尚無新增名單或互動紀錄。';
    }

    res.json({ autoText });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate auto log' });
  }
});

// POST save daily log (sends notification to managers)
router.post('/utils/daily-log-save', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const creatorId = req.user?.id!;
    const creatorName = (req.user as any)?.name || '業務人員';
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: '日誌內容不可為空' });
    }

    // Find managers (Chairman, TopManagement)
    const managers = await prisma.user.findMany({
      where: {
        role: { name: { in: ['Chairman', 'TopManagement', 'SystemAdmin'] } }
      }
    });

    const notifications = managers.map(m => ({
      user_id: m.id,
      title: `${creatorName} 的今日業務開發日誌`,
      content: content,
      type: 'INFO',
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }
    
    // Save to SalesDailyLog
    await prisma.salesDailyLog.create({
      data: {
        content,
        creator_id: creatorId
      }
    });

    res.json({ success: true, count: notifications.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save daily log' });
  }
});

// GET sales daily logs history
router.get('/utils/daily-logs', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id!;
    const userRole = req.user?.role || '';
    
    // Admins and managers can see all logs, normal users see their own
    let whereClause = {};
    if (!['SystemAdmin', 'Chairman', 'TopManagement'].includes(userRole)) {
      whereClause = { creator_id: userId };
    }

    const logs = await prisma.salesDailyLog.findMany({
      where: whereClause,
      include: {
        creator: { select: { name: true, department: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 20 // Limit to recent 20 for now
    });

    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch daily logs' });
  }
});

// PUT requirement ticket
router.put('/:id/requirements', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const body = req.body;

    const existingLead = await prisma.lead.findUnique({ where: { id }, include: { requirementTicket: true } });
    if (!existingLead || !existingLead.requirementTicket) return res.status(404).json({ error: 'Lead or ticket not found' });

    const toDecimal = (val: any) => val ? Number(val) : null;
    const toInt = (val: any) => val ? parseInt(val, 10) : null;

    const ticket = await prisma.requirementTicket.update({
      where: { lead_id: id },
      data: {
        // 1
        contract_type: body.contract_type,
        grid_connection_type: body.grid_connection_type,
        module_model: body.module_model,
        module_count: toInt(body.module_count),
        installation_capacity: toDecimal(body.installation_capacity),
        power_type: body.power_type,
        land_area: toDecimal(body.land_area),
        has_existing_pv: Boolean(body.has_existing_pv),
        existing_pv_capacity: toDecimal(body.existing_pv_capacity),
        other_notes: body.other_notes,

        // 2
        foundation_type: body.foundation_type,
        concrete_strength: body.concrete_strength,

        // 3
        is_guaranteed_power: Boolean(body.is_guaranteed_power),
        guaranteed_power_percent: toDecimal(body.guaranteed_power_percent),
        required_height: body.required_height,
        required_slope: body.required_slope,
        required_span: body.required_span,
        required_spacing: body.required_spacing,
        wind_resistance: body.wind_resistance,
        is_coastal: Boolean(body.is_coastal),
        coastal_distance: toDecimal(body.coastal_distance),
        main_structure_column_type: body.main_structure_column_type,
        main_structure_column_material: body.main_structure_column_material,
        main_structure_column_surface: body.main_structure_column_surface,
        main_structure_beam_type: body.main_structure_beam_type,
        main_structure_beam_material: body.main_structure_beam_material,
        main_structure_beam_surface: body.main_structure_beam_surface,
        module_fixing_method: body.module_fixing_method,
        has_length_limit: Boolean(body.has_length_limit),
        length_limit_m: toDecimal(body.length_limit_m),

        // 4
        needs_corrugated_board: Boolean(body.needs_corrugated_board),
        corrugated_board_area: toDecimal(body.corrugated_board_area),
        corrugated_board_method: body.corrugated_board_method,
        corrugated_board_material: body.corrugated_board_material,
        corrugated_board_type: body.corrugated_board_type,
        corrugated_board_color: body.corrugated_board_color,

        // 5
        has_maintenance_walkway: Boolean(body.has_maintenance_walkway),
        maintenance_walkway_material: body.maintenance_walkway_material,
        maintenance_walkway_width: body.maintenance_walkway_width,
        safety_rope_material: body.safety_rope_material,
        safety_fence_type: body.safety_fence_type,
        climbing_equipment: body.climbing_equipment,

        // 6
        cable_brand: body.cable_brand,
        inverter_brand: body.inverter_brand,
        transformer: body.transformer,
        electrical_equipment: body.electrical_equipment,

        // 7
        panel_type: body.panel_type,
        panel_brand: body.panel_brand,
        waterproof_level: body.waterproof_level,
        panel_material: body.panel_material,
        panel_thickness: body.panel_thickness,
        panel_surface: body.panel_surface,

        // 8
        design_basis: body.design_basis,
        client_provided_files: body.client_provided_files,
        road_width: body.road_width,
        crane_tonnage: body.crane_tonnage,
        needs_excavation: Boolean(body.needs_excavation),
        excavation_depth: toDecimal(body.excavation_depth),
        new_distribution_site: body.new_distribution_site,

        // 9
        certification_drawing: body.certification_drawing,
        manufacturing_drawing: body.manufacturing_drawing,
        mep_drawing: body.mep_drawing,
        delivery_date: body.delivery_date ? new Date(body.delivery_date) : null
      }
    });

    res.json(ticket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update requirement ticket' });
  }
});

// POST Convert to Project
router.post('/:id/convert-to-project', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { capacity } = req.body;
    
    const existingLead = await prisma.lead.findUnique({ where: { id }, include: { requirementTicket: true } });
    if (!existingLead) return res.status(404).json({ error: 'Lead not found' });
    if (!existingLead.requirementTicket) return res.status(400).json({ error: 'Cannot convert without requirement ticket' });

    // When sales converts to project, we assign a temporary code and "待接洽" status
    const tempCode = `TEMP-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const projectCode = tempCode;

    const newProject = await prisma.project.create({
      data: {
        project_code: projectCode,
        name: existingLead.site_name || existingLead.company || existingLead.name,
        owner: existingLead.company || existingLead.name,
        status: '待接洽',
        capacity: capacity || null,
        sales_rep_id: existingLead.assignee_id,
        content: `轉自業務開發潛在客戶: ${existingLead.name}. \r\n承攬形式: ${existingLead.requirementTicket.contract_type || '未填'}\r\n設置容量: ${capacity || '未填'} kW`,
      }
    });

    await prisma.requirementTicket.update({
      where: { id: existingLead.requirementTicket.id },
      data: { project_id: newProject.id }
    });

    await prisma.lead.update({
      where: { id },
      data: { status: 'CONVERTED' }
    });

    res.json(newProject);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to convert to project' });
  }
});

export default router;
