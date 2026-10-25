import React from 'react';
import { ProductUnitData, UnitEconomicsResult } from '../types/unitEconomics';
import { calculateUnitEconomics, formatCurrency, formatPercent } from '../utils/calculator';
import { TrendingUp, AlertTriangle, CheckCircle2, DollarSign, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

interface MetricsOverviewProps {
  products: ProductUnitData[];
  onFilterLosses: () => void;
  activeFilter: string;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  products,
  onFilterLosses,
  activeFilter,
}) => {
  const calculations: UnitEconomicsResult[] = products.map(calculateUnitEconomics);

  const totalMonthlyRevenue = calculations.reduce((acc, c) => acc + c.monthlyRevenue, 0);
  const totalMonthlyProfit = calculations.reduce((acc, c) => acc + c.monthlyNetProfit, 0);
  const totalMonthlyExpenses = calculations.reduce((acc, c) => acc + c.monthlyTotalExpenses, 0);

  const avgMargin = totalMonthlyRevenue > 0
    ? (totalMonthlyProfit / totalMonthlyRevenue) * 100
    : 0;

  const lossCount = calculations.filter((c) => c.status === 'loss').length;
  const marginalCount = calculations.filter((c) => c.status === 'marginal').length;
  const profitableCount = calculations.filter((c) => c.status === 'profitable').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric 1: Monthly Net Profit (Mercury Headline Card) */}
      <div className="bg-[#0e1424] border border-white/[0.08] rounded-xl p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-all hover:border-white/[0.14] group">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
          <span className="font-medium text-slate-300">Чистая прибыль / мес</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
        </div>
        <div className={`text-2xl lg:text-3xl font-semibold font-mono tracking-tight tabular-nums ${totalMonthlyProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {formatCurrency(totalMonthlyProfit)}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-400 pt-2 border-t border-white/[0.05]">
          <span className="text-slate-400">Ср. маржинальность:</span>
          <span className="font-mono tabular-nums font-semibold text-white">
            {formatPercent(avgMargin)}
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-slate-400">{products.length} SKU</span>
        </div>
      </div>

      {/* Metric 2: Monthly Revenue */}
      <div className="bg-[#0e1424] border border-white/[0.08] rounded-xl p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-all hover:border-white/[0.14]">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
          <span className="font-medium text-slate-300">Плановая выручка</span>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <DollarSign className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
        </div>
        <div className="text-2xl lg:text-3xl font-semibold font-mono tracking-tight tabular-nums text-white">
          {formatCurrency(totalMonthlyRevenue)}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-400 pt-2 border-t border-white/[0.05]">
          <span className="text-slate-400">Все расходы:</span>
          <span className="font-mono tabular-nums text-slate-300 font-medium">
            {formatCurrency(totalMonthlyExpenses)}
          </span>
        </div>
      </div>

      {/* Metric 3: Profitable items */}
      <div className="bg-[#0e1424] border border-white/[0.08] rounded-xl p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-all hover:border-white/[0.14]">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
          <span className="font-medium text-slate-300">Прибыльные позиции</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
        </div>
        <div className="text-2xl lg:text-3xl font-semibold font-mono tracking-tight tabular-nums text-emerald-400 flex items-baseline">
          {profitableCount}
          <span className="text-xs font-normal text-slate-500 ml-1.5">из {products.length} SKU</span>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-400 pt-2 border-t border-white/[0.05]">
          <span className="text-slate-300 font-medium">Маржа &gt; 12%</span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-amber-400/90 font-mono tabular-nums">{marginalCount} пограничных</span>
        </div>
      </div>

      {/* Metric 4: Loss warning items (Mercury Alert Card) */}
      <div
        onClick={lossCount > 0 ? onFilterLosses : undefined}
        className={`bg-[#0e1424] border rounded-xl p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-all ${
          lossCount > 0
            ? 'border-rose-500/35 hover:border-rose-500/60 cursor-pointer bg-rose-950/[0.12]'
            : 'border-white/[0.08] hover:border-white/[0.14]'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
          <span className="font-medium text-slate-300">Убыточные позиции</span>
          <div className={`p-1.5 rounded-lg border ${lossCount > 0 ? 'bg-rose-500/15 text-rose-400 border-rose-500/25' : 'bg-slate-800 text-slate-500 border-white/[0.06]'}`}>
            <AlertTriangle className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
        </div>
        <div className={`text-2xl lg:text-3xl font-semibold font-mono tracking-tight tabular-nums flex items-baseline ${lossCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
          {lossCount}
          <span className="text-xs font-normal text-slate-500 ml-1.5">SKU в минусе</span>
        </div>
        <div className="mt-3 text-xs flex items-center justify-between pt-2 border-t border-white/[0.05]">
          {lossCount > 0 ? (
            <span className="text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 transition-colors">
              {activeFilter === 'loss' ? 'Сбросить фильтр' : 'Показать в таблице'}
              <ArrowUpRight className="w-3 h-3" />
            </span>
          ) : (
            <span className="text-emerald-400/90 font-medium">Все позиции в плюсе</span>
          )}
        </div>
      </div>
    </div>
  );
};
