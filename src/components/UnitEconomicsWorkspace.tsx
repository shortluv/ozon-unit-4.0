import React, { useState } from 'react';
import {
  Table2,
  Calculator,
  Grid3X3,
  Lightbulb,
  Download,
  Plus,
  RefreshCw,
  Info,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { ProductUnitData } from '../types/unitEconomics';
import { ProductTable } from './ProductTable';
import { SingleCalculator } from './SingleCalculator';
import { SensitivityMatrix } from './SensitivityMatrix';
import { EconomicsAdvisor } from './EconomicsAdvisor';
import { MetricsOverview } from './MetricsOverview';

export type UnitEcoSubTab = 'table' | 'single' | 'matrix' | 'advisor';

interface UnitEconomicsWorkspaceProps {
  products: ProductUnitData[];
  onUpdateProduct: (product: ProductUnitData) => void;
  onDeleteProduct: (id: string) => void;
  onDuplicateProduct: (product: ProductUnitData) => void;
  onAddProduct: (product: ProductUnitData) => void;
  selectedProduct: ProductUnitData | null;
  setSelectedProduct: (product: ProductUnitData | null) => void;
  onApplyPresetToAll: (presetId: string) => void;
  onUpdateWarehouseAll: (warehouseName: string, warehouseType: 'FBO' | 'FBS') => void;
  onExport: () => void;
  onOpenOzonSync: () => void;
  onOpenNewProduct: () => void;
  initialSubTab?: UnitEcoSubTab;
}

export const UnitEconomicsWorkspace: React.FC<UnitEconomicsWorkspaceProps> = ({
  products,
  onUpdateProduct,
  onDeleteProduct,
  onDuplicateProduct,
  onAddProduct,
  selectedProduct,
  setSelectedProduct,
  onApplyPresetToAll,
  onUpdateWarehouseAll,
  onExport,
  onOpenOzonSync,
  onOpenNewProduct,
  initialSubTab = 'table',
}) => {
  const [subTab, setSubTab] = useState<UnitEcoSubTab>(initialSubTab);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const handleSelectForDeepDive = (prod: ProductUnitData) => {
    setSelectedProduct(prod);
    setSubTab('single');
  };

  return (
    <div className="space-y-6">
      {/* 1. Верхняя полоса переключения подвкладок Юнит-экономики */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setSubTab('table')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              subTab === 'table'
                ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Таблица товаров ({products.length})</span>
          </button>

          <button
            onClick={() => setSubTab('single')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              subTab === 'single'
                ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Калькулятор 1 SKU</span>
            {selectedProduct && (
              <span className="max-w-[80px] truncate text-[10px] opacity-80 font-mono">
                {selectedProduct.sku}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('matrix')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              subTab === 'matrix'
                ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>Матрица «Что, если?»</span>
          </button>

          <button
            onClick={() => setSubTab('advisor')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              subTab === 'advisor'
                ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>AI-Аудит и советы</span>
          </button>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto px-1">
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
            title="Выгрузить юнит-экономику в Excel (.xlsx) с живыми математическими формулами"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Экспорт формул Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Стрип метрик */}
      <MetricsOverview
        products={products}
        onFilterLosses={() => setActiveFilter(activeFilter === 'loss' ? 'all' : 'loss')}
        activeFilter={activeFilter}
      />

      {/* 3. Информационный баннер правил Ozon */}
      {subTab === 'table' && (
        <div className="bg-slate-100 dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] font-mono">
                Правила Ozon 2025/2026: Ступень 300 ₽ и УСН 11%
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
              При розничной цене <strong>≤ 300 ₽</strong> применяется льготная комиссия 23% и сниженная логистика. При цене <strong>{'>'} 300 ₽</strong> комиссия составляет 52% (или ставка FBO). Базой налога УСН 11% является цена реализации с учетом скидки продавца (marketing_seller_price, колонка E).
            </p>
          </div>

          <button
            onClick={onOpenOzonSync}
            className="px-3 py-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className="w-3 h-3 text-emerald-500" />
            <span>Синхронизация Ozon API</span>
          </button>
        </div>
      )}

      {/* 4. Контент выбранной подвкладки */}
      {subTab === 'table' && (
        <ProductTable
          products={products}
          onUpdateProduct={onUpdateProduct}
          onDeleteProduct={onDeleteProduct}
          onDuplicateProduct={onDuplicateProduct}
          onSelectForDeepDive={handleSelectForDeepDive}
          onApplyPresetToAll={onApplyPresetToAll}
          onUpdateWarehouseAll={onUpdateWarehouseAll}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          onExport={onExport}
        />
      )}

      {subTab === 'single' && (
        <SingleCalculator
          products={products}
          selectedProduct={selectedProduct}
          onSaveProduct={onUpdateProduct}
          onSaveAsNew={onAddProduct}
        />
      )}

      {subTab === 'matrix' && (
        <SensitivityMatrix
          products={products}
          selectedProduct={selectedProduct}
        />
      )}

      {subTab === 'advisor' && (
        <EconomicsAdvisor
          products={products}
          onSelectProduct={handleSelectForDeepDive}
        />
      )}
    </div>
  );
};
