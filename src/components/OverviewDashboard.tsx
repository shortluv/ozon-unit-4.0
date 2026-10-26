import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  DollarSign,
  Package,
  AlertTriangle,
  RefreshCw,
  Download,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import { ProductUnitData } from '../types/unitEconomics';
import { generateStoreAnalytics } from '../services/analyticsService';
import { ResponsiveChart, ChartDataPoint } from './ResponsiveChart';
import { MainTabType } from './Sidebar';
import { EmptyStateOnboarding } from './EmptyStateOnboarding';

interface OverviewDashboardProps {
  products: ProductUnitData[];
  onOpenOzonSync: () => void;
  onOpenNewProduct: () => void;
  onExport: () => void;
  onNavigateTab: (tab: MainTabType) => void;
  onSelectProductForDeepDive: (product: ProductUnitData) => void;
  isOzonConnected?: boolean;
  isDemoMode?: boolean;
  onLoadDemo?: () => void;
  onOpenImport?: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  products,
  onOpenOzonSync,
  onOpenNewProduct,
  onExport,
  onNavigateTab,
  onSelectProductForDeepDive,
  isOzonConnected = false,
  isDemoMode = false,
  onLoadDemo,
  onOpenImport,
}) => {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const analytics = useMemo(() => {
    return generateStoreAnalytics(products, period);
  }, [products, period]);

  // Если товаров еще нет (первый запуск без API и без демо)
  if (products.length === 0) {
    return (
      <EmptyStateOnboarding
        onOpenOzonSync={onOpenOzonSync}
        onOpenImport={onOpenImport || (() => onNavigateTab('import_export'))}
        onLoadDemo={onLoadDemo || (() => {})}
        onOpenNewProduct={onOpenNewProduct}
      />
    );
  }

  const { ordersSummary, topProducts, worstProducts, allPerformance, stockInventory } = analytics;

  // Критические предупреждения
  const lossItems = useMemo(() => allPerformance.filter((p) => p.isLoss), [allPerformance]);
  const risk300Items = useMemo(() => allPerformance.filter((p) => p.isAtRisk300), [allPerformance]);
  const lowStockItems = useMemo(
    () => stockInventory.filter((s) => s.status === 'critical_low' || s.status === 'low'),
    [stockInventory]
  );

  // Подготовка точек данных для адаптивного графика без переполнения экрана
  const chartData: ChartDataPoint[] = useMemo(() => {
    return ordersSummary.dailyDynamics.map((d) => ({
      date: d.date,
      label: d.dayLabel,
      primaryValue: d.grossRevenue,
      secondaryValue: d.netProfit,
      extraLabel: `${d.ordersCount} заказов`,
    }));
  }, [ordersSummary.dailyDynamics]);

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full overflow-hidden">
      {/* 1. Верхний информационный статус магазина (Vercel-style technical bar) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                Ozon Seller Analytics Hub
              </h2>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 ${
                  isOzonConnected
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
                    : isDemoMode
                    ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/25'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25'
                }`}
              >
                {isOzonConnected
                  ? 'API СИНХРОНИЗИРОВАН'
                  : isDemoMode
                  ? 'ДЕМО-МАГАЗИН (ОБРАЗЦЫ)'
                  : 'РУЧНОЙ ВВОД'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {isDemoMode
                ? 'Ознакомительный каталог • Регламент FBO 2026 • УСН 11% • Тариф Ozon Красота'
                : 'Регламент FBO 2026 • Фактическая цена реализации • Порог 300 ₽ (23% / 52%)'}
            </p>
          </div>
        </div>

        {/* Выбор периода + быстрые действия */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="flex items-center bg-slate-100 dark:bg-white/[0.05] p-0.5 rounded-lg border border-slate-200 dark:border-white/[0.08]">
            {(['7d', '30d', '90d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  period === p
                    ? 'bg-white dark:bg-[#1a233b] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {p === '7d' ? '7 дней' : p === '30d' ? '30 дней' : '90 дней'}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenOzonSync}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Синхронизация</span>
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/[0.08] transition-colors cursor-pointer"
            title="Экспорт в Excel с живыми математическими формулами"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Excel .XLSX</span>
          </button>
        </div>
      </div>

      {/* 2. Основные KPI-плитки (Stripe-inspired density) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Карточка 1: Выручка */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Выручка магазина
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              {ordersSummary.grossRevenue.toLocaleString('ru-RU')} ₽
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium font-mono">
                <TrendingUp className="w-3 h-3" />
                +{ordersSummary.revenueDeltaPercent}%
              </span>
              <span className="text-slate-400 dark:text-slate-500">к прошл. периоду</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.05] text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
            <span>Реализация (база):</span>
            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
              {ordersSummary.realizedRevenue.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>

        {/* Карточка 2: Чистая расчетная прибыль */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Чистая прибыль
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              {ordersSummary.estimatedNetProfit.toLocaleString('ru-RU')} ₽
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium font-mono">
                <TrendingUp className="w-3 h-3" />
                +{ordersSummary.netProfitDeltaPercent}%
              </span>
              <span className="text-slate-400 dark:text-slate-500">к прошл. периоду</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.05] text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
            <span>Маржинальность:</span>
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              {ordersSummary.avgMarginPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Карточка 3: Заказы и выкупы */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Заказы и выкуп
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              {ordersSummary.totalOrders.toLocaleString('ru-RU')} зак.
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium font-mono">
                <TrendingUp className="w-3 h-3" />
                +{ordersSummary.ordersDeltaPercent}%
              </span>
              <span className="text-slate-400 dark:text-slate-500 font-mono">
                ({ordersSummary.totalUnitsOrdered} ед.)
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.05] text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
            <span>Процент выкупа:</span>
            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
              {ordersSummary.redemptionRatePercent}%
            </span>
          </div>
        </div>

        {/* Карточка 4: Средний чек и SKU */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Средний чек / Каталог
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              {ordersSummary.avgOrderValue.toLocaleString('ru-RU')} ₽
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium font-mono">
                <TrendingUp className="w-3 h-3" />
                +{ordersSummary.avgOrderValueDeltaPercent}%
              </span>
              <span className="text-slate-400 dark:text-slate-500">ср. чек</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.05] text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
            <span>Товаров в каталоге:</span>
            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
              {products.length} SKU
            </span>
          </div>
        </div>
      </div>

      {/* 3. Предупреждения селлеру (Loss / 300₽ Risk / Stockout) */}
      {(lossItems.length > 0 || risk300Items.length > 0 || lowStockItems.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Алерт 1: Убыточные товары */}
          {lossItems.length > 0 ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider font-mono">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Убыточные SKU ({lossItems.length})</span>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-2 leading-relaxed">
                  Позиции продаются с отрицательной прибылью с учетом логистики и налога УСН 11%.
                </p>
                <div className="mt-3 space-y-1">
                  {lossItems.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        const original = products.find((p) => p.id === item.id);
                        if (original) onSelectProductForDeepDive(original);
                      }}
                      className="text-xs font-mono flex items-center justify-between p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 dark:text-rose-200 cursor-pointer"
                    >
                      <span className="truncate max-w-[150px]">{item.title}</span>
                      <span className="font-bold shrink-0">{item.netProfitPerUnit.toFixed(0)} ₽/ед</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('unit_economics')}
                className="mt-3 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>Исправить в юнит-экономике</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Все товары прибыльны
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Убыточных позиций в каталоге не обнаружено
                </div>
              </div>
            </div>
          )}

          {/* Алерт 2: Зона риска 301–350 ₽ */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Риск 301–350 ₽ ({risk300Items.length} SKU)</span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-2 leading-relaxed">
                При цене {'>'} 300 ₽ комиссия скачет с 23% до 52%. Подъем цены на 1–20 ₽ снижает маржу!
              </p>
              <div className="mt-3 space-y-1">
                {risk300Items.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      const original = products.find((p) => p.id === item.id);
                      if (original) onSelectProductForDeepDive(original);
                    }}
                    className="text-xs font-mono flex items-center justify-between p-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 cursor-pointer"
                  >
                    <span className="truncate max-w-[150px]">{item.title}</span>
                    <span className="font-bold shrink-0">{item.retailPrice} ₽</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('unit_economics')}
              className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>Смотреть расчет ступеней</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Алерт 3: Дефицит остатков на складе */}
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/25 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider font-mono">
                <Package className="w-4 h-4 shrink-0" />
                <span>Дефицит остатков ({lowStockItems.length} SKU)</span>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-2 leading-relaxed">
                Товары, остатка которых хватит менее чем на 14 дней продаж. Риск выпадения из выдачи Ozon.
              </p>
              <div className="mt-3 space-y-1">
                {lowStockItems.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onNavigateTab('stocks')}
                    className="text-xs font-mono flex items-center justify-between p-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-800 dark:text-blue-200 cursor-pointer"
                  >
                    <span className="truncate max-w-[150px]">{item.title}</span>
                    <span className="font-bold shrink-0">{item.daysOfSupply} дн.</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('stocks')}
              className="mt-3 text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>Управление остатками</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Адаптивный график динамики выручки и прибыли (НЕ ВЫХОДИТ ЗА ГРАНИЦЫ) */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm w-full min-w-0 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Динамика выручки и чистой прибыли по дням
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400">
                За {ordersSummary.period}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Адаптивный расчет масштаба продаж с учетом возвратов и списаний маркетплейса
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-slate-600 dark:text-slate-300">Выручка</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-300">Чистая прибыль</span>
            </div>
          </div>
        </div>

        {/* Внедрение ResponsiveChart — 100% защита от переполнения */}
        <div className="w-full min-w-0 max-w-full overflow-hidden">
          <ResponsiveChart
            data={chartData}
            height={240}
            primaryLabel="Выручка"
            secondaryLabel="Чистая прибыль"
            primaryColor="#3b82f6"
            secondaryColor="#10b981"
            type="line"
            valueSuffix=" ₽"
          />
        </div>
      </div>

      {/* 5. Топ-5 лидеров по прибыли и аутсайдеры */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full min-w-0">
        {/* Таблица 1: Топ по прибыли */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Топ-5 лидеров по чистой прибыли
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1 font-medium"
            >
              <span>Все продажи</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
            {topProducts.map((p, rank) => (
              <div
                key={p.id}
                onClick={() => {
                  const original = products.find((prod) => prod.id === p.id);
                  if (original) onSelectProductForDeepDive(original);
                }}
                className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                    {rank + 1}
                  </span>
                  <div className="truncate">
                    <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                      {p.title}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      SKU: {p.sku} • {p.unitsSold} шт
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    +{p.netProfit.toLocaleString('ru-RU')} ₽
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    маржа {p.marginPercent.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Таблица 2: Аутсайдеры с низкой маржой */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Аутсайдеры по маржинальности
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('unit_economics')}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1 font-medium"
            >
              <span>Оптимизировать</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
            {worstProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  const original = products.find((prod) => prod.id === p.id);
                  if (original) onSelectProductForDeepDive(original);
                }}
                className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                    {p.title}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    SKU: {p.sku} • Цена: {p.retailPrice} ₽
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`text-xs font-bold font-mono ${
                      p.isLoss
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {p.marginPercent.toFixed(1)}% маржа
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {p.netProfitPerUnit.toFixed(0)} ₽/ед.
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
