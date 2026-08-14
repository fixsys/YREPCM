import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Save, Send, Plus, Trash2, FileSpreadsheet, Building2, User, ClipboardList } from 'lucide-react';
import clsx from 'clsx';
import { DEFAULT_BUDGET_TEMPLATE } from '../data/budgetTemplates';
import RequirementForm from './crm/RequirementForm';

const getInitialBudgetData = () => {
  return DEFAULT_BUDGET_TEMPLATE.map(cat => ({
    id: crypto.randomUUID(),
    category: cat.category,
    items: cat.items.map(item => ({
      id: crypto.randomUUID(),
      ...item
    }))
  }));
};

const BudgetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [ticket, setTicket] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'budget' | 'quotation'>('budget');
  
  // Data states
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [budgetNotes, setBudgetNotes] = useState('');
  
  const [quotationData, setQuotationData] = useState<any[]>([]);
  const [quotationNotes, setQuotationNotes] = useState('');

  const fetchTicket = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/budget', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const current = res.data.find((t: any) => t.id === id);
      if (current) {
        setTicket(current);
        
        // Initialize Budget Data
        const existingBudget = current.budgetBook?.items;
        if (existingBudget && Array.isArray(existingBudget) && existingBudget.length > 0) {
          setBudgetData(existingBudget);
        } else {
          setBudgetData(getInitialBudgetData());
        }
        setBudgetNotes(current.budgetBook?.notes || '');
        
        // Initialize Quotation Data
        const existingQuotation = current.budgetBook?.quotation?.items;
        if (existingQuotation && Array.isArray(existingQuotation) && existingQuotation.length > 0) {
          setQuotationData(existingQuotation);
        } else {
          // Default quotation data is a copy of budget categories if they exist
          setQuotationData(getInitialBudgetData());
        }
        setQuotationNotes(current.budgetBook?.quotation?.notes || '');
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (token) fetchTicket();
  }, [id, token]);

  const addCategory = (data: any[], setData: any) => {
        const catName = window.prompt('請輸入新類別名稱');
    if (catName) {
      setData([...data, { id: crypto.randomUUID(), category: catName, items: [] }]);
    }
  };

  const addItem = (categoryId: string, data: any[], setData: any) => {
    const newData = data.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: [...cat.items, { id: crypto.randomUUID(), name: '', unit: '', quantity: 0, unit_price: 0 }]
        };
      }
      return cat;
    });
    setData(newData);
  };

  const updateItem = (categoryId: string, itemId: string, field: string, value: any, data: any[], setData: any) => {
    const newData = data.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: cat.items.map((it: any) => {
            if (it.id === itemId) {
              return { ...it, [field]: value };
            }
            return it;
          })
        };
      }
      return cat;
    });
    setData(newData);
  };

  const removeItem = (categoryId: string, itemId: string, data: any[], setData: any) => {
    const newData = data.map(cat => {
      if (cat.id === categoryId) {
        return { ...cat, items: cat.items.filter((it: any) => it.id !== itemId) };
      }
      return cat;
    });
    setData(newData);
  };
  
  const copyFromBudget = () => {
    if (!confirm('這將會覆蓋當前報價單資料，確定要從預算書帶入嗎？')) return;
    setQuotationData(JSON.parse(JSON.stringify(budgetData)));
  };

  const saveBudget = async () => {
    try {
      const totalAmount = budgetData.reduce((acc, cat) => acc + cat.items.reduce((sum: number, it: any) => sum + (it.quantity * it.unit_price || 0), 0), 0);
      await axios.post(`http://localhost:3001/api/budget/${id}/budget-book`, {
        items: budgetData,
        total_amount: totalAmount,
        notes: budgetNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('預算書儲存成功');
      fetchTicket();
    } catch (error) {
      alert('儲存失敗');
    }
  };

  const saveQuotation = async () => {
    try {
      const totalPrice = quotationData.reduce((acc, cat) => acc + cat.items.reduce((sum: number, it: any) => sum + (it.quantity * it.unit_price || 0), 0), 0);
      await axios.post(`http://localhost:3001/api/budget/${id}/quotation`, {
        items: quotationData,
        total_price: totalPrice,
        notes: quotationNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('報價單儲存成功');
      fetchTicket();
    } catch (error) {
      alert('儲存失敗');
    }
  };

  const completeTicket = async () => {
    if (!confirm('完成後將回拋給業務端，確定要完成嗎？')) return;
    try {
      // Auto save both before completing
      await saveBudget();
      await saveQuotation();
      await axios.post(`http://localhost:3001/api/budget/${id}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('已成功回拋給業務端');
      navigate('/budget');
    } catch (error) {
      alert('回拋失敗');
    }
  };

  if (!ticket) return <div className="p-8 text-center text-slate-500">載入中...</div>;

  const currentData = activeTab === 'budget' ? budgetData : quotationData;
  const setCurrentData = activeTab === 'budget' ? setBudgetData : setQuotationData;
  const currentTotal = currentData.reduce((acc, cat) => acc + cat.items.reduce((sum: number, it: any) => sum + (it.quantity * it.unit_price || 0), 0), 0);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/budget')} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800">
            預算分析作業: {ticket.lead?.company || ticket.lead?.name}
          </h1>
        </div>
        <div className="flex gap-3">
          <button onClick={activeTab === 'budget' ? saveBudget : saveQuotation} className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium shadow-sm">
            <Save size={18} /> 儲存目前草稿
          </button>
          {ticket.budget_status !== '已完成' && (
            <button onClick={completeTicket} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2 rounded-lg font-medium shadow-md">
              <Send size={18} /> 完成報價並回拋
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Side: Ticket Info */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 border-b pb-3 mb-4 flex items-center gap-2">
              <Building2 size={18} className="text-blue-600" /> 客戶基本資料
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">業務負責人</span>
                <span className="font-medium">{ticket.lead?.assignee?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">承攬形式</span>
                <span className="font-medium">{ticket.contract_type || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">設置容量</span>
                <span className="font-medium">{ticket.installation_capacity} kW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">模組型號</span>
                <span className="font-medium">{ticket.module_model || '-'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 border-b pb-3 mb-4 flex items-center gap-2">
              <ClipboardList size={18} className="text-purple-600" /> 客戶需求表內容
            </h3>
            <div className="max-h-[600px] overflow-y-auto pr-2 -mr-2">
              <RequirementForm initialData={ticket} mode="view" />
            </div>
          </div>
        </div>

        {/* Right Side: Editors */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-2">
              <button
                onClick={() => setActiveTab('budget')}
                className={clsx(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
                  activeTab === 'budget' ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                )}
              >
                <FileSpreadsheet size={18} />
                工程預算書
              </button>
              <button
                onClick={() => setActiveTab('quotation')}
                className={clsx(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
                  activeTab === 'quotation' ? "bg-white text-purple-600 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                )}
              >
                <FileSpreadsheet size={18} />
                客戶報價單
              </button>
            </div>

            <div className="p-6 flex-1 overflow-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">
                  {activeTab === 'budget' ? '預算明細編列' : '報價明細編列'}
                </h2>
                <div className="flex gap-2">
                  {activeTab === 'quotation' && (
                    <button onClick={copyFromBudget} className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg">
                      從預算書帶入
                    </button>
                  )}
                  <button onClick={() => addCategory(currentData, setCurrentData)} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg">
                    <Plus size={16} /> 新增分類
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                {currentData.map((cat: any) => (
                  <div key={cat.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 px-4 py-3 flex justify-between items-center border-b border-slate-200">
                      <h3 className="font-bold text-slate-800">{cat.category}</h3>
                      <button onClick={() => addItem(cat.id, currentData, setCurrentData)} className="text-sm font-medium text-blue-600 flex items-center gap-1">
                        <Plus size={14} /> 新增項目
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="px-4 py-2 w-1/3">內容及說明</th>
                            <th className="px-4 py-2 w-24">單位</th>
                            <th className="px-4 py-2 w-28">數量</th>
                            <th className="px-4 py-2 w-32">單價</th>
                            <th className="px-4 py-2 w-32">總價</th>
                            <th className="px-4 py-2 w-16 text-center">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cat.items.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-6 text-center text-slate-400">尚未新增項目</td>
                            </tr>
                          ) : (
                            cat.items.map((item: any) => {
                              const total = (item.quantity || 0) * (item.unit_price || 0);
                              return (
                                <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                                  <td className="px-4 py-2">
                                    <input type="text" value={item.name} onChange={e => updateItem(cat.id, item.id, 'name', e.target.value, currentData, setCurrentData)} className="w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1" placeholder="輸入項目名稱" />
                                  </td>
                                  <td className="px-4 py-2">
                                    <input type="text" value={item.unit} onChange={e => updateItem(cat.id, item.id, 'unit', e.target.value, currentData, setCurrentData)} className="w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1" placeholder="式/M/kg" />
                                  </td>
                                  <td className="px-4 py-2">
                                    <input type="number" value={item.quantity || ''} onChange={e => updateItem(cat.id, item.id, 'quantity', parseFloat(e.target.value) || 0, currentData, setCurrentData)} className="w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 text-right" placeholder="0" />
                                  </td>
                                  <td className="px-4 py-2">
                                    <input type="number" value={item.unit_price || ''} onChange={e => updateItem(cat.id, item.id, 'unit_price', parseFloat(e.target.value) || 0, currentData, setCurrentData)} className="w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 text-right" placeholder="0" />
                                  </td>
                                  <td className="px-4 py-2 font-medium text-slate-700 text-right">
                                    ${total.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    <button onClick={() => removeItem(cat.id, item.id, currentData, setCurrentData)} className="text-red-400 hover:text-red-600 p-1">
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                          <tr className="border-t border-slate-200 bg-slate-50">
                            <td colSpan={4} className="px-4 py-3 text-right font-bold text-slate-600">小計</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800">
                              ${cat.items.reduce((sum: number, it: any) => sum + ((it.quantity || 0) * (it.unit_price || 0)), 0).toLocaleString()}
                            </td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <div className="bg-slate-100 rounded-xl p-6 w-full max-w-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-500 font-medium">總計 (未稅)</span>
                    <span className="text-2xl font-bold text-slate-800">${currentTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                    <span className="text-slate-500 text-sm font-medium">每 kWp 單價</span>
                    <span className="text-lg font-bold text-blue-600">
                      {ticket.installation_capacity && Number(ticket.installation_capacity) > 0 
                        ? `$${Math.round(currentTotal / Number(ticket.installation_capacity)).toLocaleString()} / kWp` 
                        : '請先至需求表填寫容量'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetDetail;
