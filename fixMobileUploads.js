const fs = require('fs');

let code = fs.readFileSync('frontend/src/pages/Onsite.tsx', 'utf8');

// --- 1. Fix Toolbox Photos ---
const toolboxOld = `                      if (e.target.files) {
                        setToolboxPhotos(Array.from(e.target.files));
                      }`;
const toolboxNew = `                      if (e.target.files) {
                        setToolboxPhotos(prev => {
                           const newFiles = [...prev, ...Array.from(e.target.files!)];
                           return newFiles;
                        });
                      }`;
code = code.replace(toolboxOld, toolboxNew);

const toolboxPreviewOld = `{toolboxPreviewUrls.map((url, i) => (
                        <img key={i} src={url} alt="preview" className="w-16 h-16 object-cover rounded border border-slate-200" />
                      ))}`;
const toolboxPreviewNew = `{toolboxPreviewUrls.map((url, i) => (
                        <div key={i} className="relative inline-block shrink-0">
                          <img src={url} alt="preview" className="w-16 h-16 object-cover rounded border border-slate-200" />
                          <button type="button" onClick={() => setToolboxPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow z-10 hover:bg-red-600">×</button>
                        </div>
                      ))}`;
code = code.replace(toolboxPreviewOld, toolboxPreviewNew);

// --- 2. Fix Labor Photos (Close) ---
const closeOld = `                        if (e.target.files) {
                          const files = Array.from(e.target.files);
                          if (files.length > 4) { alert('近照最多只能上傳 4 張'); setLaborPhotosClose(files.slice(0, 4)); }
                          else setLaborPhotosClose(files);
                        }`;
const closeNew = `                        if (e.target.files) {
                          setLaborPhotosClose(prev => {
                            const newFiles = [...prev, ...Array.from(e.target.files!)];
                            if (newFiles.length > 4) { alert('近照最多只能上傳 4 張'); return newFiles.slice(0, 4); }
                            return newFiles;
                          });
                        }`;
code = code.replace(closeOld, closeNew);

const closeUIRenderOld = `{laborPhotosClose.map((f, i) => <div key={i} className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600 truncate max-w-[150px]">{f.name}</div>)}`;
const closeUIRenderNew = `{laborPhotosClose.map((f, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 rounded text-slate-600">
                            <span className="truncate max-w-[120px]">{f.name}</span>
                            <button type="button" onClick={() => setLaborPhotosClose(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 font-bold hover:text-red-700 ml-1">×</button>
                          </div>
                        ))}`;
code = code.replace(closeUIRenderOld, closeUIRenderNew);

// --- 3. Fix Labor Photos (Mid) ---
const midOld = `                        if (e.target.files) {
                          const files = Array.from(e.target.files);
                          if (files.length > 4) { alert('中距離照最多只能上傳 4 張'); setLaborPhotosMid(files.slice(0, 4)); }
                          else setLaborPhotosMid(files);
                        }`;
const midNew = `                        if (e.target.files) {
                          setLaborPhotosMid(prev => {
                            const newFiles = [...prev, ...Array.from(e.target.files!)];
                            if (newFiles.length > 4) { alert('中距離照最多只能上傳 4 張'); return newFiles.slice(0, 4); }
                            return newFiles;
                          });
                        }`;
code = code.replace(midOld, midNew);

const midUIRenderOld = `{laborPhotosMid.map((f, i) => <div key={i} className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600 truncate max-w-[150px]">{f.name}</div>)}`;
const midUIRenderNew = `{laborPhotosMid.map((f, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 rounded text-slate-600">
                            <span className="truncate max-w-[120px]">{f.name}</span>
                            <button type="button" onClick={() => setLaborPhotosMid(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 font-bold hover:text-red-700 ml-1">×</button>
                          </div>
                        ))}`;
code = code.replace(midUIRenderOld, midUIRenderNew);

// --- 4. Fix Labor Photos (Far) ---
const farOld = `                        if (e.target.files) {
                          const files = Array.from(e.target.files);
                          if (files.length > 4) { alert('遠距照最多只能上傳 4 張'); setLaborPhotosFar(files.slice(0, 4)); }
                          else setLaborPhotosFar(files);
                        }`;
const farNew = `                        if (e.target.files) {
                          setLaborPhotosFar(prev => {
                            const newFiles = [...prev, ...Array.from(e.target.files!)];
                            if (newFiles.length > 4) { alert('遠距照最多只能上傳 4 張'); return newFiles.slice(0, 4); }
                            return newFiles;
                          });
                        }`;
code = code.replace(farOld, farNew);

const farUIRenderOld = `{laborPhotosFar.map((f, i) => <div key={i} className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600 truncate max-w-[150px]">{f.name}</div>)}`;
const farUIRenderNew = `{laborPhotosFar.map((f, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 rounded text-slate-600">
                            <span className="truncate max-w-[120px]">{f.name}</span>
                            <button type="button" onClick={() => setLaborPhotosFar(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 font-bold hover:text-red-700 ml-1">×</button>
                          </div>
                        ))}`;
code = code.replace(farUIRenderOld, farUIRenderNew);

fs.writeFileSync('frontend/src/pages/Onsite.tsx', code, 'utf8');
