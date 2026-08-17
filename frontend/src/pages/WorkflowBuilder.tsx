import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  ReactFlowProvider,
  BackgroundVariant,
  useReactFlow
} from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Settings, Save, LayoutTemplate, PlusCircle, CheckCircle2, Circle, Trash2, Trash, ChevronDown, ChevronRight, Menu } from 'lucide-react';
import { nodeTypes } from '../components/workflow/CustomNodes';
import dagre from 'dagre';

const TASK_CATALOG = [
  {
    department: '業務部+預算組+法務部',
    tasks: [
      '接到專案',
      '現場測量 協作:設計部',
      '評估是否成案',
      '蒐集資訊',
      '合約擬定 (請款節點/施作項目) 協作:法務部',
      '報價單/預算書 協作:預算組+採購組',
      '施工規範 施工進度表 勞安衛計畫書 協作:工務部',
      '合約書用印 協作:法務部',
      '業主確認是否簽約',
      '專案成立',
      '各部門開始處理該專案'
    ]
  },
  {
    department: '設計部',
    tasks: [
      '現場測量 協作:業務部',
      '專案成立',
      '測量成果圖',
      '業主確認是否無誤',
      '結構計算書',
      '業主確認是否無誤',
      '技師確認是否無誤',
      '簽證圖',
      '建模',
      '板材圖面',
      '一次加工圖面',
      '雷射切割',
      '鋼板一次',
      '二次加工圖',
      'BOM表',
      '工程圖說'
    ]
  },
  {
    department: '採購組+倉管組',
    tasks: [
      '施工進度表+BOM表 施工規範+預算書 協作:工務+設計+預算組',
      '材料庫存盤點 協作:倉管',
      '工具盤點',
      '確認採購排程 (對應現場進度) 協作:工務部',
      '請購作業',
      '出貨 現場or廠內加工or倉庫協助出貨'
    ]
  },
  {
    department: '鋼構部',
    tasks: [
      '一二次加工圖+雷射切割機程式碼+施工規範+派工單 協作:設計部+工務部',
      '進料 協作:採購',
      '鋼構部圖面審核',
      '是否無異常',
      '一次加工 鋼板、H鋼 (零件加工)',
      '自檢 是否無異常',
      '二次加工 (構件製造)',
      '自檢 是否無異常',
      '工務抽檢 是否無異常',
      '鍍鋅作業',
      '出貨至工程現場'
    ]
  },
  {
    department: '工務部',
    tasks: [
      '工程圖說+施工進度表+施工規範+BOM表 協作:設計部',
      '工程發包',
      '現場派工/施工',
      '施工查驗',
      '是否無異常',
      '完工並聯'
    ]
  },
  {
    department: '所有部門',
    tasks: [
      '竣工',
      '竣工報告書',
      '專案成本結算',
      '結案會議',
      '後續運維計畫'
    ]
  }
];

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 280;
const nodeHeight = 160;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  dagreGraph.setGraph({ rankdir: direction, ranksep: 80, nodesep: 50 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

const WorkflowBuilderInner = () => {
  const { user, token } = useAuthStore();
  const { fitView, screenToFlowPosition } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  
  // Left Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openSection, setOpenSection] = useState<string | null>('業務部+預算組+法務部');

  useEffect(() => {
    // Fetch users
    const fetchUsers = async () => {
      try {
        const res = await axios.get('/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSystemUsers(res.data);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      }
    };
    if (token) fetchUsers();

    // Initial empty state, but fit view just in case
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 800 });
    }, 100);
  }, [token, fitView]);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, type: 'smoothstep', style: { stroke: '#94a3b8', strokeWidth: 2 } }, eds));
  }, [setEdges]);

  const onSelectionChange = useCallback((elements: { nodes: Node[]; edges: Edge[] }) => {
    setSelectedNode(elements.nodes[0] || null);
    setSelectedEdge(elements.edges[0] || null);
  }, []);

  const handleAutoLayout = () => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, 'LR');
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 800 });
    }, 100);
  };

  const handleClearAll = () => {
    if (confirm('確定要清空畫布嗎？此操作無法復原。')) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  const handleDeleteEdge = () => {
    if (!selectedEdge) return;
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
    setSelectedEdge(null);
  };

  const handleSubtaskToggle = (subtaskId: string) => {
    if (!selectedNode) return;

    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          const subtasks = (node.data.subtasks as any[]) || [];
          const updatedSubtasks = subtasks.map(t => 
            t.id === subtaskId ? { ...t, completed: !t.completed } : t
          );
          
          const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(t => t.completed);
          const anyCompleted = updatedSubtasks.some(t => t.completed);
          let newStatus = node.data.status;
          
          if (allCompleted) newStatus = 'completed';
          else if (anyCompleted) newStatus = 'in-progress';
          else newStatus = 'pending';

          const newData = { ...node.data, subtasks: updatedSubtasks, status: newStatus };
          setSelectedNode({ ...node, data: newData });
          return { ...node, data: newData };
        }
        return node;
      })
    );
  };

  const handleSubtaskRename = (subtaskId: string, newTitle: string) => {
    if (!selectedNode) return;
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          const subtasks = (node.data.subtasks as any[]) || [];
          const updatedSubtasks = subtasks.map(t => 
            t.id === subtaskId ? { ...t, title: newTitle } : t
          );
          const newData = { ...node.data, subtasks: updatedSubtasks };
          setSelectedNode({ ...node, data: newData });
          return { ...node, data: newData };
        }
        return node;
      })
    );
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!selectedNode) return;
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          const subtasks = (node.data.subtasks as any[]) || [];
          const updatedSubtasks = subtasks.filter(t => t.id !== subtaskId);
          
          const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(t => t.completed);
          const anyCompleted = updatedSubtasks.some(t => t.completed);
          let newStatus = 'pending';
          if (updatedSubtasks.length > 0) {
            if (allCompleted) newStatus = 'completed';
            else if (anyCompleted) newStatus = 'in-progress';
          }
          
          const newData = { ...node.data, subtasks: updatedSubtasks, status: newStatus };
          setSelectedNode({ ...node, data: newData });
          return { ...node, data: newData };
        }
        return node;
      })
    );
  };

  const handleNodeDataChange = (key: string, value: string) => {
    if (!selectedNode) return;
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          const newData = { ...node.data, [key]: value };
          setSelectedNode({ ...node, data: newData });
          return { ...node, data: newData };
        }
        return node;
      })
    );
  };

  const handleEdgeDataChange = (key: string, value: boolean) => {
    if (!selectedEdge) return;
    setEdges((eds) => 
      eds.map((edge) => {
        if (edge.id === selectedEdge.id) {
          const newEdge = { ...edge };
          if (key === 'animated') newEdge.animated = value;
          if (key === 'dashed') {
            newEdge.style = { ...newEdge.style, strokeDasharray: value ? '5,5' : 'none' };
          }
          setSelectedEdge(newEdge);
          return newEdge;
        }
        return edge;
      })
    );
  };

  const handleAddSubtask = () => {
    if (!selectedNode) return;
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          const subtasks = (node.data.subtasks as any[]) || [];
          const updatedSubtasks = [...subtasks, { id: `t_${Date.now()}`, title: '新子任務', completed: false }];
          const newData = { ...node.data, subtasks: updatedSubtasks, status: 'pending' };
          setSelectedNode({ ...node, data: newData });
          return { ...node, data: newData };
        }
        return node;
      })
    );
  };

  // Drag and Drop Logic
  const onDragStart = (event: React.DragEvent, department: string, task: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ department, task }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const typeStr = event.dataTransfer.getData('application/reactflow');
      
      if (!typeStr || !reactFlowBounds) return;
      
      const parsedData = JSON.parse(typeStr);
      
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: 'taskNode',
        position,
        data: { 
          department: parsedData.department, 
          task: parsedData.task, 
          assignee: '', 
          status: 'pending', 
          subtasks: [] 
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  const onClickAdd = (department: string, task: string) => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'taskNode',
      position: { x: Math.random() * 200, y: Math.random() * 200 + 100 },
      data: { 
        department, 
        task, 
        assignee: '', 
        status: 'pending', 
        subtasks: [] 
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  if (user?.role !== 'SystemAdmin') {
    return <div className="p-8 text-center text-red-500 font-medium">權限不足，僅限系統管理員存取。</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] space-y-4">
      {/* Top Bar */}
      <div className="flex justify-between items-center bg-[#1e1e1e] p-4 rounded-xl shadow-lg border border-[#333]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-slate-400 hover:text-white hover:bg-[#333] rounded transition-colors"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-xl font-bold text-white tracking-widest">階段式工作流設計器</h1>
          <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded border border-blue-500/20">
            Dagre 自動排版模式
          </span>
        </div>
        
        <div className="flex gap-3">
          <button onClick={handleAutoLayout} className="bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors border border-[#444]">
            <LayoutTemplate size={16} /> 自動排版
          </button>
          <button onClick={handleClearAll} className="bg-red-900/50 hover:bg-red-800/80 text-red-200 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors border border-red-500/30">
            <Trash2 size={16} /> 清空畫布
          </button>
          <div className="w-px bg-[#333] mx-1"></div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-lg shadow-blue-900/50">
            <Save size={16} /> 儲存為樣板
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left Sidebar - Task Catalog Drawer */}
        <div className={`bg-[#1e1e1e] rounded-xl shadow-lg border border-[#333] flex flex-col transition-all duration-300 overflow-hidden shrink-0 ${isSidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 border-none'}`}>
          <div className="p-4 border-b border-[#333] bg-[#121212] shrink-0">
            <h3 className="font-bold text-slate-300 text-sm uppercase tracking-wider">部門協作任務庫</h3>
            <p className="text-[10px] text-slate-500 mt-1">拖曳卡片或點擊即可加入畫布</p>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {TASK_CATALOG.map((cat) => (
              <div key={cat.department} className="border-b border-[#333]">
                <button 
                  onClick={() => setOpenSection(openSection === cat.department ? null : cat.department)}
                  className="w-full text-left px-4 py-3 bg-[#1e1e1e] hover:bg-[#252525] text-sm font-bold text-white flex justify-between items-center transition-colors"
                >
                  <span className="truncate pr-2">{cat.department}</span>
                  {openSection === cat.department ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                </button>
                {openSection === cat.department && (
                  <div className="p-3 bg-[#121212] flex flex-col gap-2">
                    {cat.tasks.map(task => (
                      <div 
                        key={task}
                        draggable
                        onDragStart={(e) => onDragStart(e, cat.department, task)}
                        onClick={() => onClickAdd(cat.department, task)}
                        className="p-3 bg-white/5 border border-white/10 rounded cursor-grab active:cursor-grabbing hover:bg-blue-500/10 hover:border-blue-500/50 transition-all group"
                      >
                         <div className="text-xs text-slate-200 leading-snug group-hover:text-blue-300 transition-colors">
                           {task}
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-[#0a0a0a] rounded-xl shadow-lg border border-[#333] overflow-hidden relative">
          <div className="w-full h-full" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              colorMode="dark"
              deleteKeyCode={['Backspace', 'Delete']}
            >
              <Background color="#222" variant={BackgroundVariant.Dots} gap={24} />
              <Controls className="bg-[#1e1e1e] border-[#333] fill-white" />
              <MiniMap 
                nodeColor={(n) => {
                  if (n.data?.status === 'completed') return '#10b981';
                  if (n.data?.status === 'in-progress') return '#3b82f6';
                  return '#475569';
                }} 
                maskColor="rgba(0, 0, 0, 0.8)"
                style={{ backgroundColor: '#121212' }}
              />
            </ReactFlow>
          </div>
        </div>

        {/* Right Sidebar Drawer - Node & Edge properties */}
        <div className={`bg-[#1e1e1e] rounded-xl shadow-lg border border-[#333] flex flex-col transition-all duration-300 shrink-0 ${selectedNode || selectedEdge ? 'w-80 opacity-100' : 'w-0 opacity-0 border-none hidden'}`}>
          
          {selectedEdge && !selectedNode ? (
            <div className="w-80 flex flex-col h-full">
              <div className="p-5 border-b border-[#333]">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Settings size={18} className="text-slate-400" />
                    <h3 className="font-bold text-white tracking-wider">連線屬性設定</h3>
                  </div>
                  <button onClick={handleDeleteEdge} className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-400/10 rounded transition-colors" title="刪除連線">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="text-xs text-slate-400">目前選取：流程連線</div>
              </div>

              <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#121212] border border-[#333] rounded-lg">
                    <span className="text-sm text-slate-200">動態流水動畫 (Animated)</span>
                    <input 
                      type="checkbox" 
                      checked={!!selectedEdge.animated} 
                      onChange={(e) => handleEdgeDataChange('animated', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#121212] border border-[#333] rounded-lg">
                    <span className="text-sm text-slate-200">虛線樣式 (Dashed)</span>
                    <input 
                      type="checkbox" 
                      checked={selectedEdge.style?.strokeDasharray === '5,5'} 
                      onChange={(e) => handleEdgeDataChange('dashed', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : selectedNode ? (
            <div className="w-80 flex flex-col h-full">
              <div className="p-5 border-b border-[#333]">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Settings size={18} className="text-slate-400" />
                    <h3 className="font-bold text-white tracking-wider">節點屬性與子任務</h3>
                  </div>
                  <button onClick={handleDeleteNode} className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-400/10 rounded transition-colors" title="刪除節點">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="text-xs text-slate-400">目前選取：{selectedNode.data.department as string}</div>
              </div>

              <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">部門大類</label>
                    <input 
                      type="text" 
                      value={selectedNode.data.department as string || ''} 
                      onChange={(e) => handleNodeDataChange('department', e.target.value)}
                      className="w-full px-3 py-2 bg-[#121212] border border-[#444] rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">階段任務總稱</label>
                    <textarea 
                      value={selectedNode.data.task as string || ''} 
                      onChange={(e) => handleNodeDataChange('task', e.target.value)}
                      className="w-full px-3 py-2 bg-[#121212] border border-[#444] rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm min-h-[60px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">負責人</label>
                    <select
                      value={selectedNode.data.assignee as string || ''}
                      onChange={(e) => handleNodeDataChange('assignee', e.target.value)}
                      className="w-full px-3 py-2 bg-[#121212] border border-[#444] rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm appearance-none"
                    >
                      <option value="">-- 未指派 --</option>
                      {systemUsers.map(u => (
                        <option key={u.id} value={u.name}>{u.name} ({u.department?.name || '未知部門'})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">執行狀態</label>
                    <select
                      value={selectedNode.data.status as string || 'pending'}
                      onChange={(e) => handleNodeDataChange('status', e.target.value)}
                      className="w-full px-3 py-2 bg-[#121212] border border-[#444] rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm appearance-none"
                    >
                      <option value="pending">待處理</option>
                      <option value="in-progress">進行中</option>
                      <option value="completed">已完成</option>
                    </select>
                  </div>
                </div>

                {/* Subtasks Checklist */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">細部工作項目 (Checklist)</label>
                    <button onClick={handleAddSubtask} className="text-blue-400 hover:text-blue-300">
                      <PlusCircle size={16} />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {((selectedNode.data.subtasks as any[]) || []).length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-4 bg-white/5 rounded-lg border border-dashed border-white/10">尚無子任務</div>
                    ) : (
                      ((selectedNode.data.subtasks as any[]) || []).map((subtask) => (
                        <div 
                          key={subtask.id} 
                          className="flex items-center gap-2 p-2 bg-[#121212] border border-[#333] rounded-lg hover:border-[#555] transition-colors group"
                        >
                          <div className="cursor-pointer shrink-0" onClick={() => handleSubtaskToggle(subtask.id)}>
                            {subtask.completed ? (
                              <CheckCircle2 size={16} className="text-emerald-500" />
                            ) : (
                              <Circle size={16} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                            )}
                          </div>
                          <input 
                            type="text"
                            value={subtask.title}
                            onChange={(e) => handleSubtaskRename(subtask.id, e.target.value)}
                            className={`flex-1 bg-transparent border-none outline-none text-sm w-full focus:ring-0 p-0 ${subtask.completed ? 'text-slate-500 line-through' : 'text-slate-200 focus:text-white'}`}
                          />
                          <button 
                            onClick={() => handleDeleteSubtask(subtask.id)}
                            className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const WorkflowBuilder = () => (
  <ReactFlowProvider>
    <WorkflowBuilderInner />
  </ReactFlowProvider>
);

export default WorkflowBuilder;
