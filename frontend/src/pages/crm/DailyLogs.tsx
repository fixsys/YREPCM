import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Sparkles, Send } from 'lucide-react';
import clsx from 'clsx';

export default function DailyLogs() {
  const [logContent, setLogContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/leads/utils/daily-logs', {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token}` }
      });
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // In a real app, you might save this log to a database.
  // For now, we simulate saving the log.

  const handleAutoGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await axios.get('http://localhost:3001/api/leads/utils/daily-log-auto', {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token}` }
      });
      // Append the auto text to existing content or replace it
      setLogContent(prev => prev ? prev + '\n\n' + res.data.autoText : res.data.autoText);
    } catch (err) {
      alert('自動彙整失敗');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await axios.post('http://localhost:3001/api/leads/utils/daily-log-save', { content: logContent }, {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token}` }
      });
      alert('日誌已成功送出！主管(Chairman/TopManagement) 將會收到系統通知。');
      setLogContent('');
      fetchHistory();
    } catch (err: any) {
      alert(err.response?.data?.error || '送出失敗');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <FileText size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">每日工作日誌</h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <label className="text-sm font-bold text-slate-700">今日日誌內容</label>
          <button 
            onClick={handleAutoGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-indigo-700 font-medium rounded-lg hover:from-blue-200 hover:to-indigo-200 transition-colors disabled:opacity-50"
          >
            <Sparkles size={18} className={clsx(isGenerating && "animate-spin")} />
            {isGenerating ? '彙整中...' : '自動化彙整今日開發紀錄'}
          </button>
        </div>
        
        <p className="text-xs text-slate-500 mb-4">點擊「自動化彙整今日開發紀錄」按鈕，系統將自動撈取您今日新增的潛在名單與互動紀錄，合成日誌摘要，減輕您的填表負擔！</p>
        
        <textarea 
          rows={15}
          value={logContent}
          onChange={e => setLogContent(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm leading-relaxed"
          placeholder="請輸入今日工作總結、開發心得或其他交辦事項..."
        />

        <div className="mt-6 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={isSaving || !logContent.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all disabled:opacity-50 active:scale-95"
          >
            <Send size={18} />
            {isSaving ? '送出中...' : '確認並送出日誌'}
          </button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">歷史工作日誌</h2>
          <div className="space-y-4">
            {history.map(log => (
              <div key={log.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                      {log.creator.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{log.creator.name}</h4>
                      <p className="text-xs text-slate-500">{log.creator.department?.name || '無部門'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {log.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
