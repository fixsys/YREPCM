import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

interface RequirementFormProps {
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  initialData?: any;
  mode?: 'create' | 'edit' | 'view';
}

const Section = ({ id, title, isOpen, onToggle, children, mode }: any) => (
  <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
    <button 
      type="button" 
      onClick={() => onToggle(id)}
      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition text-slate-800 font-bold"
    >
      {title}
      {isOpen ? <ChevronUp size={18} className="text-slate-500"/> : <ChevronDown size={18} className="text-slate-500"/>}
    </button>
    {isOpen && (
      <div className={clsx("p-4 bg-white space-y-4", mode === 'view' && "pointer-events-none opacity-80")}>
        {children}
      </div>
    )}
  </div>
);

export default function RequirementForm({ onSubmit, onCancel, initialData = {}, mode = 'create' }: RequirementFormProps) {
  const [data, setData] = useState<any>(initialData);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sec1: true,
    sec2: false,
    sec3: false,
    sec4: false,
    sec5: false,
    sec6: false,
    sec7: false,
    sec8: false,
    sec9: mode === 'create',
  });

  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (mode === 'create') {
      const fetchUsers = async () => {
        try {
          const token = JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token;
          const res = await axios.get('/api/users', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUsers(res.data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchUsers();
    }
  }, [mode]);

  const toggle = (sec: string) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const update = (field: string, value: any) => {
    setData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      const designAssignees = data.design_survey_assignees || [];
      const budgetAssignees = data.budget_analysis_assignees || [];
      if (designAssignees.length === 0 || budgetAssignees.length === 0) {
        alert('設計現勘與預算分析為必填，請至少各指派一名人員。');
        return;
      }
    }
    if (onSubmit) onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-auto px-1 pb-20">
        
        <Section id="sec1" title="1. 設置資訊 (Installation Info)" isOpen={openSections.sec1} onToggle={toggle} mode={mode}>
          <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">承攬形式</label>
              <select className="w-full p-2 border rounded-lg text-sm" value={data.contract_type || ''} onChange={e => update('contract_type', e.target.value)}>
                <option value="">請選擇</option>
                <option value="屋頂平鋪">屋頂平鋪</option>
                <option value="地面型">地面型</option>
                <option value="風雨球場">風雨球場</option>
                <option value="屋頂撐高">屋頂撐高</option>
                <option value="漁電共生">漁電共生</option>
                <option value="農電共生">農電共生</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">併聯形式</label>
              <select className="w-full p-2 border rounded-lg text-sm" value={data.grid_connection_type || ''} onChange={e => update('grid_connection_type', e.target.value)}>
                <option value="">請選擇</option>
                <option value="內併躉售">內併躉售</option>
                <option value="內併自用">內併自用</option>
                <option value="外併躉售">外併躉售</option>
                <option value="外併轉供">外併轉供</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">模組型號</label>
              <input type="text" className="w-full p-2 border rounded-lg text-sm" value={data.module_model || ''} onChange={e => update('module_model', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">模組片數</label>
              <input type="number" className="w-full p-2 border rounded-lg text-sm" value={data.module_count || ''} onChange={e => update('module_count', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">設置容量 (kW)</label>
              <input type="number" step="0.01" className="w-full p-2 border rounded-lg text-sm" value={data.installation_capacity || ''} onChange={e => update('installation_capacity', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">用電型式</label>
              <select className="w-full p-2 border rounded-lg text-sm" value={data.power_type || ''} onChange={e => update('power_type', e.target.value)}>
                <option value="">請選擇</option>
                <option value="高壓22.8KV">高壓22.8KV</option>
                <option value="高壓11.4KV">高壓11.4KV</option>
                <option value="低壓380/220V">低壓380/220V</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">土地面積 (平方公尺)</label>
              <input type="number" step="0.01" className="w-full p-2 border rounded-lg text-sm" value={data.land_area || ''} onChange={e => update('land_area', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">有無既設光電</label>
              <select className="w-full p-2 border rounded-lg text-sm" value={data.has_existing_pv ? 'true' : 'false'} onChange={e => update('has_existing_pv', e.target.value === 'true')}>
                <option value="false">無</option>
                <option value="true">有</option>
              </select>
            </div>
            {data.has_existing_pv && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">既設光電容量 (kW)</label>
                <input type="number" step="0.01" className="w-full p-2 border rounded-lg text-sm" value={data.existing_pv_capacity || ''} onChange={e => update('existing_pv_capacity', e.target.value)} />
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">其他說明</label>
              <textarea className="w-full p-2 border rounded-lg text-sm" rows={2} value={data.other_notes || ''} onChange={e => update('other_notes', e.target.value)} />
            </div>
          </div>
        </Section>

        <Section id="sec2" title="2. 需求大樣 (Basic Requirements)" isOpen={openSections.sec2} onToggle={toggle} mode={mode}>
          <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">基礎型式</label>
              <select className="w-full p-2 border rounded-lg text-sm" value={data.foundation_type || ''} onChange={e => update('foundation_type', e.target.value)}>
                <option value="">請選擇</option>
                <option value="獨立基礎">獨立基礎</option>
                <option value="連續基礎">連續基礎</option>
                <option value="自重式">自重式</option>
                <option value="基樁">基樁</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">混凝土磅數</label>
              <select className="w-full p-2 border rounded-lg text-sm" value={data.concrete_strength || ''} onChange={e => update('concrete_strength', e.target.value)}>
                <option value="">請選擇</option>
                <option value="2000psi">2000psi</option>
                <option value="3000psi">3000psi</option>
                <option value="3500psi">3500psi</option>
                <option value="4000psi">4000psi</option>
                <option value="4500psi">4500psi</option>
                <option value="其他">其他</option>
              </select>
            </div>
          </div>
        </Section>

        <Section id="sec3" title="3. 結構支架 (Structural Support)" isOpen={openSections.sec3} onToggle={toggle} mode={mode}>
          <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">是否保發</label>
              <select className="w-full p-2 border rounded-lg text-sm" value={data.is_guaranteed_power ? 'true' : 'false'} onChange={e => update('is_guaranteed_power', e.target.value === 'true')}>
                <option value="false">否</option>
                <option value="true">是</option>
              </select>
            </div>
            {data.is_guaranteed_power && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">保發 %</label>
                <input type="number" step="0.01" className="w-full p-2 border rounded-lg text-sm" value={data.guaranteed_power_percent || ''} onChange={e => update('guaranteed_power_percent', e.target.value)} />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">需求高度</label>
              <input type="text" className="w-full p-2 border rounded-lg text-sm" value={data.required_height || ''} onChange={e => update('required_height', e.target.value)} placeholder="如：淨高2米，完成高度4.5米以下" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">需求斜度</label>
              <input type="text" className="w-full p-2 border rounded-lg text-sm" value={data.required_slope || ''} onChange={e => update('required_slope', e.target.value)} placeholder="如：5度" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">需求跨距</label>
              <input type="text" className="w-full p-2 border rounded-lg text-sm" value={data.required_span || ''} onChange={e => update('required_span', e.target.value)} placeholder="如：6~8米" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">需求間距</label>
              <input type="text" className="w-full p-2 border rounded-lg text-sm" value={data.required_spacing || ''} onChange={e => update('required_spacing', e.target.value)} placeholder="如：3~5米" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">耐風要求</label>
              <input type="text" className="w-full p-2 border rounded-lg text-sm" value={data.wind_resistance || ''} onChange={e => update('wind_resistance', e.target.value)} placeholder="如：依照建築耐風法規" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">是否臨海</label>
              <select className="w-full p-2 border rounded-lg text-sm" value={data.is_coastal ? 'true' : 'false'} onChange={e => update('is_coastal', e.target.value === 'true')}>
                <option value="false">否</option>
                <option value="true">是</option>
              </select>
            </div>
            {data.is_coastal && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">臨海距離 (km)</label>
                <input type="number" step="0.01" className="w-full p-2 border rounded-lg text-sm" value={data.coastal_distance || ''} onChange={e => update('coastal_distance', e.target.value)} />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">模組鎖固方式</label>
              <input type="text" className="w-full p-2 border rounded-lg text-sm" value={data.module_fixing_method || ''} onChange={e => update('module_fixing_method', e.target.value)} placeholder="如：上壓4點" />
            </div>
          </div>
        </Section>

        {/* Keeping sections brief to avoid massive file size, they can be expanded as needed */}
        <Section id="sec4" title="4. 浪板 (Corrugated Board)" isOpen={openSections.sec4} onToggle={toggle} mode={mode}>
          <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">浪板需求</label>
              <select className="w-full p-2 border rounded-lg text-sm" value={data.needs_corrugated_board ? 'true' : 'false'} onChange={e => update('needs_corrugated_board', e.target.value === 'true')}>
                <option value="false">否</option>
                <option value="true">是</option>
              </select>
            </div>
             {data.needs_corrugated_board && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">浪板面積 (m2)</label>
                <input type="number" step="0.01" className="w-full p-2 border rounded-lg text-sm" value={data.corrugated_board_area || ''} onChange={e => update('corrugated_board_area', e.target.value)} />
              </div>
             )}
             <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">方式</label>
              <input type="text" className="w-full p-2 border rounded-lg text-sm" value={data.corrugated_board_method || ''} onChange={e => update('corrugated_board_method', e.target.value)} placeholder="加鋪/拆除重鋪..." />
            </div>
          </div>
        </Section>

        <Section id="sec5" title="5. 安全/維修設施 (Safety)" isOpen={openSections.sec5} onToggle={toggle} mode={mode}>
          <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">是否維修步道</label>
              <select className="w-full p-2 border rounded-lg text-sm" value={data.has_maintenance_walkway ? 'true' : 'false'} onChange={e => update('has_maintenance_walkway', e.target.value === 'true')}>
                <option value="false">否</option>
                <option value="true">是</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">維修步道寬度</label>
              <input type="text" className="w-full p-2 border rounded-lg text-sm" value={data.maintenance_walkway_width || ''} onChange={e => update('maintenance_walkway_width', e.target.value)} placeholder="30cm/40cm..." />
            </div>
          </div>
        </Section>

        <Section id="sec6" title="6. 電力相關 (Electrical)" isOpen={openSections.sec6} onToggle={toggle} mode={mode}>
           <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">電線電纜品牌</label>
              <input type="text" className="w-full p-2 border rounded-lg text-sm" value={data.cable_brand || ''} onChange={e => update('cable_brand', e.target.value)} />
            </div>
             <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">逆變器品牌</label>
              <input type="text" className="w-full p-2 border rounded-lg text-sm" value={data.inverter_brand || ''} onChange={e => update('inverter_brand', e.target.value)} />
            </div>
           </div>
        </Section>
        
        <Section id="sec7" title="7. 配電盤體 (Distribution Panel)" isOpen={openSections.sec7} onToggle={toggle} mode={mode}>
           <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">廠牌</label>
              <input type="text" className="w-full p-2 border rounded-lg text-sm" value={data.panel_brand || ''} onChange={e => update('panel_brand', e.target.value)} />
            </div>
             <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">防水等級</label>
              <input type="text" className="w-full p-2 border rounded-lg text-sm" value={data.waterproof_level || ''} onChange={e => update('waterproof_level', e.target.value)} placeholder="IP55/IP65" />
            </div>
           </div>
        </Section>

        <Section id="sec8" title="8. 其他 (Others)" isOpen={openSections.sec8} onToggle={toggle} mode={mode}>
           <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">路寬</label>
              <input type="text" className="w-full p-2 border rounded-lg text-sm" value={data.road_width || ''} onChange={e => update('road_width', e.target.value)} />
            </div>
             <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">吊車噸數</label>
              <input type="text" className="w-full p-2 border rounded-lg text-sm" value={data.crane_tonnage || ''} onChange={e => update('crane_tonnage', e.target.value)} />
            </div>
           </div>
        </Section>

      {mode === 'create' && (
        <Section id="sec9" title="9. 任務指派 (Assignments)" isOpen={openSections.sec9} onToggle={toggle} mode={mode}>
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 mb-4">
            建立需求單成功後，系統將自動於任務清單中建立兩個任務：<br/>
            <strong>1. 設計現勘</strong><br/>
            <strong>2. 預算分析</strong><br/>
            任務名稱將標示為 [尚未成案] 以供識別。
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">指派「設計現勘」人員 (必填)</label>
              <div className="border border-slate-300 rounded-lg max-h-40 overflow-y-auto p-2 bg-slate-50">
                {users.map((u: any) => {
                  const assignees = data.design_survey_assignees || [];
                  return (
                    <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        checked={assignees.includes(u.id)}
                        onChange={e => {
                          const newIds = e.target.checked 
                            ? [...assignees, u.id]
                            : assignees.filter((id: string) => id !== u.id);
                          update('design_survey_assignees', newIds);
                        }}
                      />
                      <span className="text-sm text-slate-700">{u.name} ({u.department?.name || '無'})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">指派「預算分析」人員 (必填)</label>
              <div className="border border-slate-300 rounded-lg max-h-40 overflow-y-auto p-2 bg-slate-50">
                {users.map((u: any) => {
                  const assignees = data.budget_analysis_assignees || [];
                  return (
                    <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        checked={assignees.includes(u.id)}
                        onChange={e => {
                          const newIds = e.target.checked 
                            ? [...assignees, u.id]
                            : assignees.filter((id: string) => id !== u.id);
                          update('budget_analysis_assignees', newIds);
                        }}
                      />
                      <span className="text-sm text-slate-700">{u.name} ({u.department?.name || '無'})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>
      )}

      </div>
      
      {mode !== 'view' && (
        <div className="absolute bottom-0 left-0 w-full p-4 bg-white border-t border-slate-200 flex gap-3 z-10">
          <button type="button" onClick={onCancel} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200">
            取消
          </button>
          <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 shadow-lg">
            {mode === 'create' ? '確認建立需求單' : '儲存變更'}
          </button>
        </div>
      )}
    </form>
  );
}
