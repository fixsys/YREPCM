import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Save, Send, Plus, Trash2, FileSpreadsheet, Building2, User, ClipboardList, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import { DEFAULT_BUDGET_TEMPLATE, DEFAULT_QUOTATION_TEMPLATE } from '../data/budgetTemplates';
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

const getInitialQuotationData = () => {
  return DEFAULT_QUOTATION_TEMPLATE.map(cat => ({
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
  const [activeTab, setActiveTab] = useState<'budget' | 'quotation' | 'analysis'>('budget');
  
  // Data states
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [budgetNotes, setBudgetNotes] = useState('');
  
  const [quotationData, setQuotationData] = useState<any[]>([]);
  const [quotationNotes, setQuotationNotes] = useState('');
  
  const [analysisData, setAnalysisData] = useState<any>({ developmentFeeUnitPrice: 1000 });
  const [priceMultiplier, setPriceMultiplier] = useState<number>(1);

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
        setAnalysisData(current.budgetBook?.analysis_data || { developmentFeeUnitPrice: 1000 });
        
        // Initialize Quotation Data
        const existingQuotation = current.budgetBook?.quotation?.items;
        if (existingQuotation && Array.isArray(existingQuotation) && existingQuotation.length > 0) {
          setQuotationData(existingQuotation);
        } else {
          setQuotationData(getInitialQuotationData());
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
    recalculateManagementFees(newData, setData, activeTab === 'budget');
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
    recalculateManagementFees(newData, setData, activeTab === 'budget');
  };

  const removeItem = (categoryId: string, itemId: string, data: any[], setData: any) => {
    const newData = data.map(cat => {
      if (cat.id === categoryId) {
        return { ...cat, items: cat.items.filter((it: any) => it.id !== itemId) };
      }
      return cat;
    });
    setData(newData);
    recalculateManagementFees(newData, setData, activeTab === 'budget');
  };
  
  // Auto calculate management fees based on Category 1 to 9 sums
  const recalculateManagementFees = (newData: any[], setData: any, isBudget: boolean) => {
    if (!isBudget) return;
    
    // Find the 10th category ("拾、管理費" or index 9)
    if (newData.length >= 10 && newData[9].category.includes('管理費')) {
      // Sum of category 0 to 8
      let sumSubtotal = 0;
      for(let i = 0; i < 9; i++) {
        if(newData[i] && newData[i].items) {
          sumSubtotal += newData[i].items.reduce((acc: number, it: any) => acc + ((it.quantity || 0) * (it.unit_price || 0)), 0);
        }
      }
      
      const updatedManagementCat = {
        ...newData[9],
        items: newData[9].items.map((it: any) => {
          let newPrice = it.unit_price;
          if (it.name.includes('工程保險0.8%')) newPrice = sumSubtotal * 0.008;
          else if (it.name.includes('工程保固1%')) newPrice = sumSubtotal * 0.01;
          else if (it.name.includes('內部管銷5%')) newPrice = sumSubtotal * 0.05;
          else if (it.name.includes('工程設計技術整合費1%')) newPrice = sumSubtotal * 0.01;
          else if (it.name.includes('雜項費用2%')) newPrice = sumSubtotal * 0.02;
          
          return { ...it, unit_price: newPrice, quantity: it.quantity || 1 };
        })
      };
      
      const finalData = [...newData];
      finalData[9] = updatedManagementCat;
      setData(finalData);
    }
  };

  const copyFromBudget = () => {
    if (!confirm('這將會依據預算書重新計算報價，確定要帶入嗎？')) return;
    const kWp = Number(ticket.installation_capacity) || 1;
    
    const newQuotation = quotationData.map((quotCat, index) => {
      const budgetCat = budgetData[index];
      let catSum = 0;
      if (budgetCat && budgetCat.items) {
        catSum = budgetCat.items.reduce((sum: number, it: any) => sum + ((it.quantity || 0) * (it.unit_price || 0)), 0);
      }
      
      return {
        ...quotCat,
        items: quotCat.items.map((it: any, idx: number) => {
          if (idx === 0) {
            return { ...it, unit: 'kWp', quantity: kWp, unit_price: Math.round((catSum / kWp) * priceMultiplier) };
          }
          return it;
        })
      };
    });
    setQuotationData(newQuotation);
  };

  const saveBudget = async () => {
    try {
      const totalAmount = budgetData.reduce((acc, cat) => acc + cat.items.reduce((sum: number, it: any) => sum + (it.quantity * it.unit_price || 0), 0), 0);
      await axios.post(`http://localhost:3001/api/budget/${id}/budget-book`, {
        items: budgetData,
        total_amount: totalAmount,
        notes: budgetNotes,
        analysis_data: analysisData
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('預算書與分析資料儲存成功');
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
  
  const saveAll = async () => {
    if(activeTab === 'budget' || activeTab === 'analysis') await saveBudget();
    else await saveQuotation();
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

  const getCostAnalysisSummary = () => {
    const kWp = Number(ticket.installation_capacity) || 1;
    const incomeA = quotationData.reduce((acc, cat) => acc + cat.items.reduce((sum: number, it: any) => sum + (it.quantity * it.unit_price || 0), 0), 0);
    const getCatTotal = (index: number) => {
      if(!budgetData[index]) return 0;
      return budgetData[index].items.reduce((sum: number, it: any) => sum + (it.quantity * it.unit_price || 0), 0);
    };
    const developmentFee = kWp * (analysisData.developmentFeeUnitPrice || 1000);
    const cat10Items = budgetData[9]?.items || [];
    const getMgtItem = (namePart: string) => {
      const it = cat10Items.find((i: any) => i.name.includes(namePart));
      return it ? (it.quantity || 0) * (it.unit_price || 0) : 0;
    };
    const miscFee = getMgtItem('雜項費用');
    const insuranceFee = getMgtItem('工程保險');
    let bSum = 0;
    for(let i=0; i<9; i++) bSum += getCatTotal(i);
    const operatingCostB = bSum + developmentFee + miscFee + insuranceFee;
    const grossProfitF = incomeA - operatingCostB;
    const designIntegrationFee = getMgtItem('技術整合');
    const warrantyFee = getMgtItem('工程保固');
    const internalOverhead = getMgtItem('內部管銷');
    const riskEvalFee = incomeA * 0.02;
    const operatingExpG = designIntegrationFee + warrantyFee + internalOverhead + riskEvalFee;
    const operatingNetProfitH = grossProfitF - operatingExpG;
    const incomeTaxI = incomeA * 0.02;
    const netProfitJ = operatingNetProfitH - incomeTaxI;
    const netProfitPercent = incomeA === 0 ? 0 : (netProfitJ / incomeA) * 100;
    
    return {
      kWp, incomeA, getCatTotal, developmentFee, miscFee, insuranceFee,
      operatingCostB, grossProfitF, designIntegrationFee, warrantyFee,
      internalOverhead, riskEvalFee, operatingExpG, operatingNetProfitH,
      incomeTaxI, netProfitJ, netProfitPercent
    };
  };

  const costAnalysis = getCostAnalysisSummary();

  // Render Cost Analysis logic
  const renderCostAnalysis = () => {
    const {
      kWp, incomeA, getCatTotal, developmentFee, miscFee, insuranceFee,
      operatingCostB, grossProfitF, designIntegrationFee, warrantyFee,
      internalOverhead, riskEvalFee, operatingExpG, operatingNetProfitH,
      incomeTaxI, netProfitJ
    } = costAnalysis;

    const percent = (val: number) => incomeA === 0 ? '0.00%' : `${((val / incomeA) * 100).toFixed(2)}%`;
    const format = (val: number) => `$ ${Math.round(val).toLocaleString()}`;
    const perKw = (val: number) => Math.round(val / kWp).toLocaleString();

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex-1">
            <h3 className="text-slate-500 font-medium mb-1">設定: 開發費每 kWp 單價</h3>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">$</span>
              <input 
                type="number" 
                value={analysisData.developmentFeeUnitPrice || ''} 
                onChange={(e) => setAnalysisData({...analysisData, developmentFeeUnitPrice: Number(e.target.value)})}
                className="font-bold text-xl text-slate-800 w-32 border-b-2 border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <TrendingUp className="text-blue-600" />
              專案成本分析表
            </h3>
          </div>
          
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-500 text-sm border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">分項</th>
                <th className="px-6 py-3 font-medium text-right">總金額</th>
                <th className="px-6 py-3 font-medium text-right">每 kWp 單價</th>
                <th className="px-6 py-3 font-medium text-right">佔比 %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold text-slate-800">(A) 預估收入 (報價總額)</td>
                <td className="px-6 py-4 text-right font-bold text-emerald-600">{format(incomeA)}</td>
                <td className="px-6 py-4 text-right text-emerald-600">{perKw(incomeA)}</td>
                <td className="px-6 py-4 text-right font-medium text-slate-600">100.00%</td>
              </tr>
              
              <tr className="bg-slate-50/50">
                <td className="px-6 py-3 font-semibold text-slate-700" colSpan={4}>營業成本明細</td>
              </tr>
              {[
                { label: '鋼構工程', v: getCatTotal(0) },
                { label: '浪板工程', v: getCatTotal(1) },
                { label: '鋁擠支架及模組鋪設工程', v: getCatTotal(2) },
                { label: '土建工程', v: getCatTotal(3) },
                { label: '設備類', v: getCatTotal(4) },
                { label: '機電盤體工程', v: getCatTotal(5) },
                { label: '機電配管線工程', v: getCatTotal(6) },
                { label: '簽證跑照費', v: getCatTotal(7) },
                { label: '其他假設工程', v: getCatTotal(8) },
                { label: '開發費', v: developmentFee },
                { label: '雜項費用', v: miscFee },
                { label: '工程保險', v: insuranceFee },
              ].map(item => (
                <tr key={item.label} className="hover:bg-slate-50 text-sm text-slate-600">
                  <td className="px-6 py-2 pl-12 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                    {item.label}
                  </td>
                  <td className="px-6 py-2 text-right">{format(item.v)}</td>
                  <td className="px-6 py-2 text-right text-slate-400">{perKw(item.v)}</td>
                  <td className="px-6 py-2 text-right text-slate-400">{percent(item.v)}</td>
                </tr>
              ))}
              
              <tr className="bg-orange-50/50">
                <td className="px-6 py-4 font-bold text-slate-800">(B) 營業成本總計</td>
                <td className="px-6 py-4 text-right font-bold text-orange-600">{format(operatingCostB)}</td>
                <td className="px-6 py-4 text-right text-orange-600">{perKw(operatingCostB)}</td>
                <td className="px-6 py-4 text-right font-medium text-slate-600">{percent(operatingCostB)}</td>
              </tr>

              <tr className="bg-blue-50/50">
                <td className="px-6 py-4 font-bold text-blue-900">(F) 營業毛利 = (A) - (B)</td>
                <td className="px-6 py-4 text-right font-bold text-blue-700">{format(grossProfitF)}</td>
                <td className="px-6 py-4 text-right text-blue-700">{perKw(grossProfitF)}</td>
                <td className="px-6 py-4 text-right font-bold text-blue-700">{percent(grossProfitF)}</td>
              </tr>

              <tr className="bg-slate-50/50">
                <td className="px-6 py-3 font-semibold text-slate-700" colSpan={4}>營業費用明細</td>
              </tr>
              {[
                { label: '工程設計技術整合費', v: designIntegrationFee },
                { label: '工程保固', v: warrantyFee },
                { label: '內部管銷', v: internalOverhead },
                { label: '風險評估費 (預估 2%)', v: riskEvalFee },
              ].map(item => (
                <tr key={item.label} className="hover:bg-slate-50 text-sm text-slate-600">
                  <td className="px-6 py-2 pl-12 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                    {item.label}
                  </td>
                  <td className="px-6 py-2 text-right">{format(item.v)}</td>
                  <td className="px-6 py-2 text-right text-slate-400">{perKw(item.v)}</td>
                  <td className="px-6 py-2 text-right text-slate-400">{percent(item.v)}</td>
                </tr>
              ))}

              <tr className="bg-orange-50/50">
                <td className="px-6 py-4 font-bold text-slate-800">(G) 營業費用總計</td>
                <td className="px-6 py-4 text-right font-bold text-orange-600">{format(operatingExpG)}</td>
                <td className="px-6 py-4 text-right text-orange-600">{perKw(operatingExpG)}</td>
                <td className="px-6 py-4 text-right font-medium text-slate-600">{percent(operatingExpG)}</td>
              </tr>

              <tr className="bg-blue-50/50 border-t-2 border-blue-100">
                <td className="px-6 py-4 font-bold text-blue-900">(H) 營業淨利 = (F) - (G)</td>
                <td className="px-6 py-4 text-right font-bold text-blue-700">{format(operatingNetProfitH)}</td>
                <td className="px-6 py-4 text-right text-blue-700">{perKw(operatingNetProfitH)}</td>
                <td className="px-6 py-4 text-right font-bold text-blue-700">{percent(operatingNetProfitH)}</td>
              </tr>
              
              <tr className="hover:bg-slate-50 text-sm text-slate-600">
                <td className="px-6 py-4 font-bold text-slate-800">(I) 營所稅 (預估 2%)</td>
                <td className="px-6 py-4 text-right text-slate-700">{format(incomeTaxI)}</td>
                <td className="px-6 py-4 text-right text-slate-400">{perKw(incomeTaxI)}</td>
                <td className="px-6 py-4 text-right text-slate-400">{percent(incomeTaxI)}</td>
              </tr>

              <tr className="bg-indigo-50 border-t-2 border-indigo-200">
                <td className="px-6 py-5 font-black text-indigo-900 text-lg">(J) 稅後淨利 = (H) - (I)</td>
                <td className="px-6 py-5 text-right font-black text-indigo-700 text-lg">{format(netProfitJ)}</td>
                <td className="px-6 py-5 text-right font-bold text-indigo-700">{perKw(netProfitJ)}</td>
                <td className="px-6 py-5 text-right font-black text-indigo-700 text-lg">{percent(netProfitJ)}</td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    );
  };

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
          <button onClick={saveAll} className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium shadow-sm">
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
              <button
                onClick={() => setActiveTab('analysis')}
                className={clsx(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
                  activeTab === 'analysis' ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                )}
              >
                <TrendingUp size={18} />
                成本分析
              </button>
            </div>

            <div className="p-6 flex-1 overflow-auto">
              {activeTab === 'analysis' ? (
                renderCostAnalysis()
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <h2 className="text-xl font-bold text-slate-800">
                        {activeTab === 'budget' ? '預算明細編列' : '報價明細編列'}
                      </h2>
                      {activeTab === 'quotation' && (
                        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm ml-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-600">調整單價倍率:</span>
                            <input 
                              type="number" 
                              step="0.1"
                              value={priceMultiplier} 
                              onChange={e => setPriceMultiplier(Number(e.target.value))}
                              className="w-16 border border-slate-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                          <div className="h-4 w-px bg-slate-300"></div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-600">稅後淨利:</span>
                            <span className={clsx("text-sm font-bold", costAnalysis.netProfitPercent < 5 ? "text-red-500" : "text-emerald-600")}>
                              {costAnalysis.netProfitPercent.toFixed(2)}%
                            </span>
                            {costAnalysis.netProfitPercent < 5 && (
                              <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-full">低於 5% 警告</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
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

                  <div className="space-y-8 animate-in fade-in">
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
                                cat.items.map((item: any, index: number) => {
                                  const isFirst = index === 0;
                                  const total = isFirst || activeTab === 'budget' ? (item.quantity || 0) * (item.unit_price || 0) : 0;
                                  
                                  return (
                                    <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                                      <td className="px-4 py-2">
                                        <input type="text" value={item.name} onChange={e => updateItem(cat.id, item.id, 'name', e.target.value, currentData, setCurrentData)} className="w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1" placeholder="輸入項目名稱" />
                                      </td>
                                      {activeTab === 'quotation' ? (
                                        isFirst && (
                                          <>
                                            <td className="px-4 py-2 align-middle" rowSpan={cat.items.length}>
                                              <input type="text" value={item.unit} onChange={e => updateItem(cat.id, item.id, 'unit', e.target.value, currentData, setCurrentData)} className="w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1" placeholder="式/M/kg" />
                                            </td>
                                            <td className="px-4 py-2 align-middle" rowSpan={cat.items.length}>
                                              <input type="number" value={item.quantity || ''} onChange={e => updateItem(cat.id, item.id, 'quantity', parseFloat(e.target.value) || 0, currentData, setCurrentData)} className="w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 text-right" placeholder="0" />
                                            </td>
                                            <td className="px-4 py-2 align-middle" rowSpan={cat.items.length}>
                                              <input type="number" value={item.unit_price || ''} onChange={e => updateItem(cat.id, item.id, 'unit_price', parseFloat(e.target.value) || 0, currentData, setCurrentData)} className="w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 text-right" placeholder="0" />
                                            </td>
                                            <td className="px-4 py-2 align-middle font-medium text-slate-700 text-right" rowSpan={cat.items.length}>
                                              ${total.toLocaleString()}
                                            </td>
                                          </>
                                        )
                                      ) : (
                                        <>
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
                                        </>
                                      )}
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetDetail;
