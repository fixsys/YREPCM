const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Onsite.tsx', 'utf8');

// 1. Add Import
const importOld = `import { useNavigate, useLocation } from 'react-router-dom';`;
const importNew = `import { useNavigate, useLocation } from 'react-router-dom';\nimport SignatureCanvas from 'react-signature-canvas';`;
code = code.replace(importOld, importNew);

// 2. Add signature modal state
const stateOld = `const [toolboxPreviewUrls, setToolboxPreviewUrls] = useState<string[]>([]);`;
const stateNew = `const [toolboxPreviewUrls, setToolboxPreviewUrls] = useState<string[]>([]);
  const [signatureModal, setSignatureModal] = useState<{ isOpen: boolean; index: number }>({ isOpen: false, index: 0 });
  const sigCanvas = useRef<any>(null);`;
code = code.replace(stateOld, stateNew);

// 3. Add signatures to form state
const formStateOld = `other_risks: ''\n  });`;
const formStateNew = `other_risks: '',\n    signatures: [] as string[]\n  });`;
code = code.replace(formStateOld, formStateNew);

const formAddOld = `other_risks: '' });`;
const formAddNew = `other_risks: '', signatures: [] });`;
code = code.replace(formAddOld, formAddNew);

const formEditOld = `other_risks: t.other_risks || ''\n    });`;
const formEditNew = `other_risks: t.other_risks || '',\n      signatures: safeParseJSON(t.signatures, [])\n    });`;
code = code.replace(formEditOld, formEditNew);

// 4. Render Signature UI in Toolbox Form Modal
const formUIOld = `                  {/* 其他風險 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">其他存在風險說明</label>
                    <textarea value={toolboxForm.other_risks} onChange={e => setToolboxForm({...toolboxForm, other_risks: e.target.value})} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="若有上述未列出的風險，請於此說明..."></textarea>
                  </div>
                </div>`;
const formUINew = `                  {/* 其他風險 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">其他存在風險說明</label>
                    <textarea value={toolboxForm.other_risks} onChange={e => setToolboxForm({...toolboxForm, other_risks: e.target.value})} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="若有上述未列出的風險，請於此說明..."></textarea>
                  </div>

                  {/* 現場施工人員簽名 */}
                  <div className="pt-4 border-t border-slate-200">
                    <label className="block text-sm font-bold text-slate-800 mb-2">現場施工人員簽名 (對應上工人數: {toolboxForm.worker_count || 0} 人)</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Array.from({ length: parseInt(toolboxForm.worker_count || '0') }).map((_, i) => (
                        <div key={i} className="border border-slate-300 rounded-lg h-24 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden group">
                          {toolboxForm.signatures[i] ? (
                            <>
                              <img src={toolboxForm.signatures[i]} alt="簽名" className="w-full h-full object-contain bg-white" />
                              <button type="button" onClick={() => setSignatureModal({ isOpen: true, index: i })} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-sm">重簽</button>
                            </>
                          ) : (
                            <button type="button" onClick={() => setSignatureModal({ isOpen: true, index: i })} className="text-indigo-600 font-bold hover:text-indigo-800 w-full h-full">點擊簽名 {i + 1}</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>`;
code = code.replace(formUIOld, formUINew);

// 5. Add Signature Modal Component
const modalAnchor = `{isToolboxModalOpen && (`;
const signatureModalJSX = `
      {signatureModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-indigo-50">
              <h3 className="font-bold text-slate-800">人員簽名 ({signatureModal.index + 1})</h3>
              <button type="button" onClick={() => setSignatureModal({ isOpen: false, index: 0 })} className="text-slate-500 hover:text-slate-700"><X size={20} /></button>
            </div>
            <div className="p-4 bg-slate-100">
              <div className="bg-white border-2 border-dashed border-slate-300 rounded-lg cursor-crosshair">
                <SignatureCanvas 
                  ref={sigCanvas}
                  canvasProps={{ className: 'w-full h-48 rounded-lg' }}
                  backgroundColor="white"
                />
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-between gap-3">
              <button type="button" onClick={() => sigCanvas.current?.clear()} className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100 font-bold">清除重簽</button>
              <div className="flex gap-3">
                <button type="button" onClick={() => setSignatureModal({ isOpen: false, index: 0 })} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold">取消</button>
                <button type="button" onClick={() => {
                  if (sigCanvas.current?.isEmpty()) return alert('請先簽名！');
                  const newSignatures = [...toolboxForm.signatures];
                  newSignatures[signatureModal.index] = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
                  setToolboxForm({...toolboxForm, signatures: newSignatures});
                  setSignatureModal({ isOpen: false, index: 0 });
                }} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-md">確認儲存</button>
              </div>
            </div>
          </div>
        </div>
      )}
`;
code = code.replace(modalAnchor, signatureModalJSX + '\n      ' + modalAnchor);

// 6. View Signatures UI in Report
const viewReportOld = `                    {viewingRecord.data.other_risks && (
                      <div>
                        <h4 className="font-bold text-lg mb-2">其他存在風險說明</h4>
                        <div className="bg-slate-50 p-3 rounded border border-slate-200 text-red-600">{viewingRecord.data.other_risks}</div>
                      </div>
                    )}
                  </div>`;
const viewReportNew = `                    {viewingRecord.data.other_risks && (
                      <div>
                        <h4 className="font-bold text-lg mb-2">其他存在風險說明</h4>
                        <div className="bg-slate-50 p-3 rounded border border-slate-200 text-red-600">{viewingRecord.data.other_risks}</div>
                      </div>
                    )}

                    {viewingRecord.data.signatures && safeParseJSON(viewingRecord.data.signatures, []).length > 0 && (
                      <div>
                        <h4 className="font-bold text-lg mb-2">現場施工人員簽名</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {safeParseJSON(viewingRecord.data.signatures, []).map((sig: string, i: number) => (
                            sig ? <div key={i} className="border border-slate-200 rounded p-2 bg-white flex justify-center items-center h-20 shadow-sm"><img src={sig} alt="簽名" className="max-h-full object-contain" /></div> : null
                          ))}
                        </div>
                      </div>
                    )}
                  </div>`;
code = code.replace(viewReportOld, viewReportNew);

fs.writeFileSync('frontend/src/pages/Onsite.tsx', code, 'utf8');
