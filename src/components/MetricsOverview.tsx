import React from 'react';
import { ProductUnitData, UnitEconomicsResult } from '../types/unitEconomics';
import { calculateUnitEconomics, formatCurrency, formatPercent } from '../utils/calculator';
import { TrendingUp, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';

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
  const calculations: UnitEconomicsResult[] = products.map((p) => calculateUnitEconomics(p));

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
      {/* Metric 1: Monthly Net Profit */}
      <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">Чистая прибыль / мес</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${totalMonthlyProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {formatCurrency(totalMonthlyProfit)}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/[0.05]">
          <span>Ср. маржинальность:</span>
          <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
            {formatPercent(avgMargin)}
          </span>
          <span className="text-slate-300 dark:text-slate-600">&middot;</span>
          <span>{products.length} SKU</span>
        </div>
      </div>

      {/* Metric 2: Monthly Revenue */}
      <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">Плановая выручка</span>
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <DollarSign className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-white">
          {formatCurrency(totalMonthlyRevenue)}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/[0.05]">
          <span>Все расходы:</span>
          <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300 font-medium">
            {formatCurrency(totalMonthlyExpenses)}
          </span>
        </div>
      </div>

      {/* Metric 3: Profitable items */}
      <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">Прибыльные позиции</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400 flex items-baseline">
          {profitableCount}
          <span className="text-xs font-normal text-slate-500 ml-1.5">из {products.length} SKU</span>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/[0.05]">
          <span className="font-medium text-slate-700 dark:text-slate-300">Маржа &gt; 12%</span>
          <span className="text-slate-300 dark:text-slate-600">&middot;</span>
          <span className="text-amber-600 dark:text-amber-400 font-mono tabular-nums">{marginalCount} пограничных</span>
        </div>
      </div>

      {/* Metric 4: Loss warning items */}
      <div
        onClick={lossCount > 0 ? onFilterLosses : undefined}
        className={`bg-white dark:bg-[#111726] border rounded-xl p-4 shadow-sm flex flex-col justify-between transition-all ${
          lossCount > 0
            ? 'border-rose-300 dark:border-rose-500/35 hover:border-rose-400 dark:hover:border-rose-500/60 cursor-pointer bg-rose-50/50 dark:bg-rose-950/20'
            : 'border-slate-200 dark:border-white/[0.08]'
        }`}
      >
        <div className="flex items-center justify-between text-xs mb-2">
          <span className={`font-semibold ${lossCount > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
            Убыточные позиции
          </span>
          <div className={`p-1.5 rounded-lg ${lossCount > 0 ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-white/[0.05] text-slate-400'}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${lossCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
          {lossCount} SKU
        </div>
        <div className="flex items-center justify-between mt-3 text-xs pt-2 border-t border-slate-100 dark:border-white/[0.05]">
          {lossCount > 0 ? (
            <span className="text-rose-600 dark:text-rose-400 font-medium">
              {activeFilter === 'loss' ? 'Фильтр активен' : 'Нажмите для фильтра'}
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Все позиции в плюсе</span>
          )}
          <span className="text-[10px] text-slate-400 font-mono">Прибыль &lt; 0 ₽</span>
        </div>
      </div>
    </div>
  );
};
