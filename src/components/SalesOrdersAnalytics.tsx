import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Calendar,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { ProductUnitData } from '../types/unitEconomics';
import { generateStoreAnalytics, ProductPerformanceItem } from '../services/analyticsService';

interface SalesOrdersAnalyticsProps {
  products: ProductUnitData[];
  onSelectProductForDeepDive: (product: ProductUnitData) => void;
  onExport: () => void;
}

export const SalesOrdersAnalytics: React.FC<SalesOrdersAnalyticsProps> = ({
  products,
  onSelectProductForDeepDive,
  onExport,
}) => {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'grossRevenue' | 'unitsSold' | 'netProfit' | 'marginPercent'>('grossRevenue');
  const [sortAsc, setSortAsc] = useState(false);

  const analytics = useMemo(() => {
    return generateStoreAnalytics(products, period);
  }, [products, period]);

  const { ordersSummary, allPerformance } = analytics;

  // Фильтрация и сортировка товаров
  const filteredProducts = useMemo(() => {
    let items = allPerformance.filter(
      (p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    items.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      return sortAsc ? valA - valB : valB - valA;
    });

    return items;
  }, [allPerformance, searchQuery, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Пояснительная памятка о разделении показателей воронки Ozon */}
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] font-mono">
              Методология разделения метрик воронки Ozon (FBO / FBS)
            </span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
              Аналитика строго разделяет 4 ключевые сущности Ozon:
              <strong className="text-slate-800 dark:text-slate-200 font-medium"> 1. Заказы</strong> (оформленные покупателями корзины),
              <strong className="text-slate-800 dark:text-slate-200 font-medium"> 2. Отгрузки</strong> (переданные в доставку отправления),
              <strong className="text-slate-800 dark:text-slate-200 font-medium"> 3. Выкупы</strong> (фактически забранные в ПВЗ товары), и
              <strong className="text-emerald-600 dark:text-emerald-400 font-medium"> 4. Финансовую реализацию</strong> (строки в закрывающем отчете /v2/finance/realization). Они никогда не смешиваются в одну цифру.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Четыре блока воронки заказов и продаж */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Блок 1: Заказы (Orders) */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              1. Заказы покупателей
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              /v3/posting
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {ordersSummary.totalOrders.toLocaleString('ru-RU')}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>Товаров в заказах:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {ordersSummary.totalUnitsOrdered} шт.
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.05] text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+{ordersSummary.ordersDeltaPercent}% к прошлому периоду</span>
          </div>
        </div>

        {/* Блок 2: Выкупы (Redemptions) */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              2. Выкупленные товары
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Delivered
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {ordersSummary.totalUnitsDelivered.toLocaleString('ru-RU')} шт.
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>Доля выкупа:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {ordersSummary.redemptionRatePercent}%
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.05] text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+{ordersSummary.redemptionRateDeltaPercent}% стабильный выкуп</span>
          </div>
        </div>

        {/* Блок 3: Отмены и возвраты (Cancellations & Returns) */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              3. Отмены и возвраты
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              Cancelled / Return
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {ordersSummary.cancelledOrders + ordersSummary.returnedUnits}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>Отмены: {ordersSummary.cancellationRatePercent}%</span>
              <span>Возвраты: {ordersSummary.returnRatePercent}%</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.05] text-[11px] text-slate-500 dark:text-slate-400">
            Возвратов в ПВЗ: {ordersSummary.returnedUnits} ед.
          </div>
        </div>

        {/* Блок 4: Средний чек (AOV) */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              4. Средний чек корзины
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              AOV
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {ordersSummary.avgOrderValue.toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>Единиц в чеке:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {(ordersSummary.totalUnitsOrdered / ordersSummary.totalOrders).toFixed(2)} ед.
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.05] text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+{ordersSummary.avgOrderValueDeltaPercent}% рост чека</span>
          </div>
        </div>
      </div>

      {/* 3. Детальная аналитическая таблица продаж по товарам */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Разрез продаж и доходности по SKU
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Сравнение объемов продаж, выручки, комиссий и чистой прибыли по позициям
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Поиск */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск по названию или SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-48 sm:w-64"
              />
            </div>

            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Экспорт XLSX</span>
            </button>
          </div>
        </div>

        {/* Таблица */}
        <div className="overflow-x-auto border border-slate-200 dark:border-white/[0.08] rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 font-mono text-[11px] border-b border-slate-200 dark:border-white/[0.08]">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Товар / SKU</th>
                <th className="py-2.5 px-3 font-semibold text-right">Цена</th>
                <th
                  onClick={() => handleSort('unitsSold')}
                  className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Продажи, шт</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('grossRevenue')}
                  className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Выручка, ₽</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">Комиссия Ozon</th>
                <th
                  onClick={() => handleSort('netProfit')}
                  className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Прибыль, ₽</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('marginPercent')}
                  className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Маржа, %</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3 font-semibold text-center">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
              {filteredProducts.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-3 max-w-xs">
                    <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {p.title}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>SKU: {p.sku}</span>
                      <span>•</span>
                      <span>{p.category}</span>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                    {p.retailPrice.toLocaleString('ru-RU')} ₽
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {p.unitsSold} шт
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {p.grossRevenue.toLocaleString('ru-RU')} ₽
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-slate-500 dark:text-slate-400">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        p.appliedCommissionPercent > 30
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {p.appliedCommissionPercent}%
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold">
                    <span
                      className={
                        p.isLoss
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }
                    >
                      {p.netProfit > 0 ? '+' : ''}
                      {p.netProfit.toLocaleString('ru-RU')} ₽
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                        p.isLoss
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          : p.marginPercent < 15
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {p.marginPercent.toFixed(1)}%
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => {
                        const original = products.find((prod) => prod.id === p.id);
                        if (original) onSelectProductForDeepDive(original);
                      }}
                      className="px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded border border-emerald-500/20 transition-colors cursor-pointer"
                    >
                      Калькулятор
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
