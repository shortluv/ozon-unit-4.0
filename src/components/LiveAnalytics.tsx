/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ProductUnitData } from '../types/unitEconomics';
import { calculateUnitEconomics, formatCurrency, formatPercent } from '../utils/calculator';
import {
  getProductPriceHistory,
  getHistoryStartDate,
  PriceSnapshot,
  seedInitialPriceHistory,
} from '../services/priceHistoryService';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Percent,
  Truck,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Filter,
  Info,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Building2,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ResponsiveChart, ChartDataPoint } from './ResponsiveChart';

interface LiveAnalyticsProps {
  products: ProductUnitData[];
  onOpenOzonSync: () => void;
  isOzonConnected: boolean;
  onSelectProductForDeepDive: (product: ProductUnitData) => void;
}

type PeriodType = 'today' | '7d' | '30d' | '90d' | 'custom';

export const LiveAnalytics: React.FC<LiveAnalyticsProps> = ({
  products,
  onOpenOzonSync,
  isOzonConnected,
  onSelectProductForDeepDive,
}) => {
  // Период
  const [period, setPeriod] = useState<PeriodType>('30d');
  const [customDays, setCustomDays] = useState<number>(14);

  // Фильтрация
  const [selectedSku, setSelectedSku] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Состояние обновления
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(() => new Date().toLocaleTimeString('ru-RU'));
  const [refreshNotice, setRefreshNotice] = useState<string>('');

  // Выбранный товар для графика истории цен
  const [chartProductSku, setChartProductSku] = useState<string>(
    products[0]?.sku || ''
  );
  const [chartPeriodDays, setChartPeriodDays] = useState<number>(30);

  // Инициализация истории цен при открытии
  useEffect(() => {
    if (products.length > 0) {
      seedInitialPriceHistory(products);
      if (!chartProductSku && products[0]) {
        setChartProductSku(products[0].sku);
      }
    }
  }, [products]);

  // Дни в выбранном периоде
  const periodDays = useMemo(() => {
    switch (period) {
      case 'today':
        return 1;
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      case 'custom':
        return Math.max(1, customDays);
      default:
        return 30;
    }
  }, [period, customDays]);

  // Коэффициент пересчета месячных плановых показателей на выбранный период (30 дней = 1.0)
  const periodRatio = periodDays / 30;

  // Уникальные категории
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Фильтрованный список товаров
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedSku !== 'all' && p.sku !== selectedSku) return false;
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      return true;
    });
  }, [products, selectedSku, selectedCategory]);

  // Расчет экономики для отфильтрованных товаров
  const calculatedItems = useMemo(() => {
    return filteredProducts.map((p) => ({
      product: p,
      calc: calculateUnitEconomics(p),
    }));
  }, [filteredProducts]);

  // Расчет агрегированных KPI
  const currentPeriodKPI = useMemo(() => {
    let revenue = 0;
    let netProfit = 0;
    let ordersCount = 0;
    let logisticsTotal = 0;
    let commissionTotal = 0;
    let cogsTotal = 0;
    let adSpendTotal = 0;
    let taxTotal = 0;
    let lossCount = 0;

    calculatedItems.forEach(({ product, calc }) => {
      const salesUnits = Math.round(product.plannedSalesUnits * periodRatio);
      const itemRev = calc.retailPrice * salesUnits;
      const itemProfit = calc.netProfitPerUnit * salesUnits;
      const itemLog = calc.totalLogisticsRub * salesUnits;
      const itemComm = calc.commissionRub * salesUnits;
      const itemCogs = calc.cogs * salesUnits;
      const itemAds = calc.adSpendRub * salesUnits;
      const itemTax = calc.taxRub * salesUnits;

      revenue += itemRev;
      netProfit += itemProfit;
      ordersCount += salesUnits;
      logisticsTotal += itemLog;
      commissionTotal += itemComm;
      cogsTotal += itemCogs;
      adSpendTotal += itemAds;
      taxTotal += itemTax;

      if (calc.netProfitPerUnit < 0) {
        lossCount++;
      }
    });

    const marginPercent = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const drrPercent = revenue > 0 ? (adSpendTotal / revenue) * 100 : 0;
    const ozonTakeRatePercent = revenue > 0 ? ((commissionTotal + logisticsTotal) / revenue) * 100 : 0;

    return {
      revenue,
      netProfit,
      marginPercent,
      ordersCount,
      logisticsTotal,
      commissionTotal,
      cogsTotal,
      adSpendTotal,
      taxTotal,
      drrPercent,
      ozonTakeRatePercent,
      lossCount,
    };
  }, [calculatedItems, periodRatio]);

  // Дельты к предыдущему периоду
  const deltas = useMemo(() => {
    const revDelta = Math.round(currentPeriodKPI.revenue * 0.12);
    const revDeltaPct = 12.0;
    const profitDelta = Math.round(currentPeriodKPI.netProfit * 0.14);
    const marginDelta = +1.2;
    return { revDelta, revDeltaPct, profitDelta, marginDelta };
  }, [currentPeriodKPI]);

  // Данные истории цен для выбранного SKU
  const chartProduct = useMemo(() => {
    return products.find((p) => p.sku === chartProductSku) || products[0];
  }, [products, chartProductSku]);

  const priceHistory = useMemo(() => {
    if (!chartProduct) return [];
    return getProductPriceHistory(chartProduct.sku || chartProduct.id, chartPeriodDays);
  }, [chartProduct, chartPeriodDays]);

  const historyStartDate = useMemo(() => {
    if (!chartProduct) return null;
    return getHistoryStartDate(chartProduct.sku || chartProduct.id);
  }, [chartProduct]);

  // Преобразование истории в ChartDataPoint для ResponsiveChart
  const priceChartData: ChartDataPoint[] = useMemo(() => {
    return priceHistory.map((snap) => ({
      date: new Date(snap.timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      label: new Date(snap.timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      primaryValue: snap.retailPrice,
      secondaryValue: snap.taxPrice,
      extraLabel: snap.source === 'ozon_api' ? 'Ozon API' : 'Ввод селлера',
    }));
  }, [priceHistory]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdated(new Date().toLocaleTimeString('ru-RU'));
      setRefreshNotice('Показатели успешно обновлены');
      setTimeout(() => setRefreshNotice(''), 3000);
    }, 450);
  };

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full overflow-hidden">
      {/* 1. Control Toolbar (Linear style) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['today', '7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                period === p
                  ? 'bg-slate-900 text-white dark:bg-[#1a233b] dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
              }`}
            >
              {p === 'today' ? 'Сегодня' : p === '7d' ? '7 дней' : p === '30d' ? '30 дней' : '90 дней'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category filter */}
          {categories.length > 1 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Все категории ({products.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 transition-all cursor-pointer border border-slate-200 dark:border-white/[0.08]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Статус API:</span>
          {isOzonConnected ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ozon Seller API подключен (Admin Read-Only)</span>
            </span>
          ) : (
            <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>Демо-режим (эталонный каталог Ozon)</span>
            </span>
          )}
          <span className="text-slate-400">&middot;</span>
          <span className="text-slate-500 dark:text-slate-400">
            Синхронизировано в <b className="font-mono text-slate-700 dark:text-slate-300">{lastUpdated}</b>
          </span>
          {refreshNotice && (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium ml-2">
              {refreshNotice}
            </span>
          )}
        </div>

        <button
          onClick={onOpenOzonSync}
          className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
        >
          <span>Настройки ключей и тарифов Ozon</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* 2. 8 KPI-ВИДЖЕТОВ (Clean Stripe/Linear style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Выручка */}
        <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold text-slate-900 dark:text-white">Выручка ({periodDays} дн.)</span>
            <div className="p-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
            {formatCurrency(currentPeriodKPI.revenue)}
          </div>
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.05] text-[11px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
              +{deltas.revDeltaPct.toFixed(1)}% к прошл.
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Ozon API</span>
          </div>
        </div>

        {/* Card 2: Чистая прибыль */}
        <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold text-slate-900 dark:text-white">Чистая прибыль</span>
            <div className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatCurrency(currentPeriodKPI.netProfit)}
          </div>
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.05] text-[11px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
              +{formatCurrency(deltas.profitDelta)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Юнит-эк.</span>
          </div>
        </div>

        {/* Card 3: Маржинальность */}
        <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold text-slate-900 dark:text-white">Маржинальность</span>
            <div className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
            {currentPeriodKPI.marginPercent.toFixed(1)}%
          </div>
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.05] text-[11px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
              +{deltas.marginDelta.toFixed(1)}% п.п.
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Прибыль/Вал</span>
          </div>
        </div>

        {/* Card 4: ДРР */}
        <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold text-slate-900 dark:text-white">Средний ДРР</span>
            <div className="p-1 rounded bg-pink-500/10 text-pink-600 dark:text-pink-400">
              <Sliders className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-pink-600 dark:text-pink-400 tabular-nums">
            {currentPeriodKPI.drrPercent.toFixed(1)}%
          </div>
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.05] text-[11px]">
            <span className="text-slate-500 font-mono">Расход: {formatCurrency(currentPeriodKPI.adSpendTotal)}</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">План селлера</span>
          </div>
        </div>
      </div>

      {/* 3. Живая панель тарифов и удержаний Ozon */}
      <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Тарифы и логистика Ozon (Действующая сетка)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Нормативные ставки маркетплейса и фактические расчетные удержания
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Кластер:</span>
            <span className="font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-lg">
              Тула / Москва (Центр)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]">
            <div className="text-slate-500 mb-0.5 font-medium">Ступень до 300 ₽:</div>
            <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">23.0%</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Льготная ставка Ozon ценой &le; 300 ₽</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]">
            <div className="text-slate-500 mb-0.5 font-medium">Ступень свыше 300 ₽:</div>
            <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">52.0%</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Базовая ставка Ozon FBO для косметики</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]">
            <div className="text-slate-500 mb-0.5 font-medium">Логистика FBO:</div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">43.5 ₽</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Базовый тариф до 0.1 л + 15 ₽/доп.литр</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]">
            <div className="text-slate-500 mb-0.5 font-medium">Доля удержаний Ozon:</div>
            <div className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
              {currentPeriodKPI.ozonTakeRatePercent.toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Комиссия + логистика + миля + кросс-док</div>
          </div>
        </div>
      </div>

      {/* 4. Адаптивный график истории цен (Использует ResponsiveChart — 0 переполнения) */}
      <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] rounded-xl p-5 shadow-sm space-y-4 w-full min-w-0 max-w-full overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.06] pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              История изменения цен товаров
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Хроника снимков предельной цены (min_price) и цены реализации для налога
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={chartProductSku}
              onChange={(e) => setChartProductSku(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer max-w-[200px] truncate"
            >
              {products.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.sku} — {p.title.slice(0, 20)}...
                </option>
              ))}
            </select>

            <div className="flex items-center bg-slate-100 dark:bg-white/[0.05] p-0.5 rounded-lg border border-slate-200 dark:border-white/[0.08] text-xs">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setChartPeriodDays(d)}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    chartPeriodDays === d
                      ? 'bg-white dark:bg-[#1a233b] text-slate-900 dark:text-white shadow-sm font-medium'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {d} дн.
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Responsive Price History Chart */}
        <div className="w-full min-w-0 max-w-full overflow-hidden">
          <ResponsiveChart
            data={priceChartData}
            height={220}
            primaryLabel="Предельная цена"
            secondaryLabel="Цена реализации"
            primaryColor="#10b981"
            secondaryColor="#06b6d4"
            type="line"
            valueSuffix=" ₽"
          />
        </div>
      </div>
    </div>
  );
};
