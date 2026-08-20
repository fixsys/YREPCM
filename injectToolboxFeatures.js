const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Onsite.tsx', 'utf8');

const constantsCode = `
const TOOLBOX_WORK_ITEMS = ['測量、收方', '灌漿作業', '鋼筋綁紮', '模板作業', '鋼構作業', '吊掛作業', '浪板鋪設更換作業', '太陽能板鋪設作業', '機電設備作業', '機電配管線作業', '材料堆疊、環境整理', '其他(於備註欄說明)'];
const TOOLBOX_PHYSICAL_HAZARDS = ['跌落、墜落', '物體飛落', '異物入眼', '高、低溫接觸', '擦傷、刺傷、扭傷、壓傷、夾傷、割傷、碰撞', '噪音'];
const TOOLBOX_CHEMICAL_HAZARDS = ['化學性灼傷', '化學吸入'];
const TOOLBOX_FIRE_HAZARDS = ['火災', '爆炸'];
const TOOLBOX_ELECTRICAL_HAZARDS = ['感電'];
const TOOLBOX_PPE = ['安全帽', '安全鞋', '施工背心', '全身背負式安全帶', '防墜器', '安全眼鏡', '絕緣手套', '安全面罩', '防護衣', '防塵口罩', '防毒面具', '防化圍裙', '防化手套', '防化鞋'];
const TOOLBOX_SAFETY_FACILITIES = ['合梯', '爬梯', '施工架', '安全母索', '安全防墜網', '吊籠/護欄', '警示圍籬', '防火毯', '搶救設備', '滅火器', '通風設備', '檢電器', '高壓電防護設備', '接地棒', '漏電斷路器', '照明設備', '通訊設備', '氧乙炔焊防回火裝置', '電焊防電擊裝置'];
const TOOLBOX_WORK_AREAS = ['浪板屋頂', '建物屋頂', '地面', '圳溝', '蓄水池', '其他'];
`;

code = code.replace('const Onsite = () => {', constantsCode + '\nconst Onsite = () => {');

// 1. Update initial state
const stateOld = `safety_check_3: false
  });`;
const stateNew = `safety_check_3: false,
    work_area: '',
    work_items: [] as any[],
    hazards: [] as string[],
    safety_measures: [] as string[],
    other_risks: ''
  });`;
code = code.replace(stateOld, stateNew);

// 2. Update handleAddToolbox
const handleAddOld = `safety_check_3: false });`;
const handleAddNew = `safety_check_3: false, work_area: '', work_items: [], hazards: [], safety_measures: [], other_risks: '' });`;
code = code.replace(handleAddOld, handleAddNew);

// 3. Update handleEditToolbox
const handleEditOld = `safety_check_3: t.safety_check_3
    });`;
const handleEditNew = `safety_check_3: t.safety_check_3,
      work_area: t.work_area || '',
      work_items: safeParseJSON(t.work_items, []),
      hazards: safeParseJSON(t.hazards, []),
      safety_measures: safeParseJSON(t.safety_measures, []),
      other_risks: t.other_risks || ''
    });`;
code = code.replace(handleEditOld, handleEditNew);

// 4. Update submit
const submitOld = `Object.entries(toolboxForm).forEach(([key, val]) => formData.append(key, val.toString()));`;
const submitNew = `Object.entries(toolboxForm).forEach(([key, val]) => formData.append(key, typeof val === 'object' ? JSON.stringify(val) : String(val)));`;
code = code.replace(submitOld, submitNew);

// 5. Inject Form UI
const formUIOld = `<div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={toolboxForm.safety_check_1} onChange={e => setToolboxForm({ ...toolboxForm, safety_check_1: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                    機具/設備檢查
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={toolboxForm.safety_check_2} onChange={e => setToolboxForm({ ...toolboxForm, safety_check_2: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                    安全防護具著裝
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={toolboxForm.safety_check_3} onChange={e => setToolboxForm({ ...toolboxForm, safety_check_3: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                    施工動線與環境安全
                  </label>
                </div>`;
const formUINew = formUIOld + `
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h3 className="font-bold text-lg text-slate-800 mb-2">詳細作業內容與安全檢核</h3>
                  
                  {/* 施工區域 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">施工區域</label>
                    <div className="flex flex-wrap gap-4">
                      {TOOLBOX_WORK_AREAS.map(area => (
                         <label key={area} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                           <input type="radio" checked={toolboxForm.work_area === area || (area === '其他' && !TOOLBOX_WORK_AREAS.includes(toolboxForm.work_area) && toolboxForm.work_area !== '')} onChange={() => setToolboxForm({...toolboxForm, work_area: area === '其他' ? '其他填寫...' : area})} className="text-indigo-600" />
                           {area}
                         </label>
                      ))}
                      {(!TOOLBOX_WORK_AREAS.includes(toolboxForm.work_area) || toolboxForm.work_area === '其他填寫...') && toolboxForm.work_area !== '' && (
                         <input type="text" value={toolboxForm.work_area === '其他填寫...' ? '' : toolboxForm.work_area} onChange={e => setToolboxForm({...toolboxForm, work_area: e.target.value})} placeholder="請註明其他區域" className="border-b border-slate-300 outline-none px-1 text-sm text-slate-700" />
                      )}
                    </div>
                  </div>

                  {/* 工作內容 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">工作內容 (勾選並填寫備註)</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {TOOLBOX_WORK_ITEMS.map(item => {
                         const existingItem = toolboxForm.work_items.find(w => w.name === item);
                         return (
                           <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
                             <input type="checkbox" checked={!!existingItem} onChange={e => {
                               if (e.target.checked) setToolboxForm({...toolboxForm, work_items: [...toolboxForm.work_items, { name: item, note: '' }]});
                               else setToolboxForm({...toolboxForm, work_items: toolboxForm.work_items.filter(w => w.name !== item)});
                             }} className="w-4 h-4 text-indigo-600" />
                             <span className="shrink-0">{item}</span>
                             {existingItem && (
                               <input type="text" placeholder="備註..." value={existingItem.note} onChange={e => {
                                 setToolboxForm({
                                   ...toolboxForm,
                                   work_items: toolboxForm.work_items.map(w => w.name === item ? { ...w, note: e.target.value } : w)
                                 });
                               }} className="flex-1 ml-2 border-b border-slate-300 outline-none px-1 text-xs" />
                             )}
                           </div>
                         );
                      })}
                    </div>
                  </div>

                  {/* 物理性危害 */}
                  <div className="mb-4 bg-slate-50 p-3 rounded">
                    <label className="block text-sm font-bold text-slate-700 mb-2">物理性危害</label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {TOOLBOX_PHYSICAL_HAZARDS.map(h => (
                         <label key={h} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                           <input type="checkbox" checked={toolboxForm.hazards.includes(h)} onChange={e => {
                             if (e.target.checked) setToolboxForm({...toolboxForm, hazards: [...toolboxForm.hazards, h]});
                             else setToolboxForm({...toolboxForm, hazards: toolboxForm.hazards.filter(item => item !== h)});
                           }} className="w-4 h-4 text-orange-600" />
                           {h}
                         </label>
                      ))}
                    </div>
                  </div>

                  {/* 化學性/火災/感電危害 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-slate-50 p-3 rounded">
                      <label className="block text-sm font-bold text-slate-700 mb-2">化學性危害</label>
                      <div className="flex flex-col gap-2">
                        {TOOLBOX_CHEMICAL_HAZARDS.map(h => (
                           <label key={h} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                             <input type="checkbox" checked={toolboxForm.hazards.includes(h)} onChange={e => {
                               if (e.target.checked) setToolboxForm({...toolboxForm, hazards: [...toolboxForm.hazards, h]});
                               else setToolboxForm({...toolboxForm, hazards: toolboxForm.hazards.filter(item => item !== h)});
                             }} className="w-4 h-4 text-orange-600" />
                             {h}
                           </label>
                        ))}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <label className="block text-sm font-bold text-slate-700 mb-2">火災危害</label>
                      <div className="flex flex-col gap-2">
                        {TOOLBOX_FIRE_HAZARDS.map(h => (
                           <label key={h} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                             <input type="checkbox" checked={toolboxForm.hazards.includes(h)} onChange={e => {
                               if (e.target.checked) setToolboxForm({...toolboxForm, hazards: [...toolboxForm.hazards, h]});
                               else setToolboxForm({...toolboxForm, hazards: toolboxForm.hazards.filter(item => item !== h)});
                             }} className="w-4 h-4 text-red-600" />
                             {h}
                           </label>
                        ))}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <label className="block text-sm font-bold text-slate-700 mb-2">感電危害</label>
                      <div className="flex flex-col gap-2">
                        {TOOLBOX_ELECTRICAL_HAZARDS.map(h => (
                           <label key={h} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                             <input type="checkbox" checked={toolboxForm.hazards.includes(h)} onChange={e => {
                               if (e.target.checked) setToolboxForm({...toolboxForm, hazards: [...toolboxForm.hazards, h]});
                               else setToolboxForm({...toolboxForm, hazards: toolboxForm.hazards.filter(item => item !== h)});
                             }} className="w-4 h-4 text-yellow-600" />
                             {h}
                           </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 個人防護具 */}
                  <div className="mb-4 bg-teal-50 p-3 rounded">
                    <label className="block text-sm font-bold text-teal-800 mb-2">個人防護具</label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {TOOLBOX_PPE.map(h => (
                         <label key={h} className="flex items-center gap-2 text-sm text-teal-800 cursor-pointer">
                           <input type="checkbox" checked={toolboxForm.safety_measures.includes(h)} onChange={e => {
                             if (e.target.checked) setToolboxForm({...toolboxForm, safety_measures: [...toolboxForm.safety_measures, h]});
                             else setToolboxForm({...toolboxForm, safety_measures: toolboxForm.safety_measures.filter(item => item !== h)});
                           }} className="w-4 h-4 text-teal-600" />
                           {h}
                         </label>
                      ))}
                    </div>
                  </div>

                  {/* 安全防護設施 */}
                  <div className="mb-4 bg-teal-50 p-3 rounded">
                    <label className="block text-sm font-bold text-teal-800 mb-2">安全防護設施</label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {TOOLBOX_SAFETY_FACILITIES.map(h => (
                         <label key={h} className="flex items-center gap-2 text-sm text-teal-800 cursor-pointer">
                           <input type="checkbox" checked={toolboxForm.safety_measures.includes(h)} onChange={e => {
                             if (e.target.checked) setToolboxForm({...toolboxForm, safety_measures: [...toolboxForm.safety_measures, h]});
                             else setToolboxForm({...toolboxForm, safety_measures: toolboxForm.safety_measures.filter(item => item !== h)});
                           }} className="w-4 h-4 text-teal-600" />
                           {h}
                         </label>
                      ))}
                    </div>
                  </div>

                  {/* 其他風險 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">其他存在風險說明</label>
                    <textarea value={toolboxForm.other_risks} onChange={e => setToolboxForm({...toolboxForm, other_risks: e.target.value})} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="若有上述未列出的風險，請於此說明..."></textarea>
                  </div>
                </div>`;
code = code.replace(formUIOld, formUINew);


fs.writeFileSync('frontend/src/pages/Onsite.tsx', code, 'utf8');
