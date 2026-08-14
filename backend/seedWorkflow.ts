import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Standard Project Workflow Template...');

  // 1. Delete existing templates to start fresh
  await prisma.workflowEdge.deleteMany({});
  await prisma.workflowNode.deleteMany({});
  await prisma.workflowTemplate.deleteMany({});

  // 2. Create Template
  const template = await prisma.workflowTemplate.create({
    data: {
      name: '跨部門協作標準流程',
      description: '嚴格依照 PDF 定義的標準作業流程。',
      is_active: true
    }
  });

  const nodesData = [
    // Column 1: 業務部 (x=100)
    { id: 'n1', name: '接到專案', x: 100, y: 150, type: 'START' },
    { id: 'n2', name: '現場測量(業務)', x: 100, y: 250, type: 'TASK' },
    { id: 'n3', name: '評估是否成案', x: 100, y: 350, type: 'CONDITION' },
    { id: 'n4', name: '未成案', x: 250, y: 350, type: 'END' },
    { id: 'n5', name: '蒐集資訊', x: 100, y: 450, type: 'TASK' },
    { id: 'n6', name: '合約擬定', x: -50, y: 550, type: 'TASK' },
    { id: 'n7', name: '報價單/預算書', x: 100, y: 550, type: 'TASK' },
    { id: 'n8', name: '施工規範/進度表', x: 250, y: 550, type: 'TASK' },
    { id: 'n9', name: '合約書用印', x: 100, y: 650, type: 'TASK' },
    { id: 'n10', name: '業主確認是否簽約', x: 100, y: 750, type: 'CONDITION' },
    { id: 'n11', name: '專案成立', x: 100, y: 850, type: 'TASK' },
    { id: 'n12', name: '各部門開始處理', x: 100, y: 950, type: 'TASK' },

    // Column 2: 設計部 (x=400)
    { id: 'd1', name: '現場測量(設計)', x: 400, y: 250, type: 'TASK' },
    { id: 'd2', name: '設計專案成立', x: 400, y: 350, type: 'TASK' },
    { id: 'd3', name: '測量成果圖', x: 400, y: 450, type: 'TASK' },
    { id: 'd4', name: '業主確認無誤', x: 400, y: 550, type: 'CONDITION' },
    { id: 'd5', name: '結構計算書', x: 400, y: 650, type: 'TASK' },
    { id: 'd6', name: '業主確認無誤2', x: 400, y: 750, type: 'CONDITION' },
    { id: 'd7', name: '技師確認無誤', x: 400, y: 850, type: 'CONDITION' },
    { id: 'd8', name: '簽證圖', x: 400, y: 950, type: 'TASK' },
    { id: 'd9', name: '建模', x: 400, y: 1050, type: 'TASK' },
    { id: 'd10', name: '板材圖面', x: 400, y: 1150, type: 'TASK' },
    { id: 'd11', name: '一次加工圖面', x: 400, y: 1250, type: 'TASK' },
    { id: 'd12', name: '雷射切割', x: 400, y: 1350, type: 'TASK' },
    { id: 'd13', name: '鋼板一次', x: 400, y: 1450, type: 'TASK' },
    { id: 'd14', name: '二次加工圖', x: 400, y: 1550, type: 'TASK' },
    { id: 'd15', name: 'BOM表', x: 400, y: 1650, type: 'TASK' },
    { id: 'd16', name: '工程圖說', x: 400, y: 1750, type: 'TASK' },

    // Column 3: 採購組 (x=700)
    { id: 'p1', name: '施工進度表+BOM...', x: 700, y: 150, type: 'TASK' },
    { id: 'p2', name: '材料庫存盤點', x: 700, y: 250, type: 'TASK' },
    { id: 'p3', name: '工具盤點', x: 700, y: 350, type: 'TASK' },
    { id: 'p4', name: '確認採購排程', x: 700, y: 450, type: 'TASK' },
    { id: 'p5', name: '請購作業', x: 700, y: 550, type: 'TASK' },
    { id: 'p6', name: '出貨作業', x: 700, y: 650, type: 'TASK' },

    // Column 4: 鋼構部 (x=1000)
    { id: 's1', name: '一二次加工圖...', x: 1000, y: 150, type: 'TASK' },
    { id: 's2', name: '進料', x: 1000, y: 250, type: 'TASK' },
    { id: 's3', name: '鋼構部圖面審核', x: 1000, y: 350, type: 'TASK' },
    { id: 's4', name: '是否無異常', x: 1000, y: 450, type: 'CONDITION' },
    { id: 's5', name: '一次加工(鋼板)', x: 1000, y: 550, type: 'TASK' },
    { id: 's6', name: '自檢無異常1', x: 1000, y: 650, type: 'CONDITION' },
    { id: 's7', name: '二次加工(構件)', x: 1000, y: 750, type: 'TASK' },
    { id: 's8', name: '自檢無異常2', x: 1000, y: 850, type: 'CONDITION' },
    { id: 's9', name: '工務抽檢無異常', x: 1000, y: 950, type: 'CONDITION' },
    { id: 's10', name: '鍍鋅作業', x: 1000, y: 1050, type: 'TASK' },
    { id: 's11', name: '出貨至現場', x: 1000, y: 1150, type: 'TASK' },

    // Column 5: 工務部 (x=1300)
    { id: 'e1', name: '工程圖說+進度...', x: 1300, y: 150, type: 'TASK' },
    { id: 'e2', name: '工程發包', x: 1300, y: 250, type: 'TASK' },
    { id: 'e3', name: '現場派工/施工', x: 1300, y: 350, type: 'TASK' },
    { id: 'e4', name: '施工查驗', x: 1300, y: 450, type: 'TASK' },
    { id: 'e5', name: '是否無異常', x: 1300, y: 550, type: 'CONDITION' },
    { id: 'e6', name: '完工並聯', x: 1300, y: 650, type: 'TASK' },

    // Column 6: 所有部門 (x=1600)
    { id: 'c1', name: '竣工', x: 1600, y: 150, type: 'TASK' },
    { id: 'c2', name: '竣工報告書', x: 1600, y: 250, type: 'TASK' },
    { id: 'c3', name: '專案成本結算', x: 1600, y: 350, type: 'TASK' },
    { id: 'c4', name: '結案會議', x: 1600, y: 450, type: 'TASK' },
    { id: 'c5', name: '後續運維計畫', x: 1600, y: 550, type: 'END' }
  ];

  // Insert nodes
  for (const node of nodesData) {
    await prisma.workflowNode.create({
      data: {
        id: node.id,
        template_id: template.id,
        name: node.name,
        type: node.type,
        position_x: node.x,
        position_y: node.y,
      }
    });
  }

  // Define edges with strict handle positions
  // default: bottom -> top
  const E = (s: string, t: string, sh: string = 'bottom', th: string = 'top', label?: string) => ({
    s, t, sh, th, condition: label || null
  });

  const edgesData = [
    // Col 1
    E('n1', 'n2'),
    E('n2', 'd1', 'right', 'left'),
    E('n2', 'n3'),
    E('n3', 'n4', 'right', 'left', '否'),
    E('n3', 'n5', 'bottom', 'top', '是'),
    E('n5', 'n6', 'bottom', 'top'),
    E('n5', 'n7', 'bottom', 'top'),
    E('n5', 'n8', 'bottom', 'top'),
    E('n6', 'n9', 'bottom', 'top'),
    E('n7', 'n9', 'bottom', 'top'),
    E('n8', 'n9', 'bottom', 'top'),
    E('n9', 'n10'),
    E('n10', 'n11', 'bottom', 'top', '是'),
    E('n10', 'n3', 'left', 'left', '否'), // Loop back up
    E('n11', 'n12'),

    // Col 2
    E('d1', 'd2'),
    E('d2', 'd3'),
    E('d3', 'd4'),
    E('d4', 'd5', 'bottom', 'top', '無誤'),
    E('d5', 'd6'),
    E('d6', 'd7', 'bottom', 'top', '無誤'),
    E('d7', 'd8', 'bottom', 'top', '無誤'),
    E('d8', 'd9'),
    E('d9', 'd10'),
    E('d10', 'd11'),
    E('d11', 'd12'),
    E('d12', 'd13'),
    E('d13', 'd14'),
    E('d14', 'd15'),
    E('d15', 'd16'),

    // Connect Phase 2 to Phase 3
    E('d16', 'p1', 'bottom', 'left'),
    E('d16', 's1', 'bottom', 'left'),
    E('d16', 'e1', 'bottom', 'left'),

    // Col 3
    E('p1', 'p2'),
    E('p2', 'p3'),
    E('p3', 'p4'),
    E('p4', 'p5'),
    E('p5', 'p6'),

    // Col 4
    E('s1', 's2'),
    E('s2', 's3'),
    E('s3', 's4'),
    E('s4', 's5', 'bottom', 'top', '無異常'),
    E('s4', 's3', 'right', 'right', '異常'),
    E('s5', 's6'),
    E('s6', 's7', 'bottom', 'top', '無異常'),
    E('s6', 's5', 'right', 'right', '異常'),
    E('s7', 's8'),
    E('s8', 's9', 'bottom', 'top', '無異常'),
    E('s8', 's7', 'right', 'right', '異常'),
    E('s9', 's10', 'bottom', 'top', '無異常'),
    E('s9', 's7', 'right', 'right', '異常'),
    E('s10', 's11'),

    // Col 5
    E('e1', 'e2'),
    E('e2', 'e3'),
    E('e3', 'e4'),
    E('e4', 'e5'),
    E('e5', 'e6', 'bottom', 'top', '無異常'),
    E('e5', 'e3', 'right', 'right', '異常'),

    // Connect Phase 3 to Phase 4
    E('p6', 'c1', 'right', 'left'),
    E('s11', 'c1', 'right', 'left'),
    E('e6', 'c1', 'right', 'left'),

    // Col 6
    E('c1', 'c2'),
    E('c2', 'c3'),
    E('c3', 'c4'),
    E('c4', 'c5')
  ];

  for (const edge of edgesData) {
    await prisma.workflowEdge.create({
      data: {
        template_id: template.id,
        source_node_id: edge.s,
        target_node_id: edge.t,
        source_handle: edge.sh,
        target_handle: edge.th,
        condition: edge.condition
      }
    });
  }

  console.log('Template created successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
