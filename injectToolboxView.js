const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Onsite.tsx', 'utf8');

const viewUIOld = `                  <div>
                    <h3 className="text-xl font-bold mb-3 border-l-4 border-indigo-600 pl-3">會議與宣導內容</h3>
                    <p className="whitespace-pre-wrap leading-relaxed text-lg bg-slate-50 p-4 rounded-xl border border-slate-200">{viewingRecord.data.work_content}</p>
                  </div>`;
const viewUINew = `                  <div>
                    <h3 className="text-xl font-bold mb-3 border-l-4 border-indigo-600 pl-3">會議與宣導內容</h3>
                    <p className="whitespace-pre-wrap leading-relaxed text-lg bg-slate-50 p-4 rounded-xl border border-slate-200">{viewingRecord.data.work_content}</p>
                  </div>

                  {/* 新增的表單區塊 */}
                  <div className="space-y-6 border-t border-slate-200 pt-6">
                    <div>
                      <h4 className="font-bold text-lg mb-2">施工區域</h4>
                      <div className="bg-slate-50 p-3 rounded border border-slate-200">{viewingRecord.data.work_area || '未填寫'}</div>
                    </div>
                    
                    <div>
                      <h4 className="font-bold text-lg mb-2">工作內容</h4>
                      <div className="bg-slate-50 p-3 rounded border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {safeParseJSON(viewingRecord.data.work_items, []).length > 0 ? (
                          safeParseJSON(viewingRecord.data.work_items, []).map((item: any, i: number) => (
                            <div key={i}>
                              <span className="font-bold mr-2">☑ {item.name}</span>
                              <span className="text-sm text-slate-600">{item.note ? \`(\${item.note})\` : ''}</span>
                            </div>
                          ))
                        ) : '未填寫'}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-lg mb-2 text-orange-800">安全宣導內容 (危害)</h4>
                      <div className="bg-orange-50 p-3 rounded border border-orange-200 flex flex-wrap gap-2">
                        {safeParseJSON(viewingRecord.data.hazards, []).length > 0 ? (
                          safeParseJSON(viewingRecord.data.hazards, []).map((h: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-white border border-orange-200 rounded text-sm text-orange-800">{h}</span>
                          ))
                        ) : '無'}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-lg mb-2 text-teal-800">現場安全衛生措施 (防護具與設施)</h4>
                      <div className="bg-teal-50 p-3 rounded border border-teal-200 flex flex-wrap gap-2">
                        {safeParseJSON(viewingRecord.data.safety_measures, []).length > 0 ? (
                          safeParseJSON(viewingRecord.data.safety_measures, []).map((s: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-white border border-teal-200 rounded text-sm text-teal-800">{s}</span>
                          ))
                        ) : '無'}
                      </div>
                    </div>

                    {viewingRecord.data.other_risks && (
                      <div>
                        <h4 className="font-bold text-lg mb-2">其他存在風險說明</h4>
                        <div className="bg-slate-50 p-3 rounded border border-slate-200 text-red-600">{viewingRecord.data.other_risks}</div>
                      </div>
                    )}
                  </div>`;
code = code.replace(viewUIOld, viewUINew);
fs.writeFileSync('frontend/src/pages/Onsite.tsx', code, 'utf8');
