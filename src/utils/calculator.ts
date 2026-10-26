import { MarketplacePreset, ProductUnitData, UnitEconomicsResult, TaxRegimeConfig } from '../types/unitEconomics';

export const MARKETPLACE_PRESETS: MarketplacePreset[] = [
  {
    id: 'ozon_beauty_tula',
    name: 'Ozon Красота (Тула/Москва)',
    description: 'Тариф магазина: до 300₽ (23% ком, лог 20-27₽), свыше 300₽ (52% ком, лог 76-89₽), налог 11%',
    commissionUnder300: 23,
    commissionOver300: 52,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    crossDockFixed: 1.63,
    fulfillmentFixed: 10,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
  },
  {
    id: 'ozon_standard',
    name: 'Ozon Стандарт (УСН 6%)',
    description: 'Стандартный FBO Ozon: комиссия 20%, логистика по литражу, УСН 6%',
    commissionUnder300: 20,
    commissionOver300: 24,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    crossDockFixed: 1.63,
    fulfillmentFixed: 10,
    forceMajeurePercent: 1.0,
    taxPercent: 6,
  },
  {
    id: 'wb_fbo',
    name: 'Wildberries FBO',
    description: 'Склад WB: комиссия 23%, базовая 55₽ + 15₽/доп.л, эквайринг 1.5%, налог 6%',
    commissionUnder300: 23,
    commissionOver300: 23,
    lastMilePercent: 0,
    acquiringPercent: 1.5,
    crossDockFixed: 0,
    fulfillmentFixed: 0,
    forceMajeurePercent: 1.0,
    taxPercent: 6,
  },
];

// ========================================================
// НАЛОГОВЫЕ ПРОФИЛИ РФ И РЕФОРМА НДС 2025/2026
// ========================================================
export const DEFAULT_TAX_CONFIG: TaxRegimeConfig = {
  system: 'usn_income',
  ratePercent: 11,
  entityType: 'ip',
  vatMode: 'exempt',
  vatRate: 0,
  vatIncludedInPrice: true,
  hasEmployees: false,
  annualRevenueBracket: 'under_60m',
  insuranceDeductionPercent: 0,
  notes: 'УСН «Доходы» 11% (Базовый профиль магазина)',
};

export const STANDARD_TAX_REGIMES: { id: string; name: string; config: TaxRegimeConfig; description: string }[] = [
  {
    id: 'usn_income_11',
    name: 'УСН «Доходы» 11% (Базовый профиль магазина)',
    config: {
      system: 'usn_income',
      ratePercent: 11,
      entityType: 'ip',
      vatMode: 'exempt',
      vatRate: 0,
      vatIncludedInPrice: true,
      hasEmployees: false,
      annualRevenueBracket: 'under_60m',
      insuranceDeductionPercent: 0,
    },
    description: 'УСН 11% от цены реализации со скидкой продавца',
  },
  {
    id: 'usn_income_6',
    name: 'УСН «Доходы» 6% (Стандарт РФ, доход до 60 млн ₽)',
    config: {
      system: 'usn_income',
      ratePercent: 6,
      entityType: 'ip',
      vatMode: 'exempt',
      vatRate: 0,
      vatIncludedInPrice: true,
      hasEmployees: false,
      annualRevenueBracket: 'under_60m',
      insuranceDeductionPercent: 0,
    },
    description: 'Стандартная ставка УСН 6%, освобождение от НДС по ст. 145 НК РФ',
  },
  {
    id: 'usn_income_expense_15',
    name: 'УСН «Доходы минус расходы» 15% (Мин. налог 1%)',
    config: {
      system: 'usn_income_expense',
      ratePercent: 15,
      entityType: 'ip',
      vatMode: 'exempt',
      vatRate: 0,
      vatIncludedInPrice: true,
      hasEmployees: false,
      annualRevenueBracket: 'under_60m',
      insuranceDeductionPercent: 0,
    },
    description: 'Налог 15% с разницы доходов и расходов (с контролем мин. налога 1% от выручки)',
  },
  {
    id: 'usn_2025_vat5',
    name: 'УСН 6% + НДС 5% (Реформа 2025: доход 60–250 млн ₽)',
    config: {
      system: 'usn_income',
      ratePercent: 6,
      entityType: 'ip',
      vatMode: 'special_5',
      vatRate: 5,
      vatIncludedInPrice: true,
      hasEmployees: false,
      annualRevenueBracket: '60m_to_250m',
      insuranceDeductionPercent: 0,
    },
    description: 'Реформа НДС 2025 г.: пониженная ставка 5% без вычета входящего налога + УСН 6%',
  },
  {
    id: 'usn_2025_vat7',
    name: 'УСН 6% + НДС 7% (Реформа 2025: доход 250–450 млн ₽)',
    config: {
      system: 'usn_income',
      ratePercent: 6,
      entityType: 'ip',
      vatMode: 'special_7',
      vatRate: 7,
      vatIncludedInPrice: true,
      hasEmployees: false,
      annualRevenueBracket: '250m_to_450m',
      insuranceDeductionPercent: 0,
    },
    description: 'Реформа НДС 2025 г.: пониженная ставка 7% без вычета входящего налога + УСН 6%',
  },
  {
    id: 'osno_20',
    name: 'ОСНО (Налог на прибыль 20% + НДС 20%)',
    config: {
      system: 'osno',
      ratePercent: 20,
      entityType: 'ooo',
      vatMode: 'standard_20',
      vatRate: 20,
      vatIncludedInPrice: true,
      hasEmployees: true,
      annualRevenueBracket: 'over_450m',
      insuranceDeductionPercent: 0,
    },
    description: 'Общая система: НДС 20% + налог на прибыль 20% от операционной маржи',
  },
  {
    id: 'ausn_8',
    name: 'АУСН «Доходы» 8% (Нулевые взносы)',
    config: {
      system: 'ausn',
      ratePercent: 8,
      entityType: 'ip',
      vatMode: 'exempt',
      vatRate: 0,
      vatIncludedInPrice: true,
      hasEmployees: false,
      annualRevenueBracket: 'under_60m',
      insuranceDeductionPercent: 0,
    },
    description: 'Автоматизированная упрощенная система 8%, нулевые страховые взносы',
  },
  {
    id: 'npd_self_employed',
    name: 'НПД (Самозанятый) 6%',
    config: {
      system: 'npd',
      ratePercent: 6,
      entityType: 'self_employed',
      vatMode: 'exempt',
      vatRate: 0,
      vatIncludedInPrice: true,
      hasEmployees: false,
      annualRevenueBracket: 'under_60m',
      insuranceDeductionPercent: 0,
    },
    description: 'Налог на профессиональный доход при продажах через маркетплейс (юрлицу) — 6%',
  },
];

export interface WarehouseOption {
  id: string;
  name: string;
  type: 'FBO' | 'FBS';
  clusterName: string;
  logisticsMultiplier: number; // e.g. 1.0 для Тула/Москва, 1.05 для СПб, 1.1 для Казани, 1.15 для FBS
  crossDockFixed: number; // 1.63 для FBO, 0 для FBS
  fulfillmentFixed: number; // 10 для FBO, 30 для FBS
  description: string;
}

export const DEFAULT_WAREHOUSE_NAME = 'Склад FBO Тула / Москва (Центр)';

export const STANDARD_WAREHOUSES: WarehouseOption[] = [
  {
    id: 'fbo_tula_moscow',
    name: 'Склад FBO Тула / Москва (Центр)',
    type: 'FBO',
    clusterName: 'Центр (Тула / Хоругвино / Грибки)',
    logisticsMultiplier: 1.0,
    crossDockFixed: 1.63,
    fulfillmentFixed: 10,
    description: 'Базовый эталонный кластер Ozon (Центральный федеральный округ)',
  },
  {
    id: 'fbo_spb',
    name: 'Склад FBO Санкт-Петербург (Северо-Запад)',
    type: 'FBO',
    clusterName: 'Северо-Запад (Шушары / Уткина Заводь)',
    logisticsMultiplier: 1.05,
    crossDockFixed: 1.8,
    fulfillmentFixed: 10,
    description: 'FBO поставки на Северо-Западный распределительный центр',
  },
  {
    id: 'fbo_kazan',
    name: 'Склад FBO Казань (Поволжье)',
    type: 'FBO',
    clusterName: 'Поволжье (Казань / Зеленодольск)',
    logisticsMultiplier: 1.1,
    crossDockFixed: 2.0,
    fulfillmentFixed: 10,
    description: 'FBO поставки на логистический хаб Поволжья',
  },
  {
    id: 'fbo_ekb',
    name: 'Склад FBO Екатеринбург (Урал)',
    type: 'FBO',
    clusterName: 'Урал (Екатеринбург)',
    logisticsMultiplier: 1.15,
    crossDockFixed: 2.2,
    fulfillmentFixed: 10,
    description: 'FBO поставки на Уральский распределительный центр',
  },
  {
    id: 'fbs_seller',
    name: 'Склад FBS продавца (Свой склад)',
    type: 'FBS',
    clusterName: 'FBS (Отгрузка через ПВЗ/СЦ Ozon)',
    logisticsMultiplier: 1.15,
    crossDockFixed: 0,
    fulfillmentFixed: 30, // Обработка отправления Ozon на СЦ
    description: 'Продажи со своего склада с доставкой силами Ozon Rocket',
  },
];

/**
 * Расчет базового тарифа логистики по литражу и цене продажи (до/свыше 300 ₽)
 * Полное соответствие тарифной сетке Ozon кластер Москва/Тула из листа Тарифы
 */
export function getLogisticsTariff(
  volumeLiters: number,
  retailPrice: number,
  warehouseClusterMultiplier: number = 1.0
): number {
  const isOver300 = retailPrice > 300;
  const vol = Math.max(0.001, volumeLiters);

  let base = 0;
  if (isOver300) {
    if (vol <= 0.20) base = 76;
    else if (vol <= 0.40) base = 84;
    else if (vol <= 0.60) base = 88;
    else if (vol <= 0.80) base = 88;
    else if (vol <= 1.00) base = 88;
    else if (vol <= 1.25) base = 89;
    else base = 89 + Math.max(0, vol - 1.25) * 15;
  } else {
    // До 300 ₽
    if (vol <= 0.20) base = 20;
    else if (vol <= 0.40) base = 22;
    else if (vol <= 0.60) base = 23;
    else if (vol <= 0.80) base = 23;
    else if (vol <= 1.00) base = 25;
    else if (vol <= 1.25) base = 27;
    else base = 27 + Math.max(0, vol - 1.25) * 10;
  }

  return Math.round(base * warehouseClusterMultiplier * 100) / 100;
}

/**
 * Точный расчет юнит-экономики по регламенту Ozon 2025/2026 и правилам налогообложения РФ
 */
export function calculateUnitEconomics(
  product: ProductUnitData,
  taxConfig?: TaxRegimeConfig
): UnitEconomicsResult {
  const retailPrice = Math.max(0, product.retailPrice || 0);
  const cogs = Math.max(0, product.cogs || 0);
  const volumeLiters = Math.max(0.01, product.volumeLiters || 0.1);
  const adSpendPercent = Math.max(0, product.adSpendPercent || 0);

  // 1. Тариф логистики (H)
  const baseLogisticsTariff = getLogisticsTariff(volumeLiters, retailPrice);

  // 2. Последняя миля (I = D * 4.9%)
  const lastMilePercent = product.lastMilePercent ?? 4.9;
  const lastMileRub = (retailPrice * lastMilePercent) / 100;

  // 3. Эквайринг (J = D * 1.5%)
  const acquiringPercent = product.acquiringPercent ?? 1.5;
  const acquiringRub = (retailPrice * acquiringPercent) / 100;

  // 4. Кросс-докинг (K = 1.63 ₽)
  const crossDockRub = product.crossDockFixed ?? 1.63;

  // 5. ДДВ и ЛП (L и M)
  const ddvRub = Math.max(0, product.ddvRub ?? 7.0);
  const lpRub = Math.max(0, product.lpRub ?? 0.1);

  // 6. Логистика ИТОГО (N = H + I + J + K + L + M)
  const totalLogisticsRub = baseLogisticsTariff + lastMileRub + acquiringRub + crossDockRub + ddvRub + lpRub;

  // 7. Комиссия Ozon (O = D * 23% если D<=300, D * 52% если D>300)
  const appliedCommissionPercent = retailPrice > 300
    ? (product.commissionOver300 ?? 52)
    : (product.commissionUnder300 ?? 23);
  const commissionRub = (retailPrice * appliedCommissionPercent) / 100;

  // 8. ФФ (Фулфилмент, P = 10 ₽)
  const fulfillmentRub = product.fulfillmentFixed ?? 10;

  // 9. Реклама (R = D * Q%)
  const adSpendRub = (retailPrice * adSpendPercent) / 100;

  // 10. Налогообложение (с поддержкой полной налоговой реформы РФ 2025/2026)
  // taxBasePrice: цена реализации со скидкой продавца (столбец E)
  const taxBasePrice = product.taxPrice && product.taxPrice > 0 ? product.taxPrice : retailPrice;
  
  let taxRub = 0;
  let taxRubBase = 0;
  let vatRub = 0;
  let taxSystemLabel = 'УСН «Доходы»';
  let taxExplanation = '';

  if (taxConfig) {
    // 10.1. Расчет НДС (реформа 2025/2026 при превышении порога 60 млн ₽)
    if (taxConfig.vatMode === 'special_5') {
      vatRub = taxConfig.vatIncludedInPrice ? (retailPrice * 5) / 105 : (retailPrice * 0.05);
      taxExplanation += 'НДС 5% (Реформа 2025: доход 60–250 млн ₽). ';
    } else if (taxConfig.vatMode === 'special_7') {
      vatRub = taxConfig.vatIncludedInPrice ? (retailPrice * 7) / 107 : (retailPrice * 0.07);
      taxExplanation += 'НДС 7% (Реформа 2025: доход 250–450 млн ₽). ';
    } else if (taxConfig.vatMode === 'standard_20') {
      vatRub = taxConfig.vatIncludedInPrice ? (retailPrice * 20) / 120 : (retailPrice * 0.20);
      taxExplanation += 'НДС 20% (Общий режим). ';
    } else if (taxConfig.vatMode === 'preferential_10') {
      vatRub = taxConfig.vatIncludedInPrice ? (retailPrice * 10) / 110 : (retailPrice * 0.10);
      taxExplanation += 'НДС 10% (Льготная ставка). ';
    }

    vatRub = Math.round(vatRub * 100) / 100;
    const priceNetOfVat = Math.max(0, retailPrice - vatRub);

    // 10.2. Расчет налога по выбранной системе
    switch (taxConfig.system) {
      case 'usn_income': {
        taxSystemLabel = `УСН «Доходы» ${taxConfig.ratePercent}%`;
        taxRubBase = (taxBasePrice * taxConfig.ratePercent) / 100;
        taxExplanation += `Налог ${taxRubBase.toFixed(1)} ₽ (${taxConfig.ratePercent}% от базы реализации ${taxBasePrice} ₽)`;
        break;
      }
      case 'usn_income_expense': {
        taxSystemLabel = `УСН «Доходы минус расходы» ${taxConfig.ratePercent}%`;
        const directExpenses = cogs + totalLogisticsRub + commissionRub + fulfillmentRub + adSpendRub;
        const profitBeforeTax = Math.max(0, taxBasePrice - directExpenses);
        const standardTax = (profitBeforeTax * taxConfig.ratePercent) / 100;
        const minTax = taxBasePrice * 0.01; // ст. 346.18 НК РФ: минимальный налог 1% от доходов
        taxRubBase = Math.max(minTax, standardTax);
        taxExplanation += standardTax < minTax
          ? `Применен минимальный налог 1% (${minTax.toFixed(1)} ₽)`
          : `Налог ${taxRubBase.toFixed(1)} ₽ (${taxConfig.ratePercent}% от разницы доходов и расходов)`;
        break;
      }
      case 'osno': {
        taxSystemLabel = 'ОСНО (Налог на прибыль 20% + НДС)';
        const directExpenses = cogs + totalLogisticsRub + commissionRub + fulfillmentRub + adSpendRub;
        const taxableProfit = Math.max(0, priceNetOfVat - directExpenses);
        taxRubBase = (taxableProfit * (taxConfig.ratePercent || 20)) / 100;
        taxExplanation += `Налог на прибыль 20% (${taxRubBase.toFixed(1)} ₽) + НДС (${vatRub.toFixed(1)} ₽)`;
        break;
      }
      case 'ausn': {
        taxSystemLabel = `АУСН ${taxConfig.ratePercent}%`;
        taxRubBase = (taxBasePrice * taxConfig.ratePercent) / 100;
        taxExplanation += `АУСН ${taxConfig.ratePercent}% (нулевые страховые взносы)`;
        break;
      }
      case 'npd': {
        taxSystemLabel = 'НПД (Самозанятый) 6%';
        taxRubBase = (retailPrice * 0.06);
        taxExplanation += 'НПД 6% при продаже юридическим лицам маркетплейса';
        break;
      }
      default: {
        taxSystemLabel = `УСН ${taxConfig.ratePercent}%`;
        taxRubBase = (taxBasePrice * taxConfig.ratePercent) / 100;
      }
    }

    taxRub = Math.round((taxRubBase + vatRub) * 100) / 100;
  } else {
    // Режим по умолчанию / обратная совместимость
    const taxPercent = product.taxPercent ?? 11;
    taxRub = Math.round(((taxBasePrice * taxPercent) / 100) * 100) / 100;
    taxRubBase = taxRub;
    taxSystemLabel = `УСН «Доходы» ${taxPercent}%`;
    taxExplanation = `УСН ${taxPercent}% от цены реализации со скидкой продавца`;
  }

  // 11. Форс-мажор 1% (T = D * 1%)
  const forceMajeurePercent = product.forceMajeurePercent ?? 1.0;
  const forceMajeureRub = (retailPrice * forceMajeurePercent) / 100;

  // 12. ИТОГО расходов (U = N + O + P + R + S + T + F)
  const totalExpensesRub = totalLogisticsRub + commissionRub + fulfillmentRub + adSpendRub + taxRub + forceMajeureRub + cogs;

  // 13. ПРИБЫЛЬ ед (V = D - U)
  const netProfitPerUnit = retailPrice - totalExpensesRub;

  // 14. Метрики рентабельности
  const roiPercent = cogs > 0 ? (netProfitPerUnit / cogs) * 100 : 0;
  const marginPercent = retailPrice > 0 ? (netProfitPerUnit / retailPrice) * 100 : 0;
  const drrPercent = adSpendPercent;

  // 15. Точка безубыточности (Минимальная цена, при которой Прибыль = 0)
  // P - [Fixed + P * Var%] = 0 => P = Fixed / (1 - Var%)
  const effectiveTaxPercent = taxBasePrice > 0 ? (taxRub / retailPrice) * 100 : 0;
  const fixedExpenses = baseLogisticsTariff + crossDockRub + ddvRub + lpRub + fulfillmentRub + cogs;
  const variablePercent = lastMilePercent + acquiringPercent + appliedCommissionPercent + adSpendPercent + effectiveTaxPercent + forceMajeurePercent;
  
  let breakEvenPrice = 0;
  if (variablePercent < 98) {
    breakEvenPrice = fixedExpenses / (1 - variablePercent / 100);
  } else {
    breakEvenPrice = fixedExpenses * 2;
  }

  // 16. Максимально допустимый % рекламы (до ухода в убыток)
  const profitBeforeAds = netProfitPerUnit + adSpendRub;
  const maxAllowableAdPercent = retailPrice > 0 ? (profitBeforeAds / retailPrice) * 100 : 0;

  // 17. Максимальная скидка от текущей цены до точки безубыточности
  const maxDiscountPercent = retailPrice > breakEvenPrice && retailPrice > 0
    ? ((retailPrice - breakEvenPrice) / retailPrice) * 100
    : 0;

  // Месячные показатели
  const units = Math.max(0, product.plannedSalesUnits || 100);
  const monthlyRevenue = retailPrice * units;
  const monthlyTotalExpenses = totalExpensesRub * units;
  const monthlyNetProfit = netProfitPerUnit * units;

  let status: 'profitable' | 'marginal' | 'loss' = 'profitable';
  if (netProfitPerUnit < 0) {
    status = 'loss';
  } else if (marginPercent < 10) {
    status = 'marginal';
  }

  const warehouse = product.warehouse || DEFAULT_WAREHOUSE_NAME;
  const warehouseType: 'FBO' | 'FBS' = product.warehouseType || 'FBO';

  return {
    retailPrice,
    taxPrice: taxBasePrice,
    cogs,
    volumeLiters,
    adSpendPercent,
    warehouse,
    warehouseType,
    baseLogisticsTariff,
    lastMileRub,
    acquiringRub,
    crossDockRub,
    ddvRub,
    lpRub,
    totalLogisticsRub,
    appliedCommissionPercent,
    commissionRub,
    fulfillmentRub,
    adSpendRub,
    taxRub,
    forceMajeureRub,
    totalExpensesRub,
    netProfitPerUnit,
    roiPercent,
    marginPercent,
    drrPercent,
    breakEvenPrice,
    maxAllowableAdPercent,
    maxDiscountPercent,
    monthlyRevenue,
    monthlyTotalExpenses,
    monthlyNetProfit,
    taxSystemLabel,
    taxRubBase,
    vatRub,
    taxExplanation,
    status,
  };
}

/**
 * Точный каталог товаров из присланного пользователем файла:
 * unit_economy_Dai_774_mond_oktyabr_33__33.xlsx
 */
export const INITIAL_PRODUCTS: ProductUnitData[] = [
  {
    id: 'ozn_1',
    sku: 'OZN3493060723',
    title: 'Китайская чудо мазь зеленая',
    category: 'Красота и здоровье',
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: 240,
    taxPrice: 216,
    cogs: 40,
    volumeLiters: 0.29,
    dimensions: { depth: 100, width: 80, height: 36, weight: 120, unit: 'мм' },
    adSpendPercent: 16,
    fulfillmentFixed: 10,
    ddvRub: 7.91,
    lpRub: 0.14,
    crossDockFixed: 1.63,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    commissionUnder300: 23,
    commissionOver300: 52,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
    plannedSalesUnits: 300,
    notes: 'Хит продаж. Склад FBO Тула/Москва. Логистика: 22₽ + миля + эквайринг + ДДВ',
  },
  {
    id: 'ozn_2',
    sku: 'OZN4497059559',
    title: 'Тушь Hyper Curl',
    category: 'Декоративная косметика',
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: 275,
    taxPrice: 228,
    cogs: 50,
    volumeLiters: 0.10,
    dimensions: { depth: 120, width: 25, height: 25, weight: 45, unit: 'мм' },
    adSpendPercent: 16,
    fulfillmentFixed: 10,
    ddvRub: 6.95,
    lpRub: 0.04,
    crossDockFixed: 1.63,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    commissionUnder300: 23,
    commissionOver300: 52,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
    plannedSalesUnits: 250,
    notes: 'Литраж 0.1л: минимальный тариф логистики 20₽',
  },
  {
    id: 'ozn_3',
    sku: 'OZN3492926989',
    title: 'Крем роллер Sadoer золотой',
    category: 'Уход за кожей',
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: 280,
    taxPrice: 228,
    cogs: 63,
    volumeLiters: 0.18,
    dimensions: { depth: 80, width: 50, height: 45, weight: 90, unit: 'мм' },
    adSpendPercent: 10,
    fulfillmentFixed: 10,
    ddvRub: 8.36,
    lpRub: 0.13,
    crossDockFixed: 1.63,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    commissionUnder300: 23,
    commissionOver300: 52,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
    plannedSalesUnits: 150,
    notes: 'Низкий процент рекламы (10%), хорошая маржа',
  },
  {
    id: 'ozn_4',
    sku: 'OZN4664730833',
    title: 'Чудо мазь от кожных заболеваний серебро',
    category: 'Аптека и здоровье',
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: 272,
    taxPrice: 228,
    cogs: 45,
    volumeLiters: 0.06,
    dimensions: { depth: 50, width: 40, height: 30, weight: 35, unit: 'мм' },
    adSpendPercent: 18,
    fulfillmentFixed: 10,
    ddvRub: 8.13,
    lpRub: 0.11,
    crossDockFixed: 1.63,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    commissionUnder300: 23,
    commissionOver300: 52,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
    plannedSalesUnits: 200,
    notes: 'Компактный объем 0.06 л',
  },
  {
    id: 'ozn_5',
    sku: 'OZN4884368183',
    title: 'Крем от геморроя Sumifun голубой',
    category: 'Аптека и здоровье',
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: 253,
    taxPrice: 212,
    cogs: 43,
    volumeLiters: 0.06,
    dimensions: { depth: 50, width: 40, height: 30, weight: 35, unit: 'мм' },
    adSpendPercent: 18,
    fulfillmentFixed: 10,
    ddvRub: 7.33,
    lpRub: 0.06,
    crossDockFixed: 1.63,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    commissionUnder300: 23,
    commissionOver300: 52,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
    plannedSalesUnits: 180,
    notes: 'Стабильные повторные покупки',
  },
  {
    id: 'ozn_6',
    sku: 'OZN4884063931',
    title: 'Крем от экземы, псориаза SumiFun',
    category: 'Аптека и здоровье',
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: 230,
    taxPrice: 193,
    cogs: 40.8,
    volumeLiters: 0.13,
    dimensions: { depth: 65, width: 45, height: 45, weight: 50, unit: 'мм' },
    adSpendPercent: 18,
    fulfillmentFixed: 10,
    ddvRub: 7.51,
    lpRub: 0.08,
    crossDockFixed: 1.63,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    commissionUnder300: 23,
    commissionOver300: 52,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
    plannedSalesUnits: 120,
    notes: 'Низкая розничная цена 230 ₽',
  },
  {
    id: 'ozn_7',
    sku: 'OZN4946011280',
    title: 'Мазь тигр банка',
    category: 'Бальзамы и мази',
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: 260,
    taxPrice: 218,
    cogs: 51,
    volumeLiters: 0.13,
    dimensions: { depth: 55, width: 55, height: 40, weight: 60, unit: 'мм' },
    adSpendPercent: 18,
    fulfillmentFixed: 10,
    ddvRub: 8.09,
    lpRub: 0.21,
    crossDockFixed: 1.63,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    commissionUnder300: 23,
    commissionOver300: 52,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
    plannedSalesUnits: 160,
    notes: 'Круглая металлическая баночка',
  },
  {
    id: 'ozn_8',
    sku: 'OZN5134257136',
    title: 'Мазь варикоз синий',
    category: 'Уход для ног',
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: 245,
    taxPrice: 206,
    cogs: 45,
    volumeLiters: 0.13,
    dimensions: { depth: 65, width: 45, height: 45, weight: 55, unit: 'мм' },
    adSpendPercent: 20,
    fulfillmentFixed: 10,
    ddvRub: 7.89,
    lpRub: 0.14,
    crossDockFixed: 1.63,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    commissionUnder300: 23,
    commissionOver300: 52,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
    plannedSalesUnits: 140,
    notes: 'Высокий ДРР 20%, маржа 5.8%',
  },
  {
    id: 'ozn_9',
    sku: 'OZN5894678582',
    title: 'Стик для шеи Sadoer фиолетовый',
    category: 'Уход за лицом',
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: 265,
    taxPrice: 254,
    cogs: 55,
    volumeLiters: 0.02,
    dimensions: { depth: 40, width: 25, height: 20, weight: 25, unit: 'мм' },
    adSpendPercent: 20,
    fulfillmentFixed: 10,
    ddvRub: 4.47,
    lpRub: 0,
    crossDockFixed: 1.63,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    commissionUnder300: 23,
    commissionOver300: 52,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
    plannedSalesUnits: 80,
    notes: 'Микро-литраж 0.02 л',
  },
  {
    id: 'ozn_10',
    sku: 'OZN5691715887',
    title: 'Тушь Еnergizer',
    category: 'Декоративная косметика',
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: 288,
    taxPrice: 238,
    cogs: 55,
    volumeLiters: 0.07,
    dimensions: { depth: 110, width: 25, height: 25, weight: 40, unit: 'мм' },
    adSpendPercent: 16,
    fulfillmentFixed: 10,
    ddvRub: 6.35,
    lpRub: 0.10,
    crossDockFixed: 1.63,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    commissionUnder300: 23,
    commissionOver300: 52,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
    plannedSalesUnits: 150,
    notes: 'Прибыль 35.10 ₽ на штуку',
  },
  {
    id: 'ozn_11',
    sku: 'OZN5716237224',
    title: 'Мазь от геморроя зеленая',
    category: 'Аптека и здоровье',
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: 275,
    taxPrice: 230,
    cogs: 44,
    volumeLiters: 0.07,
    dimensions: { depth: 60, width: 35, height: 35, weight: 45, unit: 'мм' },
    adSpendPercent: 16,
    fulfillmentFixed: 10,
    ddvRub: 7.21,
    lpRub: 0.10,
    crossDockFixed: 1.63,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    commissionUnder300: 23,
    commissionOver300: 52,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
    plannedSalesUnits: 170,
    notes: 'Прибыль 32.16 ₽ на штуку',
  },
];

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
