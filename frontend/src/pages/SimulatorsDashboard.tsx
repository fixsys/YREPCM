import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function SimulatorsDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">設計模擬器</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          onClick={() => navigate('/simulators/solar')}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md cursor-pointer transition-all hover:border-blue-300"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600">
            <Zap size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">1. 太陽能模組排佈模擬器</h3>
          <p className="text-slate-500 text-sm">業務部初步報價與設計部快速評估專用，提供場地排佈及容量估算。</p>
        </div>
      </div>
    </div>
  );
}
