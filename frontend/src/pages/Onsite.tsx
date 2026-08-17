import { useState, useEffect } from 'react';
import axios from 'axios';

const TimeInput24 = ({ value, onChange, className }: { value: string, onChange: (val: string) => void, className?: string }) => {
  const [h, m] = value ? value.split(':') : ['08', '00'];
  return (
    <div className={`flex items-center justify-center bg-white border rounded ${className}`}>
      <select value={h} onChange={e => onChange(`${e.target.value}:${m}`)} className="appearance-none bg-transparent outline-none text-center cursor-pointer hover:bg-slate-100 rounded py-1.5 w-12">
        {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(hour => <option key={hour} value={hour}>{hour}</option>)}
      </select>
      <span className="font-bold text-slate-400 pb-0.5">:</span>
      <select value={m} onChange={e => onChange(`${h}:${e.target.value}`)} className="appearance-none bg-transparent outline-none text-center cursor-pointer hover:bg-slate-100 rounded py-1.5 w-12">
        {Array.from({length: 60}, (_, i) => String(i).padStart(2, '0')).map(min => <option key={min} value={min}>{min}</option>)}
      </select>
    </div>
  );
};

import { useAuthStore } from '../store/authStore';
import { CheckSquare, Plus, Clock, Search, FolderKanban, Camera, X, Trash2, FileText, Edit2, Printer } from 'lucide-react';

const safeParseJSON = (data: any, fallback: any = []) => {
  if (!data) return fallback;
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch (e) { return fallback; }
  }
  return data;
};

const Onsite = () => {
  const { token, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'TOOLBOX' | 'DAILY'>('TOOLBOX');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // 工具箱會議 State
  const [toolboxMeetings, setToolboxMeetings] = useState<any[]>([]);
  const [isToolboxModalOpen, setIsToolboxModalOpen] = useState(false);
  const [editingToolboxId, setEditingToolboxId] = useState<string | null>(null);
  const [toolboxForm, setToolboxForm] = useState({
    project_id: '',
    record_date: new Date().toISOString().slice(0, 10),
    recorder_id: user?.id || '',
    worker_count: '',
    work_category: '土木',
    work_content: '',
    safety_check_1: false,
    safety_check_2: false,
    safety_check_3: false
  });
  const [toolboxPhotos, setToolboxPhotos] = useState<File[]>([]);
  const [toolboxPreviewUrls, setToolboxPreviewUrls] = useState<string[]>([]);

  // 每日報工 State
  const [laborReports, setLaborReports] = useState<any[]>([]);
  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);
  const [editingLaborId, setEditingLaborId] = useState<string | null>(null);
  const [laborForm, setLaborForm] = useState({
    project_id: '',
    report_date: new Date().toISOString().slice(0, 10),
    weather: '晴',
    recorder_id: user?.id || '',
    pm_id: '',
    work_category: '土木',
    drawing_number: '',
    drawing_revision: '',
    construction_location: '',
    drawing_check_result: '符合圖說',
    drawing_check_confirmed: false,
    safety_check_1: false,
    safety_check_2: false,
    safety_check_3: false,
    additional_notes: ''
  });
  const [laborPhotosClose, setLaborPhotosClose] = useState<File[]>([]);
  const [laborPhotosMid, setLaborPhotosMid] = useState<File[]>([]);
  const [laborPhotosFar, setLaborPhotosFar] = useState<File[]>([]);
  const [engineers, setEngineers] = useState<string[]>(['']);
  type DispatchWorker = {
    name: string;
    start_time: string;
    end_time: string;
    work_category: string;
    work_item: string;
    work_hours: number;
  };
  const [dispatchWorkers, setDispatchWorkers] = useState<DispatchWorker[]>([]);

  const calculateWorkHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let diffHours = (endH + endM / 60) - (startH + startM / 60);
    if (startH <= 12 && endH >= 13) diffHours -= 1;
    return Math.max(0, parseFloat(diffHours.toFixed(1)));
  };
  const [viewingRecord, setViewingRecord] = useState<{type: 'toolbox' | 'labor', data: any} | null>(null);
  type WorkItem = {
    name: string;
    progress: string;
    worker_count?: string;
    work_hours?: string;
    inspection?: {
      fields: Record<string, string>;
      checks: boolean[];
      result: string;
      note: string;
      photo?: string | File;
    }
  };
  const [workItems, setWorkItems] = useState<WorkItem[]>([{name: '', progress: '', worker_count: '', work_hours: ''}]);

  const INSPECTION_TEMPLATES: Record<string, { fields: string[], checks: string[], results: string[], photoLabel: string }> = {
    'PC': {
      fields: ['控制點/基準點', '軸線/座標', '設計高程/實測高程', '允許誤差/實測差值'],
      checks: ['已核對圖號、版次、尺寸與施工範圍', '儀器、控制點、軸線、座標與高程正確', '測量結果在允許誤差內並完成複核', '材料、機具及施工面已確認可施工'],
      results: ['合格，可繼續施工', '不合格'],
      photoLabel: 'PC自主檢查照片'
    },
    '板模': {
      fields: [],
      checks: ['鋼筋號數、間距、數量及搭接長度符合圖說', '保護層墊塊、綁紮固定及預留筋位置正確', '鋼筋表面無油污、浮鏽及影響品質之雜物', '模板內清潔、預埋件及基礎螺栓位置已確認'],
      results: ['符合，可繼續施工', '不符合'],
      photoLabel: '板模自主檢查照片'
    },
    '回填': {
      fields: [],
      checks: ['回填材料種類、含水狀況及雜物清除符合要求', '基礎、管線及隱蔽部位已完成查驗與影像留存', '分層回填厚度、夯實方式及壓實度符合規範', '回填完成高程、排水坡度及周邊清潔已確認'],
      results: ['合格，送公司審核', '不合格'],
      photoLabel: '回填自主檢查照片'
    }
  };

  const WORK_CATEGORIES = ['土木', '機電', '模組', '鋼構'];
  const WEATHER_OPTIONS = ['晴', '陰', '雨', '大雨', '颱風', '其他'];

  const categoryToItems: Record<string, string[]> = {
    '土木': ['整地', '放樣', '開挖', 'PC', '鋼筋綁紮', '大底澆置', '板模', '灌漿', '基礎螺栓', '拆模', '回填', '其他'],
    '機電': ['DC－模組串列接線', 'DC－直流電纜佈設', 'DC－絕緣阻抗測試', 'DC－逆變器接線', 'AC－交流電纜佈設', 'AC－配電盤安裝', 'AC－接地及防雷施工', 'AC－功能測試', '台電申報／竣工資料', '台電會勘／預計掛表', '其他機電工程'],
    '模組': ['模組進場點收', '模組搬運上架', '模組定位排列', '中壓塊安裝', '側壓塊安裝', '模組鎖固扭力確認', '模組外觀及破損檢查', '其他模組工程'],
    '鋼構': ['錨栓及柱腳放樣', '鋼柱吊裝', '鋼柱及主梁吊裝', '次梁及斜撐安裝', '梁柱接頭螺栓安裝', '高強度螺栓終鎖', '現場焊接作業', '柱腳無收縮灌漿', '鍍鋅層修補', '其他鋼構工程'],
  };

  useEffect(() => {
    if (isLaborModalOpen && workItems.length === 0) {
      const defaultName = categoryToItems[laborForm.work_category][0];
      const newItem: WorkItem = { name: defaultName, progress: '' };
      if (laborForm.work_category === '土木' && INSPECTION_TEMPLATES[defaultName]) {
        const tpl = INSPECTION_TEMPLATES[defaultName];
        newItem.inspection = {
          fields: tpl.fields.reduce((acc, f) => ({...acc, [f]: ''}), {}),
          checks: new Array(tpl.checks.length).fill(false),
          result: tpl.results[0],
          note: ''
        };
      }
      setWorkItems([newItem]);
    }
  }, [isLaborModalOpen, laborForm.work_category]);

  useEffect(() => {
    if (!isLaborModalOpen) return;
    
    const aggregated = dispatchWorkers
      .filter(w => w.work_category === laborForm.work_category && w.name.trim() !== '')
      .reduce((acc, w) => {
        if (!w.work_item) return acc;
        if (!acc[w.work_item]) {
          acc[w.work_item] = { count: 0, hours: 0 };
        }
        acc[w.work_item].count += 1;
        acc[w.work_item].hours += Number(w.work_hours) || 0;
        return acc;
      }, {} as Record<string, {count: number, hours: number}>);

    const hasCategoryDispatch = dispatchWorkers.some(w => w.work_category === laborForm.work_category && w.name.trim() !== '');
    if (!hasCategoryDispatch) return;

    setWorkItems(prevItems => {
      let newItems = [...prevItems];
      let changed = false;

      newItems = newItems.map(item => {
        const agg = aggregated[item.name];
        const newCount = agg ? agg.count.toString() : '';
        const newHours = agg ? agg.hours.toString() : '';
        if (item.worker_count !== newCount || item.work_hours !== newHours) {
          changed = true;
          return { ...item, worker_count: newCount, work_hours: newHours };
        }
        return item;
      });

      const existingNames = new Set(newItems.map(i => i.name));
      for (const [itemName, data] of Object.entries(aggregated)) {
        if (!existingNames.has(itemName)) {
          changed = true;
          const newItem: WorkItem = {
            name: itemName,
            progress: '',
            worker_count: data.count.toString(),
            work_hours: data.hours.toString()
          };
          if (laborForm.work_category === '土木' && INSPECTION_TEMPLATES[itemName]) {
            const tpl = INSPECTION_TEMPLATES[itemName];
            newItem.inspection = {
              fields: tpl.fields.reduce((acc, f) => ({...acc, [f]: ''}), {}),
              checks: new Array(tpl.checks.length).fill(false),
              result: tpl.results[0],
              note: ''
            };
          }
          newItems.push(newItem);
        }
      }

      return changed ? newItems : prevItems;
    });
  }, [dispatchWorkers, laborForm.work_category, isLaborModalOpen]);

  useEffect(() => {
    const urls = toolboxPhotos.map(file => URL.createObjectURL(file));
    setToolboxPreviewUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [toolboxPhotos]);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tbRes, laborRes, uRes, projRes] = await Promise.all([
        axios.get('http://localhost:3001/api/toolbox-meetings', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:3001/api/labor-reports', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:3001/api/users', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:3001/api/projects', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setToolboxMeetings(tbRes.data);
      setLaborReports(laborRes.data);
      setUsers(uRes.data);
      setProjects(projRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToolboxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingToolboxId && toolboxPhotos.length < 2) {
      return alert('必須上傳至少2張會議照片才能送出！');
    }
    if (!toolboxForm.safety_check_1 || !toolboxForm.safety_check_2 || !toolboxForm.safety_check_3) {
      return alert('請確認所有工安提醒項目皆已勾選！');
    }

    const formData = new FormData();
    Object.entries(toolboxForm).forEach(([key, val]) => formData.append(key, val.toString()));
    toolboxPhotos.forEach(file => formData.append('photos', file));

    try {
      const url = editingToolboxId ? `http://localhost:3001/api/toolbox-meetings/${editingToolboxId}` : 'http://localhost:3001/api/toolbox-meetings';
      const method = editingToolboxId ? 'put' : 'post';
      await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setIsToolboxModalOpen(false);
      setToolboxPhotos([]);
      fetchData();
    } catch (err) {
      alert(editingToolboxId ? '更新工具箱會議失敗' : '新增工具箱會議失敗');
    }
  };

  const handleAddToolbox = () => {
    setEditingToolboxId(null);
    setToolboxForm({ project_id: '', record_date: new Date().toISOString().slice(0, 10), recorder_id: user?.id || '', worker_count: '', work_category: '土木', work_content: '', safety_check_1: false, safety_check_2: false, safety_check_3: false });
    setToolboxPhotos([]);
    setIsToolboxModalOpen(true);
  };

  const handleEditToolbox = (t: any) => {
    setEditingToolboxId(t.id);
    setToolboxForm({
      project_id: t.project_id,
      record_date: new Date(t.record_date).toISOString().slice(0, 10),
      recorder_id: t.recorder_id,
      worker_count: t.worker_count.toString(),
      work_category: t.work_category,
      work_content: t.work_content,
      safety_check_1: t.safety_check_1,
      safety_check_2: t.safety_check_2,
      safety_check_3: t.safety_check_3
    });
    setToolboxPhotos([]);
    setIsToolboxModalOpen(true);
  };

  const handleLaborSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!laborForm.drawing_check_confirmed) {
      return alert('未確認不得正式保存施工日報');
    }
    if ((laborPhotosClose.length < 2 || laborPhotosMid.length < 2 || laborPhotosFar.length < 2) && !editingLaborId) {
      return alert('近照、中距離照、遠距照皆須至少上傳 2 張');
    }
    try {
      const formData = new FormData();
      Object.entries(laborForm).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      formData.append('engineers', JSON.stringify(engineers.filter(e => e)));
      formData.append('dispatch_workers', JSON.stringify(dispatchWorkers.filter(w => w.name && w.start_time && w.end_time)));
      laborPhotosClose.forEach(file => formData.append('photos_close', file));
      laborPhotosMid.forEach(file => formData.append('photos_mid', file));
      laborPhotosFar.forEach(file => formData.append('photos_far', file));
      
      const workItemsToSave = workItems.filter(w => w.name && w.progress).map((w, idx) => {
        const itemCopy = { ...w };
        if (itemCopy.inspection && itemCopy.inspection.photo instanceof File) {
          formData.append(`inspection_photo_${idx}`, itemCopy.inspection.photo);
          const { photo, ...restInspection } = itemCopy.inspection;
          itemCopy.inspection = restInspection as any;
        }
        return itemCopy;
      });
      formData.append('work_items', JSON.stringify(workItemsToSave));

      const url = editingLaborId ? `http://localhost:3001/api/labor-reports/${editingLaborId}` : 'http://localhost:3001/api/labor-reports';
      const method = editingLaborId ? 'put' : 'post';
      await axios[method](url, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setIsLaborModalOpen(false);
      fetchData();
    } catch (err) {
      alert(editingLaborId ? '更新報工紀錄失敗' : '新增報工紀錄失敗');
    }
  };

  const handleAddLabor = () => {
    setEditingLaborId(null);
    setLaborForm({ project_id: '', report_date: new Date().toISOString().slice(0, 10), weather: '晴', recorder_id: user?.id || '', pm_id: '', work_category: '土木', drawing_number: '', drawing_revision: '', construction_location: '', drawing_check_result: '符合圖說', drawing_check_confirmed: false, safety_check_1: false, safety_check_2: false, safety_check_3: false, additional_notes: '' });
    setLaborPhotosClose([]);
    setLaborPhotosMid([]);
    setLaborPhotosFar([]);
    setEngineers(['']);
    setDispatchWorkers([{ name: '', start_time: '08:00', end_time: '17:00', work_category: '土木', work_item: categoryToItems['土木'][0], work_hours: 8 }]);
    setWorkItems([{name: categoryToItems['土木'][0], progress: '', worker_count: '', work_hours: ''}]);
    setIsLaborModalOpen(true);
  };

  const handleEditLabor = (l: any) => {
    setEditingLaborId(l.id);
    setLaborForm({
      project_id: l.project_id,
      report_date: new Date(l.report_date).toISOString().slice(0, 10),
      weather: l.weather,
      recorder_id: l.recorder_id,
      pm_id: l.pm_id || '',
      work_category: l.work_category,
      drawing_number: l.drawing_number || '',
      drawing_revision: l.drawing_revision || '',
      construction_location: l.construction_location || '',
      drawing_check_result: l.drawing_check_result || '符合圖說',
      drawing_check_confirmed: l.drawing_check_confirmed || false,
      safety_check_1: l.safety_check_1 || false,
      safety_check_2: l.safety_check_2 || false,
      safety_check_3: l.safety_check_3 || false,
      additional_notes: l.additional_notes || ''
    });
    setLaborPhotosClose([]);
    setLaborPhotosMid([]);
    setLaborPhotosFar([]);
    if (l.engineers) setEngineers(safeParseJSON(l.engineers, ['']));
    else setEngineers(['']);
    if (l.dispatch_workers) setDispatchWorkers(safeParseJSON(l.dispatch_workers, []));
    else setDispatchWorkers([{ name: '', start_time: '08:00', end_time: '17:00', work_category: '土木', work_item: categoryToItems['土木'][0], work_hours: 8 }]);
    if (l.work_items) setWorkItems(safeParseJSON(l.work_items, [{name: categoryToItems[l.work_category][0], progress: '', worker_count: '', work_hours: ''}]));
    else setWorkItems([{name: categoryToItems[l.work_category][0], progress: '', worker_count: '', work_hours: ''}]);
    setIsLaborModalOpen(true);
  };

  const filteredToolbox = toolboxMeetings.filter(t => 
    t.work_content.includes(searchQuery) || 
    (t.recorder?.name || '').includes(searchQuery) ||
    t.work_category.includes(searchQuery)
  );

  const filteredLabor = laborReports.filter(l => 
    (l.recorder?.name || '').includes(searchQuery) ||
    l.work_category.includes(searchQuery) ||
    l.weather.includes(searchQuery)
  );

  if (loading) return <div className="text-center py-12 text-slate-500">載入中...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">現場報工中心</h1>
        
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="搜尋紀錄..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64"
            />
          </div>
          <button 
            onClick={() => activeTab === 'TOOLBOX' ? handleAddToolbox() : handleAddLabor()}
            className="bg-indigo-600 text-white p-2 md:px-4 md:py-2 rounded-lg shadow-md hover:bg-indigo-700 transition flex items-center justify-center shrink-0"
          >
            <Plus size={20} />
            <span className="hidden md:inline ml-2">
              {activeTab === 'TOOLBOX' ? '新增工具箱會議' : '新增每日報工'}
            </span>
          </button>
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-6 shrink-0 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('TOOLBOX')}
          className={`w-1/2 md:w-auto px-6 py-3 font-medium text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'TOOLBOX' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <FolderKanban size={18} /> 工具箱會議
        </button>
        <button
          onClick={() => setActiveTab('DAILY')}
          className={`w-1/2 md:w-auto px-6 py-3 font-medium text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'DAILY' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <CheckSquare size={18} /> 每日報工
        </button>
      </div>

      <div className="flex-1 overflow-auto -mx-4 px-4 md:mx-0 md:px-0 pb-20 md:pb-0">
        {activeTab === 'TOOLBOX' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredToolbox.map(t => (
              <div key={t.id} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all flex flex-col">
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex flex-col gap-2 mb-2">
                    <div className="flex justify-between items-start">
                      <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-sm">{t.project?.project_code || '無專案'}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 shrink-0">
                        <Clock size={12}/> {new Date(t.record_date).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg">
                      {t.work_category}工程 會議
                    </h4>
                  </div>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {t.work_content}
                  </p>
                  <div className="mt-auto border-t border-slate-100 pt-3 flex justify-between items-center text-xs text-slate-500">
                    <span>紀錄: {t.recorder?.name}</span>
                    <span>人數: {t.worker_count} 人</span>
                  </div>
                  {t.photos && (
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {safeParseJSON(t.photos, []).map((p: string, i: number) => (
                        <img key={i} src={`http://localhost:3001${p}`} alt="會議紀錄" className="w-12 h-12 rounded object-cover border" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex border-t border-slate-100 divide-x divide-slate-100 bg-slate-50 rounded-b-xl overflow-hidden shrink-0">
                  <button onClick={() => setViewingRecord({type: 'toolbox', data: t})} className="flex-1 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-indigo-700 flex items-center justify-center gap-2 transition-colors"><FileText size={16}/> 檢視報表</button>
                  <button onClick={() => handleEditToolbox(t)} className="flex-1 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-teal-700 flex items-center justify-center gap-2 transition-colors"><Edit2 size={16}/> 編輯</button>
                </div>
              </div>
            ))}
            {filteredToolbox.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                目前沒有工具箱會議紀錄
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLabor.map(l => (
              <div key={l.id} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all flex flex-col">
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex flex-col gap-2 mb-2">
                    <div className="flex justify-between items-start">
                      <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-sm">{l.project?.project_code || '無專案'}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 shrink-0">
                        <Clock size={12}/> {new Date(l.report_date).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg">
                      {l.work_category}工程 報工
                    </h4>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">天氣: {l.weather}</span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">工務經理: {l.pm?.name || '無'}</span>
                  </div>
                  <div className="text-sm text-slate-600 mb-2">
                    <strong className="block mb-1">現場工程師:</strong>
                    {l.engineers ? safeParseJSON(l.engineers, []).join(', ') : '無'}
                  </div>
                  <div className="text-sm text-slate-600 mt-auto border-t border-slate-100 pt-3">
                    <strong className="block mb-1">施工項目進度:</strong>
                    <ul className="list-disc pl-4 space-y-1">
                      {l.work_items && safeParseJSON(l.work_items, []).map((w: any, i: number) => (
                        <li key={i} className="mb-2 last:mb-0">
                          <div>
                            <span className="font-medium">{w.name}</span>
                            {(w.worker_count || w.work_hours) && (
                              <span className="text-xs text-slate-500 ml-2">({w.worker_count || 0}人 / {w.work_hours || 0}小時)</span>
                            )}
                          </div>
                          {w.progress && (
                            <div className="text-slate-500 mt-0.5 whitespace-pre-wrap">{w.progress}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2 items-center flex-wrap">
                      {l.safety_check_1 && l.safety_check_2 && l.safety_check_3 && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded flex items-center gap-1"><CheckSquare size={12}/> 工安齊全</span>
                      )}
                      {l.photos && (
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded flex items-center gap-1">📷 {
                          Array.isArray(safeParseJSON(l.photos, [])) 
                            ? safeParseJSON(l.photos, []).length 
                            : ((safeParseJSON(l.photos, {}).close?.length || 0) + (safeParseJSON(l.photos, {}).mid?.length || 0) + (safeParseJSON(l.photos, {}).far?.length || 0))
                        } 張照片</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex border-t border-slate-100 divide-x divide-slate-100 bg-slate-50 rounded-b-xl overflow-hidden shrink-0">
                  <button onClick={() => setViewingRecord({type: 'labor', data: l})} className="flex-1 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-indigo-700 flex items-center justify-center gap-2 transition-colors"><FileText size={16}/> 檢視報表</button>
                  <button onClick={() => handleEditLabor(l)} className="flex-1 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-teal-700 flex items-center justify-center gap-2 transition-colors"><Edit2 size={16}/> 編輯</button>
                </div>
              </div>
            ))}
            {filteredLabor.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                目前沒有每日報工紀錄
              </div>
            )}
          </div>
        )}
      </div>

      {/* 浮動新增按鈕 (手機版) */}
      <div className="md:hidden fixed bottom-20 right-6 z-40">
         <button 
          onClick={() => activeTab === 'TOOLBOX' ? handleAddToolbox() : handleAddLabor()}
          className="bg-indigo-600 text-white w-14 h-14 rounded-full shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center"
        >
          <Plus size={28} />
        </button>
      </div>

      {/* Modal: 新增工具箱會議 */}
      {isToolboxModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 md:p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-t-2xl md:rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-800">{editingToolboxId ? '編輯' : '新增'}工具箱會議紀錄</h3>
              <button onClick={() => setIsToolboxModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="toolboxForm" onSubmit={handleToolboxSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">專案代碼 *</label>
                    <select required value={toolboxForm.project_id} onChange={e => setToolboxForm({...toolboxForm, project_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">-- 請選擇專案 --</option>
                      {projects.filter(p => p.status !== '評估中').map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">紀錄日期 *</label>
                    <input type="date" required value={toolboxForm.record_date} onChange={e => setToolboxForm({...toolboxForm, record_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">紀錄者</label>
                    <select value={toolboxForm.recorder_id} onChange={e => setToolboxForm({...toolboxForm, recorder_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none">
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">上工人數 *</label>
                    <input type="number" required min="1" value={toolboxForm.worker_count} onChange={e => setToolboxForm({...toolboxForm, worker_count: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2" placeholder="輸入人數" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">今日工作類別</label>
                    <select value={toolboxForm.work_category} onChange={e => setToolboxForm({...toolboxForm, work_category: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none">
                      {WORK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">今日工作內容 *</label>
                  <textarea required value={toolboxForm.work_content} onChange={e => setToolboxForm({...toolboxForm, work_content: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 min-h-[80px]" placeholder="簡述今日派工項目"></textarea>
                </div>

                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 space-y-3">
                  <h4 className="font-bold text-amber-800 text-sm mb-2">工安提醒與確認 (必勾選)</h4>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={toolboxForm.safety_check_1} onChange={e => setToolboxForm({...toolboxForm, safety_check_1: e.target.checked})} className="mt-1 w-4 h-4 text-indigo-600" />
                    <span className="text-sm text-amber-900">1. 已完成今日危害告知與安全作業說明 (嚴禁飲酒)</span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={toolboxForm.safety_check_2} onChange={e => setToolboxForm({...toolboxForm, safety_check_2: e.target.checked})} className="mt-1 w-4 h-4 text-indigo-600" />
                    <span className="text-sm text-amber-900">2. 已逐員確認禁酒、服裝儀容、安全帽及安全鞋 (禁止穿拖鞋)</span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={toolboxForm.safety_check_3} onChange={e => setToolboxForm({...toolboxForm, safety_check_3: e.target.checked})} className="mt-1 w-4 h-4 text-indigo-600" />
                    <span className="text-sm text-amber-900">3. 所有人員均了解今日工作內容與緊急應變方式</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">會議照片上傳 {editingToolboxId ? '(若不更新請留空)' : '(必須上傳 2 張) *'}</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors relative">
                    <input type="file" multiple accept="image/*" onChange={e => {
                      if (e.target.files) {
                        setToolboxPhotos(Array.from(e.target.files));
                      }
                    }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Camera className="mx-auto text-slate-400 mb-2" size={32} />
                    <p className="text-sm text-slate-600">點擊或拖曳上傳照片</p>
                    <p className="text-xs text-slate-400 mt-1">目前已選 {toolboxPhotos.length} 張</p>
                  </div>
                  {toolboxPreviewUrls.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto">
                      {toolboxPreviewUrls.map((url, i) => (
                        <img key={i} src={url} alt="preview" className="w-16 h-16 object-cover rounded border border-slate-200" />
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0 pb-safe">
              <button type="button" onClick={() => setIsToolboxModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">取消</button>
              <button type="submit" form="toolboxForm" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">送出紀錄</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: 新增每日報工 */}
      {isLaborModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 md:p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-t-2xl md:rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-800">{editingLaborId ? '編輯' : '新增'}每日報工紀錄</h3>
              <button onClick={() => setIsLaborModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="laborForm" onSubmit={handleLaborSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">專案代碼 *</label>
                    <select required value={laborForm.project_id} onChange={e => setLaborForm({...laborForm, project_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">-- 請選擇專案 --</option>
                      {projects.filter(p => p.status !== '評估中').map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">報工日期 *</label>
                    <input type="date" required value={laborForm.report_date} onChange={e => setLaborForm({...laborForm, report_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">天候狀態</label>
                    <select value={laborForm.weather} onChange={e => setLaborForm({...laborForm, weather: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none">
                      {WEATHER_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">紀錄者</label>
                    <select value={laborForm.recorder_id} onChange={e => setLaborForm({...laborForm, recorder_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none">
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">工務經理 (PM)</label>
                    <select value={laborForm.pm_id} onChange={e => setLaborForm({...laborForm, pm_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none">
                      <option value="">無</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">現場工程師指派</label>
                  {engineers.map((eng, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input type="text" value={eng} onChange={e => {
                        const newEngs = [...engineers];
                        newEngs[idx] = e.target.value;
                        setEngineers(newEngs);
                      }} placeholder="輸入工程師姓名或代號" className="flex-1 px-3 py-2 border rounded-lg outline-none" />
                      <button type="button" onClick={() => setEngineers(engineers.filter((_, i) => i !== idx))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={20}/></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setEngineers([...engineers, ''])} className="text-sm text-indigo-600 font-medium hover:underline">+ 新增一位現場工程師</button>
                </div>

                <div className="border-t border-slate-200 pt-4 mt-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">現場派工人員</label>
                  {dispatchWorkers.map((worker, idx) => (
                    <div key={idx} className="flex flex-col gap-2 mb-3 p-3 bg-slate-50 border rounded-lg">
                      <div className="flex flex-wrap gap-2 items-center">
                        <input type="text" value={worker.name} onChange={e => {
                          const newWorkers = [...dispatchWorkers];
                          newWorkers[idx].name = e.target.value;
                          setDispatchWorkers(newWorkers);
                        }} placeholder="姓名" className="flex-1 min-w-[80px] px-3 py-1.5 text-sm border rounded outline-none" />

                        <TimeInput24 value={worker.start_time} onChange={val => {
                          const newWorkers = [...dispatchWorkers];
                          newWorkers[idx].start_time = val;
                          newWorkers[idx].work_hours = calculateWorkHours(val, worker.end_time);
                          setDispatchWorkers(newWorkers);
                        }} className="text-sm" />
                        
                        <span className="text-slate-500">-</span>
                        
                        <TimeInput24 value={worker.end_time} onChange={val => {
                          const newWorkers = [...dispatchWorkers];
                          newWorkers[idx].end_time = val;
                          newWorkers[idx].work_hours = calculateWorkHours(worker.start_time, val);
                          setDispatchWorkers(newWorkers);
                        }} className="text-sm" />

                        <div className="w-16 text-center text-sm font-bold text-indigo-700 shrink-0">
                          {worker.work_hours} hr
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center mt-1">
                        <select value={worker.work_category} onChange={e => {
                          const newWorkers = [...dispatchWorkers];
                          newWorkers[idx].work_category = e.target.value;
                          newWorkers[idx].work_item = categoryToItems[e.target.value][0] || '';
                          setDispatchWorkers(newWorkers);
                        }} className="w-[84px] px-2 py-1.5 text-sm border rounded outline-none bg-white">
                          {WORK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        
                        <select value={worker.work_item || ''} onChange={e => {
                          const newWorkers = [...dispatchWorkers];
                          newWorkers[idx].work_item = e.target.value;
                          setDispatchWorkers(newWorkers);
                        }} className="flex-1 min-w-[120px] px-2 py-1.5 text-sm border rounded outline-none bg-white">
                          {(categoryToItems[worker.work_category] || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>

                        <button type="button" onClick={() => setDispatchWorkers(dispatchWorkers.filter((_, i) => i !== idx))} className="p-1.5 text-red-500 hover:bg-red-100 rounded shrink-0"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setDispatchWorkers([...dispatchWorkers, {name: '', start_time: '08:00', end_time: '17:00', work_category: '土木', work_item: categoryToItems['土木'][0], work_hours: 8}])} className="text-sm text-indigo-600 font-medium hover:underline">+ 新增派工人員</button>
                </div>

                <div className="border-t border-slate-200 pt-4 mt-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">工作類別與工項進度</label>
                  <select value={laborForm.work_category} onChange={e => {
                    setLaborForm({...laborForm, work_category: e.target.value});
                    setWorkItems([{name: categoryToItems[e.target.value][0], progress: '', worker_count: '', work_hours: ''}]);
                  }} className="w-full px-3 py-2 border rounded-lg outline-none mb-4 font-medium bg-slate-50">
                    {WORK_CATEGORIES.map(c => <option key={c} value={c}>{c}工程</option>)}
                  </select>

                  <div className="space-y-3">
                    {workItems.map((item, idx) => (
                      <div key={idx} className="mb-3">
                        <div className="flex gap-2">
                          <select value={item.name} onChange={e => {
                            const newItems = [...workItems];
                            newItems[idx].name = e.target.value;
                            if (laborForm.work_category === '土木' && INSPECTION_TEMPLATES[e.target.value]) {
                              const tpl = INSPECTION_TEMPLATES[e.target.value];
                              newItems[idx].inspection = {
                                fields: tpl.fields.reduce((acc, f) => ({...acc, [f]: ''}), {}),
                                checks: new Array(tpl.checks.length).fill(false),
                                result: tpl.results[0],
                                note: ''
                              };
                            } else {
                              delete newItems[idx].inspection;
                            }
                            setWorkItems(newItems);
                          }} className="flex-1 px-3 py-2 border rounded-lg outline-none">
                            {categoryToItems[laborForm.work_category].map(opts => <option key={opts} value={opts}>{opts}</option>)}
                          </select>
                          <input type="text" readOnly value={item.worker_count ? `${item.worker_count} 人` : ''} placeholder="人數" className="w-24 px-3 py-2 border rounded-lg outline-none bg-slate-100 text-slate-500 cursor-not-allowed text-center font-medium" />
                          <input type="text" readOnly value={item.work_hours ? `${item.work_hours} hr` : ''} placeholder="工時" className="w-24 px-3 py-2 border rounded-lg outline-none bg-slate-100 text-slate-500 cursor-not-allowed text-center font-medium" />
                          <button type="button" onClick={() => setWorkItems(workItems.filter((_, i) => i !== idx))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0"><Trash2 size={20}/></button>
                        </div>
                        <div className="mt-2">
                          <input type="text" value={item.progress} onChange={e => {
                            const newItems = [...workItems];
                            newItems[idx].progress = e.target.value;
                            setWorkItems(newItems);
                          }} placeholder="填寫進度說明 (例: 已完成50%)" required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        {item.inspection && laborForm.work_category === '土木' && INSPECTION_TEMPLATES[item.name] && (
                          <div className="mt-3 border-l-4 border-indigo-500 pl-4 py-2 bg-slate-50 rounded-r-xl">
                            <h5 className="font-bold text-slate-800 mb-3">{item.name}自主檢查</h5>
                            
                            {INSPECTION_TEMPLATES[item.name].fields.length > 0 && (
                              <div className="grid grid-cols-2 gap-3 mb-4">
                                {INSPECTION_TEMPLATES[item.name].fields.map(f => (
                                  <div key={f}>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">{f}</label>
                                    <input type="text" value={item.inspection!.fields[f] || ''} onChange={e => {
                                      const newItems = [...workItems];
                                      newItems[idx].inspection!.fields[f] = e.target.value;
                                      setWorkItems(newItems);
                                    }} className="w-full px-2 py-1 text-sm border rounded outline-none focus:ring-1" />
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="space-y-2 mb-4">
                              {INSPECTION_TEMPLATES[item.name].checks.map((checkText, cIdx) => (
                                <label key={cIdx} className="flex items-start gap-2 cursor-pointer bg-white p-2 border rounded shadow-sm">
                                  <input type="checkbox" checked={item.inspection!.checks[cIdx]} onChange={e => {
                                    const newItems = [...workItems];
                                    newItems[idx].inspection!.checks[cIdx] = e.target.checked;
                                    setWorkItems(newItems);
                                  }} className="mt-0.5 rounded text-indigo-600" />
                                  <span className="text-sm text-slate-700">{checkText}</span>
                                </label>
                              ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">檢查結果</label>
                                <select value={item.inspection!.result} onChange={e => {
                                  const newItems = [...workItems];
                                  newItems[idx].inspection!.result = e.target.value;
                                  setWorkItems(newItems);
                                }} className="w-full px-2 py-1.5 text-sm border rounded outline-none font-bold">
                                  {INSPECTION_TEMPLATES[item.name].results.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">異常/改善說明</label>
                                <input type="text" value={item.inspection!.note} onChange={e => {
                                  const newItems = [...workItems];
                                  newItems[idx].inspection!.note = e.target.value;
                                  setWorkItems(newItems);
                                }} placeholder="無異常或填寫改善內容" className="w-full px-2 py-1 text-sm border rounded outline-none" />
                              </div>
                            </div>

                            <div className="bg-teal-50/50 border border-teal-200 border-dashed rounded p-3">
                              <label className="block text-xs font-bold text-teal-700 mb-2">{INSPECTION_TEMPLATES[item.name].photoLabel} (必填)</label>
                              <input type="file" accept="image/*" onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  const newItems = [...workItems];
                                  newItems[idx].inspection!.photo = e.target.files[0];
                                  setWorkItems(newItems);
                                }
                              }} className="text-sm w-full" />
                              {typeof item.inspection!.photo === 'string' && (
                                <img src={`http://localhost:3001${item.inspection!.photo}`} alt="已上傳" className="mt-2 h-16 w-16 object-cover rounded shadow" />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => {
                    const defaultName = categoryToItems[laborForm.work_category][0];
                    const newItem: WorkItem = { name: defaultName, progress: '', worker_count: '', work_hours: '' };
                    if (laborForm.work_category === '土木' && INSPECTION_TEMPLATES[defaultName]) {
                      const tpl = INSPECTION_TEMPLATES[defaultName];
                      newItem.inspection = {
                        fields: tpl.fields.reduce((acc, f) => ({...acc, [f]: ''}), {}),
                        checks: new Array(tpl.checks.length).fill(false),
                        result: tpl.results[0],
                        note: ''
                      };
                    }
                    setWorkItems([...workItems, newItem]);
                  }} className="text-sm text-indigo-600 font-medium hover:underline mt-2">+ 新增工項</button>
                </div>

                <div className="border border-green-200 bg-green-50/50 rounded-xl p-4 mt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <h4 className="font-bold text-teal-700">圖說確認 (必填)</h4>
                    <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded">未確認不得正式保存施工日報</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">圖號</label>
                      <input type="text" value={laborForm.drawing_number} onChange={e => setLaborForm({...laborForm, drawing_number: e.target.value})} placeholder="例如：C-101 / S-205 / E-301" required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">版次</label>
                      <input type="text" value={laborForm.drawing_revision} onChange={e => setLaborForm({...laborForm, drawing_revision: e.target.value})} placeholder="例如：Rev.2" required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">施工位置</label>
                      <input type="text" value={laborForm.construction_location} onChange={e => setLaborForm({...laborForm, construction_location: e.target.value})} placeholder="例如：A區、軸線 A-3" required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">確認結果</label>
                      <select value={laborForm.drawing_check_result} onChange={e => setLaborForm({...laborForm, drawing_check_result: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white font-bold text-slate-700">
                        <option value="符合圖說">符合圖說</option>
                        <option value="不符合圖說">不符合圖說</option>
                      </select>
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer mt-4 pt-4 border-t border-green-200/50">
                      <input type="checkbox" checked={laborForm.drawing_check_confirmed} onChange={e => setLaborForm({...laborForm, drawing_check_confirmed: e.target.checked})} className="mt-1 w-4 h-4 text-teal-600 rounded" />
                      <span className="text-sm text-slate-600 font-medium">我已核對核准圖號、最新版次、尺寸、高程及施工位置，確認結果如上。</span>
                    </label>
                  </div>
                </div>

                <div className="border border-teal-200 bg-teal-50/10 rounded-xl p-4 mt-6 shadow-sm relative">
                  <div className="absolute top-4 right-4 bg-orange-100 text-orange-800 font-bold px-3 py-1 rounded-full text-sm">
                    {laborPhotosClose.length + laborPhotosMid.length + laborPhotosFar.length} / 6 張
                  </div>
                  <h4 className="font-bold text-teal-800 mb-4 text-lg flex items-center gap-2">
                    施工日誌照片 <span className="text-sm font-bold text-teal-600">(必填至少 6 張)</span>
                  </h4>
                  <p className="text-xs text-slate-500 font-normal mb-4">近照 2 張＋中距離 2 張＋遠距離 2 張</p>
                  
                  <div className="space-y-4">
                    {/* 近照 */}
                    <div className="border border-dashed border-teal-300 bg-white rounded-xl p-4">
                      <h5 className="font-bold text-slate-700">近照 <span className="text-slate-500 font-normal text-sm">(至少 2 張)</span></h5>
                      <p className="text-xs text-slate-400 mb-3">細部、接點、尺寸或施工品質</p>
                      <input type="file" multiple accept="image/*" onChange={e => {
                        if (e.target.files) {
                          const files = Array.from(e.target.files);
                          if (files.length > 4) { alert('近照最多只能上傳 4 張'); setLaborPhotosClose(files.slice(0, 4)); }
                          else setLaborPhotosClose(files);
                        }
                      }} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 p-2 border border-slate-200 rounded-lg bg-slate-50" />
                      <div className={`mt-2 font-bold text-sm ${laborPhotosClose.length >= 2 ? 'text-teal-600' : 'text-red-500'}`}>{laborPhotosClose.length} / 2 張</div>
                      {laborPhotosClose.length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {laborPhotosClose.map((f, i) => <div key={i} className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600 truncate max-w-[150px]">{f.name}</div>)}
                        </div>
                      )}
                    </div>

                    {/* 中距離照 */}
                    <div className="border border-dashed border-teal-300 bg-white rounded-xl p-4">
                      <h5 className="font-bold text-slate-700">中距離照 <span className="text-slate-500 font-normal text-sm">(至少 2 張)</span></h5>
                      <p className="text-xs text-slate-400 mb-3">施工人員、工作面與工項範圍</p>
                      <input type="file" multiple accept="image/*" onChange={e => {
                        if (e.target.files) {
                          const files = Array.from(e.target.files);
                          if (files.length > 4) { alert('中距離照最多只能上傳 4 張'); setLaborPhotosMid(files.slice(0, 4)); }
                          else setLaborPhotosMid(files);
                        }
                      }} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 p-2 border border-slate-200 rounded-lg bg-slate-50" />
                      <div className={`mt-2 font-bold text-sm ${laborPhotosMid.length >= 2 ? 'text-teal-600' : 'text-red-500'}`}>{laborPhotosMid.length} / 2 張</div>
                      {laborPhotosMid.length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {laborPhotosMid.map((f, i) => <div key={i} className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600 truncate max-w-[150px]">{f.name}</div>)}
                        </div>
                      )}
                    </div>

                    {/* 遠距照 */}
                    <div className="border border-dashed border-teal-300 bg-white rounded-xl p-4">
                      <h5 className="font-bold text-slate-700">遠距照 <span className="text-slate-500 font-normal text-sm">(至少 2 張)</span></h5>
                      <p className="text-xs text-slate-400 mb-3">案場全景、區域位置與整體進度</p>
                      <input type="file" multiple accept="image/*" onChange={e => {
                        if (e.target.files) {
                          const files = Array.from(e.target.files);
                          if (files.length > 4) { alert('遠距照最多只能上傳 4 張'); setLaborPhotosFar(files.slice(0, 4)); }
                          else setLaborPhotosFar(files);
                        }
                      }} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 p-2 border border-slate-200 rounded-lg bg-slate-50" />
                      <div className={`mt-2 font-bold text-sm ${laborPhotosFar.length >= 2 ? 'text-teal-600' : 'text-red-500'}`}>{laborPhotosFar.length} / 2 張</div>
                      {laborPhotosFar.length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {laborPhotosFar.map((f, i) => <div key={i} className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600 truncate max-w-[150px]">{f.name}</div>)}
                        </div>
                      )}
                    </div>
                  </div>
                  {editingLaborId && <p className="text-xs text-orange-500 mt-3 text-center">重新上傳會完全覆蓋舊有照片</p>}
                </div>

                <div className="border border-orange-200 bg-orange-50/30 rounded-xl p-4 mt-6">
                  <h4 className="font-bold text-orange-800 mb-3">工安確認 (必填)</h4>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" required checked={laborForm.safety_check_1} onChange={e => setLaborForm({...laborForm, safety_check_1: e.target.checked})} className="mt-1 w-4 h-4 text-orange-600 rounded" />
                      <span className="text-sm text-slate-700">已落實勤前教育、危害告知與工具箱會議</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" required checked={laborForm.safety_check_2} onChange={e => setLaborForm({...laborForm, safety_check_2: e.target.checked})} className="mt-1 w-4 h-4 text-orange-600 rounded" />
                      <span className="text-sm text-slate-700">人員已確實配戴個人防護具 (安全帽、反光背心等)</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" required checked={laborForm.safety_check_3} onChange={e => setLaborForm({...laborForm, safety_check_3: e.target.checked})} className="mt-1 w-4 h-4 text-orange-600 rounded" />
                      <span className="text-sm text-slate-700">施工環境安全檢查無虞，動線及防護設施已就位</span>
                    </label>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-bold text-slate-700 mb-2">補充說明 (選填)</label>
                  <textarea value={laborForm.additional_notes} onChange={e => setLaborForm({...laborForm, additional_notes: e.target.value})} placeholder="填寫其他需紀錄之事項、異常狀況或協調內容..." className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"></textarea>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mt-6 flex justify-between items-center">
                  <span className="font-bold text-indigo-900">總計</span>
                  <div className="flex gap-4 text-sm font-medium">
                    <span className="text-indigo-800">總人數: <span className="text-indigo-600 text-lg">{workItems.reduce((acc, w) => acc + (Number(w.worker_count) || 0), 0)}</span> 人</span>
                    <span className="text-indigo-800">總工時: <span className="text-indigo-600 text-lg">{workItems.reduce((acc, w) => acc + (Number(w.work_hours) || 0), 0)}</span> 小時</span>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0 pb-safe">
              <button type="button" onClick={() => setIsLaborModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">取消</button>
              <button type="submit" form="laborForm" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">送出紀錄</button>
            </div>
          </div>
        </div>
      )}

      {/* 報表檢視 Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center items-start p-0 md:p-8 overflow-y-auto print:p-0 print:bg-white">
          <style>{`
            @media print {
              body > *:not(#print-root) { display: none !important; }
              #print-root { display: block !important; position: absolute; left: 0; top: 0; width: 100%; height: auto; background: white; margin: 0; padding: 0; }
              .no-print { display: none !important; }
              @page { size: auto; margin: 20mm; }
            }
          `}</style>
          <div id="print-root" className="bg-white w-full max-w-4xl min-h-screen md:min-h-0 md:rounded-2xl shadow-2xl relative">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 shrink-0 sticky top-0 bg-white z-10 md:rounded-t-2xl no-print">
              <h2 className="text-xl font-bold text-slate-800">
                {viewingRecord.type === 'toolbox' ? '工具箱會議報表' : '施工日誌報表'}
              </h2>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="p-2 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 rounded-lg flex items-center gap-2 font-bold transition-colors">
                  <Printer size={20} /> <span className="hidden sm:inline">列印報表</span>
                </button>
                <button onClick={() => setViewingRecord(null)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6 md:p-10 space-y-8 text-slate-800 bg-white">
              {viewingRecord.type === 'toolbox' && (
                <>
                  <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
                    <h1 className="text-3xl font-black tracking-widest">{viewingRecord.data.project ? `${viewingRecord.data.project.project_code} ${viewingRecord.data.project.project_name}` : '無專案'}</h1>
                    <h2 className="text-2xl font-bold mt-2 tracking-widest">勞工安全衛生工具箱會議紀錄表</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-lg border-b border-slate-200 pb-6">
                    <div><strong>會議日期：</strong> {new Date(viewingRecord.data.record_date).toLocaleDateString()}</div>
                    <div><strong>工程名稱：</strong> {viewingRecord.data.work_category}工程</div>
                    <div><strong>工務經理：</strong> {viewingRecord.data.pm?.name || '無'}</div>
                    <div><strong>記錄人員：</strong> {viewingRecord.data.recorder?.name}</div>
                    <div><strong>與會人數：</strong> {viewingRecord.data.worker_count} 人</div>
                    <div className="col-span-2"><strong>參與人員：</strong> {viewingRecord.data.participants ? safeParseJSON(viewingRecord.data.participants, []).join(', ') : '無'}</div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-3 border-l-4 border-indigo-600 pl-3">會議與宣導內容</h3>
                    <p className="whitespace-pre-wrap leading-relaxed text-lg bg-slate-50 p-4 rounded-xl border border-slate-200">{viewingRecord.data.work_content}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-xl p-4 flex flex-col justify-between items-center text-center">
                      <span className="font-bold mb-2">機具/設備檢查</span>
                      {viewingRecord.data.safety_check_1 ? <CheckSquare className="text-green-600 w-8 h-8"/> : <div className="w-8 h-8 border-2 border-slate-300 rounded"></div>}
                    </div>
                    <div className="border rounded-xl p-4 flex flex-col justify-between items-center text-center">
                      <span className="font-bold mb-2">安全防護具著裝</span>
                      {viewingRecord.data.safety_check_2 ? <CheckSquare className="text-green-600 w-8 h-8"/> : <div className="w-8 h-8 border-2 border-slate-300 rounded"></div>}
                    </div>
                    <div className="border rounded-xl p-4 flex flex-col justify-between items-center text-center">
                      <span className="font-bold mb-2">施工動線與環境安全</span>
                      {viewingRecord.data.safety_check_3 ? <CheckSquare className="text-green-600 w-8 h-8"/> : <div className="w-8 h-8 border-2 border-slate-300 rounded"></div>}
                    </div>
                  </div>
                  {viewingRecord.data.photos && safeParseJSON(viewingRecord.data.photos, []).length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold mb-3 border-l-4 border-indigo-600 pl-3">會議照片</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {safeParseJSON(viewingRecord.data.photos, []).map((p: string, i: number) => (
                          <img key={i} src={`http://localhost:3001${p}`} alt="會議照片" className="w-full h-48 object-cover rounded-xl border shadow-sm" />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {viewingRecord.type === 'labor' && (
                <>
                  <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
                    <h1 className="text-3xl font-black tracking-widest">{viewingRecord.data.project ? `${viewingRecord.data.project.project_code} ${viewingRecord.data.project.project_name}` : '無專案'}</h1>
                    <h2 className="text-2xl font-bold mt-2 tracking-widest">施工日誌報表</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-lg border-b border-slate-200 pb-6">
                    <div><strong>報工日期：</strong> {new Date(viewingRecord.data.report_date).toLocaleDateString()}</div>
                    <div><strong>天氣狀況：</strong> {viewingRecord.data.weather}</div>
                    <div><strong>工程類別：</strong> {viewingRecord.data.work_category}工程</div>
                    <div><strong>工務經理：</strong> {viewingRecord.data.pm?.name || '無'}</div>
                    <div><strong>記錄人員：</strong> {viewingRecord.data.recorder?.name}</div>
                    <div className="col-span-2"><strong>現場工程師：</strong> {viewingRecord.data.engineers ? safeParseJSON(viewingRecord.data.engineers, []).join(', ') : '無'}</div>
                  </div>
                  
                  {viewingRecord.data.dispatch_workers && safeParseJSON(viewingRecord.data.dispatch_workers, []).length > 0 && (
                    <div className="mt-6 mb-8">
                      <h3 className="text-xl font-bold mb-3 border-l-4 border-indigo-600 pl-3">現場派工人員</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse border border-slate-300">
                          <thead>
                            <tr className="bg-slate-100 text-sm">
                              <th className="border border-slate-300 p-2">姓名</th>
                              <th className="border border-slate-300 p-2">工作類別與工項</th>
                              <th className="border border-slate-300 p-2">上班時間</th>
                              <th className="border border-slate-300 p-2">下班時間</th>
                              <th className="border border-slate-300 p-2 text-right">工時</th>
                            </tr>
                          </thead>
                          <tbody>
                            {safeParseJSON(viewingRecord.data.dispatch_workers, []).map((w: any, i: number) => (
                              <tr key={i} className="text-sm">
                                <td className="border border-slate-300 p-2">{w.name}</td>
                                <td className="border border-slate-300 p-2">{w.work_category} - {w.work_item}</td>
                                <td className="border border-slate-300 p-2">{w.start_time}</td>
                                <td className="border border-slate-300 p-2">{w.end_time}</td>
                                <td className="border border-slate-300 p-2 text-right font-medium">{w.work_hours}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-indigo-50 font-bold text-sm">
                              <td colSpan={4} className="border border-slate-300 p-2 text-right">總派工時數：</td>
                              <td className="border border-slate-300 p-2 text-right text-indigo-700">{safeParseJSON(viewingRecord.data.dispatch_workers, []).reduce((acc: number, w: any) => acc + (Number(w.work_hours) || 0), 0)} hr</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-xl font-bold mb-3 border-l-4 border-indigo-600 pl-3">施工項目與出工人數</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="border border-slate-300 p-2">工項名稱</th>
                            <th className="border border-slate-300 p-2">施工進度</th>
                            <th className="border border-slate-300 p-2 text-right">出工人數</th>
                            <th className="border border-slate-300 p-2 text-right">施工時數</th>
                          </tr>
                        </thead>
                        <tbody>
                          {safeParseJSON(viewingRecord.data.work_items, []).map((w: any, i: number) => (
                            <tr key={i}>
                              <td className="border border-slate-300 p-2">{w.name}</td>
                              <td className="border border-slate-300 p-2">{w.progress}</td>
                              <td className="border border-slate-300 p-2 text-right">{w.worker_count || 0}</td>
                              <td className="border border-slate-300 p-2 text-right">{w.work_hours || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-indigo-50 font-bold">
                            <td colSpan={2} className="border border-slate-300 p-2 text-right">總計：</td>
                            <td className="border border-slate-300 p-2 text-right text-indigo-700">{safeParseJSON(viewingRecord.data.work_items, []).reduce((acc: number, w: any) => acc + (Number(w.worker_count) || 0), 0)} 人</td>
                            <td className="border border-slate-300 p-2 text-right text-indigo-700">{safeParseJSON(viewingRecord.data.work_items, []).reduce((acc: number, w: any) => acc + (Number(w.work_hours) || 0), 0)} 小時</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {safeParseJSON(viewingRecord.data.work_items, []).some((w: any) => w.inspection) && (
                    <div className="mt-8">
                      <h3 className="text-xl font-bold mb-3 border-l-4 border-indigo-600 pl-3">自主檢查紀錄</h3>
                      <div className="space-y-4">
                        {safeParseJSON(viewingRecord.data.work_items, []).filter((w: any) => w.inspection).map((w: any, i: number) => (
                          <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <h4 className="font-bold text-lg text-slate-800 mb-3 pb-2 border-b border-slate-200">{w.name} - 自主檢查表</h4>
                            
                            {Object.keys(w.inspection.fields || {}).length > 0 && (
                              <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                {Object.entries(w.inspection.fields).map(([k, v], idx) => (
                                  <div key={idx}><span className="font-bold text-slate-600">{k}:</span> {v as string}</div>
                                ))}
                              </div>
                            )}

                            {w.inspection.checks && w.inspection.checks.length > 0 && (
                              <div className="mb-4">
                                <h5 className="font-bold text-slate-700 text-sm mb-2">檢查項目</h5>
                                <div className="space-y-2">
                                  {w.inspection.checks.map((checked: boolean, cIdx: number) => (
                                    <div key={cIdx} className="flex items-start gap-2 text-sm">
                                      {checked ? <CheckSquare size={18} className="text-indigo-600 shrink-0"/> : <div className="w-[18px] h-[18px] border-2 border-slate-300 rounded shrink-0"></div>}
                                      <span>{INSPECTION_TEMPLATES[w.name]?.checks[cIdx] || `項目 ${cIdx + 1}`}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex gap-4 text-sm mt-4 pt-4 border-t border-slate-200">
                              <div><span className="font-bold text-slate-600">檢查結果:</span> <span className={`font-bold ${w.inspection.result === '檢查合格' ? 'text-green-600' : 'text-orange-600'}`}>{w.inspection.result}</span></div>
                              {w.inspection.note && <div><span className="font-bold text-slate-600">備註:</span> {w.inspection.note}</div>}
                            </div>
                            {typeof w.inspection.photo === 'string' && (
                              <div className="mt-4 pt-4 border-t border-slate-200">
                                <h5 className="font-bold text-slate-700 text-sm mb-2">{INSPECTION_TEMPLATES[w.name]?.photoLabel || '檢查照片'}</h5>
                                <img src={`http://localhost:3001${w.inspection.photo}`} alt="檢查照片" className="w-48 h-48 object-cover rounded-xl border shadow-sm" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-xl font-bold mb-3 border-l-4 border-teal-600 pl-3">圖說確認</h3>
                      <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl space-y-2 text-teal-900">
                        <div><strong>核准圖號：</strong> {viewingRecord.data.drawing_number}</div>
                        <div><strong>最新版次：</strong> {viewingRecord.data.drawing_revision}</div>
                        <div><strong>施工位置：</strong> {viewingRecord.data.construction_location}</div>
                        <div><strong>核對結果：</strong> <span className="font-bold">{viewingRecord.data.drawing_check_result}</span></div>
                        <div className="mt-2 pt-2 border-t border-teal-200/50 flex items-center gap-2 text-sm">
                          {viewingRecord.data.drawing_check_confirmed ? <CheckSquare size={16}/> : <div className="w-4 h-4 border border-slate-400"></div>}
                          我已核對核准圖號、最新版次、尺寸、高程及施工位置，確認結果如上。
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-3 border-l-4 border-orange-600 pl-3">工安確認</h3>
                      <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl space-y-3 text-orange-900">
                        <div className="flex items-start gap-2">
                          {viewingRecord.data.safety_check_1 ? <CheckSquare size={20} className="shrink-0 text-orange-600"/> : <div className="w-5 h-5 shrink-0 border border-slate-400"></div>}
                          <span>已落實勤前教育、危害告知與工具箱會議</span>
                        </div>
                        <div className="flex items-start gap-2">
                          {viewingRecord.data.safety_check_2 ? <CheckSquare size={20} className="shrink-0 text-orange-600"/> : <div className="w-5 h-5 shrink-0 border border-slate-400"></div>}
                          <span>人員已確實配戴個人防護具 (安全帽、反光背心等)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          {viewingRecord.data.safety_check_3 ? <CheckSquare size={20} className="shrink-0 text-orange-600"/> : <div className="w-5 h-5 shrink-0 border border-slate-400"></div>}
                          <span>施工環境安全檢查無虞，動線及防護設施已就位</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {viewingRecord.data.photos && (
                    <div>
                      <h3 className="text-xl font-bold mb-3 border-l-4 border-indigo-600 pl-3">施工照片</h3>
                      
                      {safeParseJSON(viewingRecord.data.photos, {}).close?.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-bold text-slate-600 mb-2">近照</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {safeParseJSON(viewingRecord.data.photos, {}).close.map((p: string, i: number) => (
                              <img key={i} src={`http://localhost:3001${p}`} alt="近照" className="w-full h-48 object-cover rounded-xl border shadow-sm" />
                            ))}
                          </div>
                        </div>
                      )}
                      {safeParseJSON(viewingRecord.data.photos, {}).mid?.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-bold text-slate-600 mb-2">中距離照</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {safeParseJSON(viewingRecord.data.photos, {}).mid.map((p: string, i: number) => (
                              <img key={i} src={`http://localhost:3001${p}`} alt="中距離照" className="w-full h-48 object-cover rounded-xl border shadow-sm" />
                            ))}
                          </div>
                        </div>
                      )}
                      {safeParseJSON(viewingRecord.data.photos, {}).far?.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-bold text-slate-600 mb-2">遠距照</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {safeParseJSON(viewingRecord.data.photos, {}).far.map((p: string, i: number) => (
                              <img key={i} src={`http://localhost:3001${p}`} alt="遠距照" className="w-full h-48 object-cover rounded-xl border shadow-sm" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {viewingRecord.data.additional_notes && (
                    <div>
                      <h3 className="text-xl font-bold mb-3 border-l-4 border-slate-600 pl-3">補充說明</h3>
                      <p className="whitespace-pre-wrap leading-relaxed text-lg bg-slate-50 p-4 rounded-xl border border-slate-200">{viewingRecord.data.additional_notes}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onsite;
