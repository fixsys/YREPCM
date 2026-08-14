import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Paperclip, UserCircle } from 'lucide-react';

export const TaskNode = ({ data, isConnectable, selected }: NodeProps) => {
  // Determine department color
  let headerColor = '#1f2937'; // slate-800 default
  const dept = (data.department as string) || '';
  if (dept.includes('業務') || dept.includes('法務')) headerColor = '#0284c7'; // sky-600
  else if (dept.includes('設計')) headerColor = '#059669'; // emerald-600
  else if (dept.includes('採購') || dept.includes('倉管')) headerColor = '#7c3aed'; // violet-600
  else if (dept.includes('鋼構')) headerColor = '#ea580c'; // orange-600
  else if (dept.includes('工務')) headerColor = '#dc2626'; // red-600
  else if (dept.includes('跨部門')) headerColor = '#475569'; // slate-600

  // Determine status styles
  let statusRing = '';
  let statusBadge = '';
  let badgeColor = '';
  
  if (data.status === 'completed') {
    statusRing = 'ring-2 ring-emerald-500';
    statusBadge = '已完成';
    badgeColor = 'bg-emerald-500 text-white';
  } else if (data.status === 'in-progress') {
    statusRing = 'ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]';
    statusBadge = '進行中';
    badgeColor = 'bg-blue-500 text-white';
  } else {
    statusRing = 'border-[#333] opacity-80'; // pending
    statusBadge = '未開始';
    badgeColor = 'bg-slate-700 text-slate-300';
  }

  // Calculate Progress
  const subtasks = (data.subtasks as any[]) || [];
  const completedCount = subtasks.filter(t => t.completed).length;
  const totalCount = subtasks.length;
  const progressPercent = totalCount === 0 ? (data.status === 'completed' ? 100 : 0) : Math.round((completedCount / totalCount) * 100);

  return (
    <div className={`bg-[#1e1e1e] border-2 ${selected ? 'border-blue-400' : 'border-transparent'} rounded-lg shadow-xl min-w-[260px] text-slate-200 text-sm overflow-hidden font-sans transition-all ${statusRing}`}>
      {/* Header */}
      <div 
        className="px-4 py-2 font-bold text-white text-xs tracking-wider flex justify-between items-center" 
        style={{ backgroundColor: headerColor }}
      >
        <span>{dept}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeColor}`}>{statusBadge}</span>
      </div>
      
      {/* Body */}
      <div className="p-4 space-y-4">
        <div className="font-bold text-base leading-snug">
          {data.task as string}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>完成進度</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#333] rounded-full overflow-hidden">
            <div 
              className={`h-full ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-500'} transition-all duration-500`} 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        </div>

        {/* Footer info (Assignee & Attachments) */}
        <div className="flex justify-between items-center pt-2 border-t border-[#333]">
          <div className="flex items-center gap-2">
            {data.assignee ? (
              <div className="flex items-center gap-1.5 bg-white/5 pr-2 rounded-full border border-white/10">
                <img 
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(data.assignee as string)}&background=random`} 
                  alt="avatar" 
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-[11px] text-slate-300 font-medium">{data.assignee as string}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-500">
                <UserCircle size={20} />
                <span className="text-[11px]">未指派</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-slate-400">
            <Paperclip size={14} />
            <span className="text-[11px]">{(data.attachments as any[])?.length || 0}</span>
          </div>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-slate-400 border-2 border-[#1e1e1e]"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-slate-400 border-2 border-[#1e1e1e]"
      />
    </div>
  );
};

export const nodeTypes = {
  taskNode: TaskNode,
};
