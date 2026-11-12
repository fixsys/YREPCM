import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Box, ArrowRight, Image as ImageIcon, X } from 'lucide-react';
import { SOLAR_PRODUCTS } from './SolarModuleSim';

export default function SimulatorsDashboard() {
  const navigate = useNavigate();
  const [showRefModal, setShowRefModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">設計模擬器</h1>
          <p className="text-sm text-slate-500 mt-1">
            結合六種太陽能系統型態 3D 案場建模與 2D 太陽能模組排佈容量評估
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowRefModal(true)}
            className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <ImageIcon size={16} className="text-blue-600" /> 檢視「六大產品建模示意圖」
          </button>
          <button
            type="button"
            onClick={() => navigate('/simulators/solar')}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Zap size={16} /> 開啟 3D 太陽能排佈模擬器
          </button>
        </div>
      </div>

      {/* 六大太陽能系統產品卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {SOLAR_PRODUCTS.map(prod => (
          <div
            key={prod.id}
            onClick={() => navigate(`/simulators/solar?product=${prod.id}`)}
            className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-400 cursor-pointer transition-all flex flex-col justify-between overflow-hidden group"
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-extrabold text-white bg-gradient-to-br ${prod.badgeColor} shadow-sm`}
                  >
                    {prod.code}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                      {prod.name}
                    </h3>
                    <p className="text-xs text-slate-500">{prod.subtitle}</p>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Box size={18} />
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                <div>
                  <span className="font-bold text-slate-700">• 應用：</span>
                  {prod.application}
                </div>
                <div>
                  <span className="font-bold text-slate-700">• 特點：</span>
                  {prod.features}
                </div>
                <div>
                  <span className="font-bold text-slate-700">• 適用：</span>
                  {prod.suitableFor}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:bg-blue-50/60 transition-colors">
              <span>設定場域尺寸並啟動 3D 案場與模組排佈模擬</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>

      {/* 六大產品建模示意圖預覽卡片 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800">六種太陽能系統型態 — 建模示意圖總覽</h2>
          <span className="text-xs text-slate-500">點擊上方任一產品卡片即可進入 3D 模擬</span>
        </div>
        <img
          src="/six-products.png"
          alt="六種太陽能系統型態建模示意圖"
          className="w-full h-auto rounded-lg border border-slate-200 cursor-pointer"
          onClick={() => setShowRefModal(true)}
        />
      </div>

      {showRefModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowRefModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-base">六種太陽能系統型態 — 建模示意圖</h3>
              <button
                type="button"
                onClick={() => setShowRefModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <img
                src="/six-products.png"
                alt="六種太陽能系統型態建模示意圖"
                className="w-full h-auto rounded-xl border border-slate-200"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
