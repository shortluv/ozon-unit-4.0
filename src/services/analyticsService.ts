import { ProductUnitData } from '../types/unitEconomics';
import { calculateUnitEconomics } from '../utils/calculator';
import { callOzonApi, getSavedOzonCredentials } from './ozonApi';

export interface DailySalesDataPoint {
  date: string;
  dayLabel: string;
  ordersCount: number;
  unitsSold: number;
  deliveredUnits: number;
  cancelledUnits: number;
  returnedUnits: number;
  grossRevenue: number;
  realizedRevenue: number;
  netProfit: number;
  commissionsRub: number;
  logisticsRub: number;
  adSpendRub: number;
  avgOrderValue: number;
}

export interface SalesOrdersSummary {
  period: '7d' | '30d' | '90d';
  // 1. Заказы
  totalOrders: number;
  ordersDeltaPercent: number;
  // 2. Единицы товара
  totalUnitsOrdered: number;
  unitsOrderedDeltaPercent: number;
  // 3. Выкупы
  totalUnitsDelivered: number;
  redemptionRatePercent: number; // Выкуп %
  redemptionRateDeltaPercent: number;
  // 4. Отмены и возвраты
  cancelledOrders: number;
  cancellationRatePercent: number;
  returnedUnits: number;
  returnRatePercent: number;
  // 5. Средний чек
  avgOrderValue: number;
  avgOrderValueDeltaPercent: number;
  // 6. Финансовая выручка
  grossRevenue: number;
  revenueDeltaPercent: number;
  realizedRevenue: number;
  // 7. Расчетная чистая прибыль
  estimatedNetProfit: number;
  netProfitDeltaPercent: number;
  avgMarginPercent: number;
  // Динамика по дням
  dailyDynamics: DailySalesDataPoint[];
}

export interface ProductPerformanceItem {
  id: string;
  sku: string;
  title: string;
  category: string;
  warehouse: string;
  retailPrice: number;
  cogs: number;
  unitsSold: number;
  grossRevenue: number;
  netProfit: number;
  netProfitPerUnit: number;
  marginPercent: number;
  adSpendPercent: number;
  appliedCommissionPercent: number;
  fboStock: number;
  fbsStock: number;
  daysOfSupply: number;
  isLoss: boolean;
  isAtRisk300: boolean;
}

export interface FinanceStatementSummary {
  accrualsRevenue: number; // Начисления (фактическая сумма продаж покупателям)
  realizationRevenue: number; // Выручка по отчету реализации (/v2/finance/realization)
  marketplaceCommissions: {
    total: number;
    under300: number; // Спец-ставка 23%
    over300: number; // Ставка свыше 300 ₽ (52% или FBO)
    acquiring: number; // Эквайринг 1.5%
  };
  logisticsExpenses: {
    total: number;
    fulfillment: number; // Сборка и упаковка на складе
    trunking: number; // Магистраль / базовый тариф по литражу
    lastMile: number; // Доставка покупателю (последняя миля 4.9%)
    crossDock: number; // Кросс-докинг
    ddvAndLp: number; // ДДВ и локальность продаж
    returnsAndCancellations: number; // Обратная логистика возвратов
  };
  otherDeductions: {
    total: number;
    storage: number; // Размещение на складах FBO
    disposalAndPenalties: number; // Утилизация / штрафы
    sellerDiscountsOffset: number; // Компенсации акций Ozon
  };
  advertisingExpenses: {
    total: number;
    source: 'seller_plan' | 'performance_api';
    avgDrrPercent: number;
    note: string;
  };
  cogsTotal: number; // Суммарная себестоимость закупки (ввод продавца)
  taxesTotal: number; // Налог УСН (11% от цены реализации)
  netProfit: number; // Итоговая чистая прибыль
  netMarginPercent: number; // Чистая маржинальность %
  roiPercent: number; // Рентабельность инвестиций (ROI %)
}

export interface StockInventoryItem {
  id: string;
  sku: string;
  title: string;
  barcode: string;
  category: string;
  warehouse: string;
  warehouseType: 'FBO' | 'FBS';
  retailPrice: number;
  minPrice: number;
  marketingSellerPrice: number;
  oldPrice?: number;
  fboStock: number;
  fbsStock: number;
  reservedStock: number;
  inTransitStock: number;
  totalAvailableStock: number;
  avgDailySales: number;
  daysOfSupply: number;
  status: 'critical_low' | 'low' | 'optimal' | 'surplus';
  volumeLiters: number;
  packageVolumeLiters: number;
  dimensions: {
    depth: number;
    width: number;
    height: number;
    weight: number;
  };
}

/**
 * Генерация синтетической детерминированной динамики на основе каталога товаров продавца
 * Обеспечивает согласованность цифр между графиками, отчетами и юнит-экономикой
 */
export function generateStoreAnalytics(
  products: ProductUnitData[],
  period: '7d' | '30d' | '90d' = '30d'
): {
  ordersSummary: SalesOrdersSummary;
  topProducts: ProductPerformanceItem[];
  worstProducts: ProductPerformanceItem[];
  allPerformance: ProductPerformanceItem[];
  financeSummary: FinanceStatementSummary;
  stockInventory: StockInventoryItem[];
} {
  const daysCount = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const list = Array.isArray(products) && products.length > 0 ? products : [];

  // Расчет производительности товаров
  const performanceItems: ProductPerformanceItem[] = list.map((p, idx) => {
    const calc = calculateUnitEconomics(p);
    const monthlyUnits = p.plannedSalesUnits || 150;
    // Масштабируем единицы под выбранный период
    const periodUnits = Math.round((monthlyUnits / 30) * daysCount);
    const grossRevenue = p.retailPrice * periodUnits;
    const netProfit = calc.netProfitPerUnit * periodUnits;
    const isAtRisk300 = p.retailPrice >= 301 && p.retailPrice <= 360;

    // Складские остатки с реалистичным распределением
    const seed = ((idx + 1) * 37) % 100;
    const fboStock = Math.max(12, Math.round(monthlyUnits * (0.8 + (seed % 40) / 100)));
    const fbsStock = p.warehouseType === 'FBS' ? Math.round(monthlyUnits * 0.4) : 0;
    const avgDailySales = Math.max(0.5, Math.round((monthlyUnits / 30) * 10) / 10);
    const daysOfSupply = Math.round(fboStock / avgDailySales);

    return {
      id: p.id,
      sku: p.sku,
      title: p.title,
      category: p.category || 'Косметика и уход',
      warehouse: p.warehouse || 'Склад FBO Тула / Москва (Центр)',
      retailPrice: p.retailPrice,
      cogs: p.cogs,
      unitsSold: periodUnits,
      grossRevenue,
      netProfit,
      netProfitPerUnit: calc.netProfitPerUnit,
      marginPercent: calc.marginPercent,
      adSpendPercent: p.adSpendPercent,
      appliedCommissionPercent: calc.appliedCommissionPercent,
      fboStock,
      fbsStock,
      daysOfSupply,
      isLoss: calc.netProfitPerUnit < 0,
      isAtRisk300,
    };
  });

  // Сортировка топов и аутсайдеров
  const sortedByProfit = [...performanceItems].sort((a, b) => b.netProfit - a.netProfit);
  const topProducts = sortedByProfit.slice(0, 5);
  const worstProducts = [...performanceItems].sort((a, b) => a.marginPercent - b.marginPercent).slice(0, 5);

  // Сводные метрики периода
  const totalUnitsOrdered = performanceItems.reduce((acc, p) => acc + p.unitsSold, 0);
  const avgCheck = performanceItems.length > 0
    ? Math.round(performanceItems.reduce((acc, p) => acc + p.retailPrice, 0) / performanceItems.length)
    : 0;

  // Отношение заказов к отправлениям (в среднем 1.35 единицы на заказ)
  const totalOrders = totalUnitsOrdered > 0 ? Math.max(1, Math.round(totalUnitsOrdered / 1.35)) : 0;
  const redemptionRatePercent = 91.4; // Реалистичный показатель выкупа для косметики FBO Ozon
  const cancellationRatePercent = 4.2; // Отмены до отгрузки
  const returnRatePercent = 4.4; // Возвраты в ПВЗ после получения

  const totalUnitsDelivered = Math.round(totalUnitsOrdered * (redemptionRatePercent / 100));
  const cancelledOrders = Math.round(totalOrders * (cancellationRatePercent / 100));
  const returnedUnits = Math.round(totalUnitsOrdered * (returnRatePercent / 100));

  const grossRevenue = performanceItems.reduce((acc, p) => acc + p.grossRevenue, 0);
  const realizedRevenue = Math.round(grossRevenue * (redemptionRatePercent / 100) * 0.96); // С учетом скидок селлера
  const estimatedNetProfit = performanceItems.reduce((acc, p) => acc + p.netProfit, 0);
  const avgMarginPercent = grossRevenue > 0 ? (estimatedNetProfit / grossRevenue) * 100 : 0;

  // Построение подневной динамики
  const dailyDynamics: DailySalesDataPoint[] = [];
  const now = new Date();

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

    // Сезонный синусоидальный тренд с волатильностью выходных дней
    const dayOfWeek = d.getDay();
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.25 : 1.0;
    const wave = 1 + 0.15 * Math.sin((i / 5) * Math.PI) * weekendMultiplier;

    const baseDailyUnits = totalUnitsOrdered > 0 ? Math.max(1, Math.round((totalUnitsOrdered / daysCount) * wave)) : 0;
    const baseDailyOrders = baseDailyUnits > 0 ? Math.max(1, Math.round(baseDailyUnits / 1.35)) : 0;
    const delivered = Math.round(baseDailyUnits * 0.91);
    const cancelled = Math.max(0, Math.round(baseDailyOrders * 0.04));
    const returned = Math.max(0, Math.round(baseDailyUnits * 0.05));

    const dayRevenue = grossRevenue > 0 ? Math.round((grossRevenue / daysCount) * wave) : 0;
    const dayRealized = realizedRevenue > 0 ? Math.round((realizedRevenue / daysCount) * wave) : 0;
    const dayProfit = estimatedNetProfit !== 0 ? Math.round((estimatedNetProfit / daysCount) * wave) : 0;

    dailyDynamics.push({
      date: dateStr,
      dayLabel,
      ordersCount: baseDailyOrders,
      unitsSold: baseDailyUnits,
      deliveredUnits: delivered,
      cancelledUnits: cancelled,
      returnedUnits: returned,
      grossRevenue: dayRevenue,
      realizedRevenue: dayRealized,
      netProfit: dayProfit,
      commissionsRub: Math.round(dayRevenue * 0.38),
      logisticsRub: Math.round(dayRevenue * 0.19),
      adSpendRub: Math.round(dayRevenue * 0.11),
      avgOrderValue: Math.round(dayRevenue / baseDailyOrders),
    });
  }

  // Финансовый отчет
  const commUnder300Total = performanceItems
    .filter((p) => p.retailPrice <= 300)
    .reduce((acc, p) => acc + p.grossRevenue * (p.appliedCommissionPercent / 100), 0);
  const commOver300Total = performanceItems
    .filter((p) => p.retailPrice > 300)
    .reduce((acc, p) => acc + p.grossRevenue * (p.appliedCommissionPercent / 100), 0);
  const acquiringTotal = Math.round(grossRevenue * 0.015);
  const commissionsTotal = Math.round(commUnder300Total + commOver300Total + acquiringTotal);

  const totalLogistics = Math.round(grossRevenue * 0.195);
  const totalCogs = performanceItems.reduce((acc, p) => acc + p.cogs * p.unitsSold, 0);
  const totalTaxes = Math.round(realizedRevenue * 0.11);
  const totalAdSpend = performanceItems.reduce(
    (acc, p) => acc + p.grossRevenue * ((p.adSpendPercent || 10) / 100),
    0
  );

  const financeSummary: FinanceStatementSummary = {
    accrualsRevenue: grossRevenue,
    realizationRevenue: realizedRevenue,
    marketplaceCommissions: {
      total: commissionsTotal,
      under300: Math.round(commUnder300Total),
      over300: Math.round(commOver300Total),
      acquiring: acquiringTotal,
    },
    logisticsExpenses: {
      total: totalLogistics,
      fulfillment: Math.round(totalUnitsOrdered * 10),
      trunking: Math.round(totalLogistics * 0.45),
      lastMile: Math.round(grossRevenue * 0.049),
      crossDock: Math.round(totalUnitsOrdered * 1.63),
      ddvAndLp: Math.round(totalUnitsOrdered * 7.1),
      returnsAndCancellations: Math.round(returnedUnits * 50),
    },
    otherDeductions: {
      total: Math.round(totalUnitsOrdered * 3.5),
      storage: Math.round(totalUnitsOrdered * 2.2),
      disposalAndPenalties: 0,
      sellerDiscountsOffset: Math.round(grossRevenue * 0.015),
    },
    advertisingExpenses: {
      total: Math.round(totalAdSpend),
      source: 'seller_plan',
      avgDrrPercent: Math.round(
        performanceItems.reduce((acc, p) => acc + (p.adSpendPercent || 10), 0) /
          Math.max(1, performanceItems.length)
      ),
      note: 'Данные ДРР рассчитаны по плановым ставкам продавца. Ozon Seller API с ключом Admin Read Only не отдает кампании Ozon Performance API.',
    },
    cogsTotal: totalCogs,
    taxesTotal: totalTaxes,
    netProfit: estimatedNetProfit,
    netMarginPercent: avgMarginPercent,
    roiPercent: totalCogs > 0 ? (estimatedNetProfit / totalCogs) * 100 : 0,
  };

  // Каталог остатков
  const stockInventory: StockInventoryItem[] = list.map((p, idx) => {
    const monthlyUnits = p.plannedSalesUnits || 150;
    const avgDailySales = Math.max(0.5, Math.round((monthlyUnits / 30) * 10) / 10);
    const seed = ((idx + 1) * 43) % 100;
    const fboStock = Math.round(monthlyUnits * (0.6 + (seed % 60) / 100));
    const fbsStock = p.warehouseType === 'FBS' ? Math.round(monthlyUnits * 0.3) : 0;
    const reservedStock = Math.round(fboStock * 0.08);
    const inTransitStock = Math.round(monthlyUnits * 0.25);
    const totalAvailable = fboStock + fbsStock;
    const daysOfSupply = Math.round(totalAvailable / avgDailySales);

    let status: StockInventoryItem['status'] = 'optimal';
    if (daysOfSupply <= 7) status = 'critical_low';
    else if (daysOfSupply <= 14) status = 'low';
    else if (daysOfSupply >= 60) status = 'surplus';

    const depth = p.dimensions?.depth || 60;
    const width = p.dimensions?.width || 50;
    const height = p.dimensions?.height || 40;
    const weight = p.dimensions?.weight || 120;
    const packageVolumeLiters = Math.round(((depth * width * height) / 1000000) * 100) / 100;

    return {
      id: p.id,
      sku: p.sku,
      title: p.title,
      barcode: p.barcode || `4607001${idx + 1000}`,
      category: p.category || 'Косметика и уход',
      warehouse: p.warehouse || 'Склад FBO Тула / Москва (Центр)',
      warehouseType: p.warehouseType || 'FBO',
      retailPrice: p.retailPrice,
      minPrice: p.min_price || p.retailPrice,
      marketingSellerPrice: p.taxPrice || Math.round(p.retailPrice * 0.9),
      oldPrice: p.oldRetailPrice,
      fboStock,
      fbsStock,
      reservedStock,
      inTransitStock,
      totalAvailableStock: totalAvailable,
      avgDailySales,
      daysOfSupply,
      status,
      volumeLiters: p.volumeLiters,
      packageVolumeLiters,
      dimensions: { depth, width, height, weight },
    };
  });

  return {
    ordersSummary: {
      period,
      totalOrders,
      ordersDeltaPercent: +12.4,
      totalUnitsOrdered,
      unitsOrderedDeltaPercent: +14.1,
      totalUnitsDelivered,
      redemptionRatePercent,
      redemptionRateDeltaPercent: +1.8,
      cancelledOrders,
      cancellationRatePercent,
      returnedUnits,
      returnRatePercent,
      avgOrderValue: avgCheck,
      avgOrderValueDeltaPercent: +3.2,
      grossRevenue,
      revenueDeltaPercent: +15.7,
      realizedRevenue,
      estimatedNetProfit,
      netProfitDeltaPercent: +18.9,
      avgMarginPercent,
      dailyDynamics,
    },
    topProducts,
    worstProducts,
    allPerformance: performanceItems,
    financeSummary,
    stockInventory,
  };
}
