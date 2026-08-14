import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { ReactFlow, Background, Controls, MiniMap, BackgroundVariant } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './workflow/CustomNodes';

const ProjectWorkflowTab = ({ projectId }: { projectId: string }) => {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const fetchWorkflow = async () => {
    try {
      const [wfRes, deptRes, tasksRes] = await Promise.all([
        axios.get(`http://localhost:3001/api/projects/${projectId}/workflow`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:3001/api/settings/departments', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`http://localhost:3001/api/tasks?project_id=${projectId}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const departments = deptRes.data;
      const projectWorkflow = wfRes.data;
      const tasks = tasksRes.data || [];
      const tpl = projectWorkflow.template;

      if (tpl) {
        const completedNodes = ['n1', 'n2', 'n3']; // Mock completed nodes logic from original
        const inProgressNodes = ['n5']; // Mock in-progress nodes from original

        const rfNodes: Node[] = tpl.nodes.map((n: any) => {
          let status = 'pending';
          if (completedNodes.includes(n.id)) {
            status = 'completed';
          } else if (inProgressNodes.includes(n.id)) {
            status = 'progress';
          }

          // Calculate Task Progress for this node
          const nodeTasks = tasks.filter((t: any) => t.workflow_node_id === n.id);
          const completedTasksCount = nodeTasks.filter((t: any) => t.status === '已完成').length;
          const totalTasksCount = nodeTasks.length;
          const taskProgressText = totalTasksCount > 0 ? `(${completedTasksCount}/${totalTasksCount} 任務)` : '';

          return {
            id: n.id,
            type: 'taskNode',
            position: { x: n.position_x || 0, y: n.position_y || 0 },
            data: { 
              label: n.name, 
              type: n.type, 
              department_id: n.department_id,
              department_name: departments.find((d: any) => d.id === n.department_id)?.name,
              status,
              taskProgressText,
              condition_text: ''
            },
            draggable: false, // read only
            selectable: true,
          };
        });

        const rfEdges: Edge[] = tpl.edges.map((e: any) => {
          const isCompleted = completedNodes.includes(e.source_node_id);
          const inProgress = inProgressNodes.includes(e.source_node_id);
          
          let strokeColor = '#94a3b8'; // default
          if (isCompleted) strokeColor = '#10b981'; // emerald-500
          else if (inProgress) strokeColor = '#3b82f6'; // blue-500
          
          return {
            id: e.id,
            source: e.source_node_id,
            target: e.target_node_id,
            sourceHandle: e.source_handle || 'out',
            targetHandle: e.target_handle || 'in',
            label: e.condition || '',
            animated: inProgress,
            style: { 
              stroke: strokeColor, 
              strokeWidth: 2,
              strokeDasharray: inProgress ? '5 5' : 'none'
            }
          };
        });

        setNodes(rfNodes);
        setEdges(rfEdges);
      } else {
        setError('尚未設定流程樣板');
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 404) {
        setError('尚未套用流程樣板，請至「編輯資訊」設定。');
      } else {
        setError(`載入失敗: ${err.message || '未知錯誤'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflow();
  }, [projectId]);

  if (loading) return <div className="p-8 text-center text-slate-500">載入流程中...</div>;

  return (
    <div className="bg-[#1e1e1e] rounded-xl shadow-lg border border-[#333] p-6 flex flex-col h-[600px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white tracking-wider">專案工作流進度</h3>
        <div className="flex gap-4 text-sm font-medium text-slate-300">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500"></div> 已完成</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-500 shadow-lg shadow-blue-500/50"></div> 進行中</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#333] border border-[#555]"></div> 待處理</div>
        </div>
      </div>
      
      {error ? (
        <div className="text-red-400 flex-1 flex items-center justify-center">{error}</div>
      ) : (
        <div className="flex-1 bg-[#121212] rounded-xl border border-[#333] overflow-hidden relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            colorMode="dark"
            nodesConnectable={false}
            nodesDraggable={false}
            elementsSelectable={true}
          >
            <Background color="#333" variant={BackgroundVariant.Lines} gap={24} />
            <Controls className="bg-[#1e1e1e] border-[#333] fill-white" showInteractive={false} />
            <MiniMap 
              nodeColor={(n) => {
                if (n.data?.status === 'completed') return '#10b981';
                if (n.data?.status === 'progress') return '#3b82f6';
                return '#1f2937';
              }} 
              maskColor="rgba(0, 0, 0, 0.7)"
              style={{ backgroundColor: '#1e1e1e' }}
            />
          </ReactFlow>
        </div>
      )}
    </div>
  );
};

export default ProjectWorkflowTab;
