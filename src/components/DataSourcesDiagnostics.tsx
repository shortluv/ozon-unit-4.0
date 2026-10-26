import React, { useState } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Database,
  Layers,
  FileSpreadsheet,
  Cpu,
  Info,
  ExternalLink,
  Search,
  Lock,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { getSavedOzonCredentials, testOzonConnection, OzonCredentials } from '../services/ozonApi';
import { designTokens } from '../styles/designTokens';

interface MetricAuditItem {
  id: string;
  name: string;
  category: 'finance' | 'sales' | 'catalog' | 'tariffs';
  fileAndFunction: string;
  sourceMethod: string;
  fieldsUsed: string;
  formula: string;
  dataOrigin: 'api' | 'calculated' | 'manual' | 'excel' | 'demo';
  status: 'verified' | 'calculated' | 'manual_input' | 'unavailable_in_seller_api';
  limitationNote: string;
}

export const TECHNICAL_METRIC_MAP: MetricAuditItem[] = [
  {
    id: 'retail_price',
    name: 'Предельная розничная цена (min_price)',
    category: 'catalog',
    fileAndFunction: 'ozonApi.ts -> fetchLiveOzonProducts()',
    sourceMethod: 'POST /v5/product/info/prices (fallback /v4)',
    fieldsUsed: 'price.min_price -> fallback price.price',
    formula: 'min_price > 0 ? min_price : price.price',
    dataOrigin: 'api',
    status: 'verified',
    limitationNote: 'Извлекается из официального метода /v5. Если min_price не задан в Ozon, безопасно используется базовая цена продавца.',
  },
  {
    id: 'tax_price',
    name: 'Цена реализации (база налога УСН 11%)',
    category: 'finance',
    fileAndFunction: 'ozonApi.ts -> fetchLiveOzonProducts()',
    sourceMethod: 'POST /v5/product/info/prices + POST /v2/finance/realization',
    fieldsUsed: 'price.marketing_seller_price или seller_price_per_instance',
    formula: 'taxBasePrice = marketing_seller_price || retailPrice',
    dataOrigin: 'api',
    status: 'verified',
    limitationNote: 'Устаревший параметр marketing_price удален Ozon. Используется marketing_seller_price со скидкой продавца.',
  },
  {
    id: 'volume_liters',
    name: 'Литраж товара (содержимое vs логистика)',
    category: 'catalog',
    fileAndFunction: 'ozonApi.ts -> extractContentVolumeFromItem()',
    sourceMethod: 'POST /v4/product/info/attributes + POST /v2/product/info/list',
    fieldsUsed: 'attributes[4389, 4383].values[0].value, depth, width, height',
    formula: 'parseVolumeText("50 мл") -> 0.05 л; Упаковка: (D×W×H)/1000000',
    dataOrigin: 'api',
    status: 'verified',
    limitationNote: 'Нормализует единицы (мл, л, г). Физические габариты упаковки и литраж содержимого сохраняются отдельно.',
  },
  {
    id: 'drr_advertising',
    name: 'ДРР (Доля рекламных расходов)',
    category: 'finance',
    fileAndFunction: 'ozonApi.ts / calculator.ts -> calculateUnitEconomics()',
    sourceMethod: 'Ozon Performance API (отдельный контур OAuth2)',
    fieldsUsed: 'product.adSpendPercent (ввод селлера)',
    formula: 'adSpendRub = retailPrice * (adSpendPercent / 100)',
    dataOrigin: 'manual',
    status: 'unavailable_in_seller_api',
    limitationNote: 'В Ozon Seller API с ключом Admin Read Only потоварный ДРР официально отсутствует. Ведется в Performance API по OAuth2. Задается селлером.',
  },
  {
    id: 'gross_revenue',
    name: 'Выручка магазина',
    category: 'finance',
    fileAndFunction: 'analyticsService.ts -> generateStoreAnalytics()',
    sourceMethod: 'Расчет по каталогу + отчет реализации /v2/finance/realization',
    fieldsUsed: 'retailPrice, unitsSold, seller_price_per_instance',
    formula: 'GrossRevenue = SUM(retailPrice * unitsSold)',
    dataOrigin: 'calculated',
    status: 'calculated',
    limitationNote: 'Показывает валовые начисления. Не путать с чистой суммой к выплате после удержаний Ozon.',
  },
  {
    id: 'net_profit',
    name: 'Чистая прибыль (EBIT)',
    category: 'finance',
    fileAndFunction: 'calculator.ts -> calculateUnitEconomics()',
    sourceMethod: 'Формула юнит-экономики Ozon 2025/2026',
    fieldsUsed: 'retailPrice, totalExpensesRub, cogs, commissions, logistics',
    formula: 'netProfitPerUnit = retailPrice - totalExpensesRub; Monthly = Net * Units',
    dataOrigin: 'calculated',
    status: 'calculated',
    limitationNote: 'Учитывает все 12 регламентных статей расходов Ozon, закупку COGS и налог УСН 11%.',
  },
  {
    id: 'margin_percent',
    name: 'Чистая маржинальность %',
    category: 'finance',
    fileAndFunction: 'calculator.ts -> calculateUnitEconomics()',
    sourceMethod: 'Формула рентабельности продаж',
    fieldsUsed: 'netProfitPerUnit, retailPrice',
    formula: 'marginPercent = (netProfitPerUnit / retailPrice) * 100',
    dataOrigin: 'calculated',
    status: 'calculated',
    limitationNote: 'Определяет фактическую маржу с единицы товара. Ниже 0% — товар генерирует убыток.',
  },
  {
    id: 'orders_count',
    name: 'Заказы покупателей',
    category: 'sales',
    fileAndFunction: 'analyticsService.ts / POST /v3/posting/fbs/list',
    sourceMethod: 'POST /v3/posting/fbs/list + POST /v2/posting/fbo/list',
    fieldsUsed: 'posting_number, in_process_at, status, products',
    formula: 'Количество уникальных оформленных корзин покупателей',
    dataOrigin: 'api',
    status: 'verified',
    limitationNote: 'Строго отделено от отгрузок со склада, выкупов и финансовых строк реализации.',
  },
  {
    id: 'redemptions_rate',
    name: 'Выкуп товаров (Redemptions %)',
    category: 'sales',
    fileAndFunction: 'analyticsService.ts -> generateStoreAnalytics()',
    sourceMethod: 'Статусы отправлений: status == "delivered"',
    fieldsUsed: 'delivered_units / total_ordered_units',
    formula: 'RedemptionRate = (totalUnitsDelivered / totalUnitsOrdered) * 100',
    dataOrigin: 'calculated',
    status: 'calculated',
    limitationNote: 'Отражает долю отправлений, фактически врученных покупателю в ПВЗ / курьером.',
  },
  {
    id: 'avg_order_value',
    name: 'Средний чек (AOV)',
    category: 'sales',
    fileAndFunction: 'analyticsService.ts -> generateStoreAnalytics()',
    sourceMethod: 'Сводные данные заказов',
    fieldsUsed: 'grossRevenue, totalOrders',
    formula: 'AOV = grossRevenue / totalOrders',
    dataOrigin: 'calculated',
    status: 'calculated',
    limitationNote: 'Средняя стоимость одной оформленной корзины покупателя.',
  },
  {
    id: 'logistics_expenses',
    name: 'Логистические расходы Ozon FBO',
    category: 'finance',
    fileAndFunction: 'calculator.ts -> getLogisticsTariff()',
    sourceMethod: 'Тарифная сетка Ozon FBO по литражу упаковки 2025/2026',
    fieldsUsed: 'volumeLiters, retailPrice, warehouseType, clusterMultiplier',
    formula: 'Базовый тариф + ФФ 10₽ + Миля 4.9% + Кросс-док 1.63₽ + ДДВ 7₽',
    dataOrigin: 'calculated',
    status: 'calculated',
    limitationNote: 'До 300 ₽ действует льготная логистика (20–27 ₽). Свыше 300 ₽ — стандартная сетка от 43.5 ₽.',
  },
  {
    id: 'tariffs_300_cliff',
    name: 'Ступень тарифов 300 ₽ (23% / 52%)',
    category: 'tariffs',
    fileAndFunction: 'calculator.ts -> calculateUnitEconomics()',
    sourceMethod: 'Регламент тарифов Ozon для категории Красота (Кластер Центр)',
    fieldsUsed: 'commissionUnder300 (23%), commissionOver300 (52%)',
    formula: 'retailPrice <= 300 ? 23% : 52%',
    dataOrigin: 'excel',
    status: 'verified',
    limitationNote: 'Критический порог: подъем цены с 300 ₽ до 305 ₽ снижает чистую прибыль из-за скачка комиссии на +29%.',
  },
  {
    id: 'stocks_fbo_fbs',
    name: 'Складские остатки и оборачиваемость',
    category: 'catalog',
    fileAndFunction: 'ozonApi.ts / analyticsService.ts',
    sourceMethod: 'POST /v3/product/info/stocks + POST /v1/warehouse/list',
    fieldsUsed: 'stocks[type="fbo"].present, stocks[type="fbs"].present',
    formula: 'DaysOfSupply = totalAvailableStock / avgDailySales',
    dataOrigin: 'api',
    status: 'verified',
    limitationNote: 'Показывает остаток на складах Ozon и складе продавца. Предупреждает об Out-of-Stock за 14 дней.',
  },
];

export const DataSourcesDiagnostics: React.FC<{ onOpenOzonSync: () => void }> = ({
  onOpenOzonSync,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const creds = getSavedOzonCredentials();
  const isConnected = Boolean(creds?.clientId && creds?.apiKey);

  const handleTestConnection = async () => {
    if (!isConnected || !creds) {
      setTestResult('Ключи API не сохранены. Нажмите «Синхронизация API», чтобы ввести Client-Id и Api-Key.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testOzonConnection(creds);
      setTestResult(res.message);
    } catch (e) {
      setTestResult(`Ошибка проверки соединения: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsTesting(false);
    }
  };

  const filteredMetrics = TECHNICAL_METRIC_MAP.filter((m) => {
    if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
    if (
      search &&
      !m.name.toLowerCase().includes(search.toLowerCase()) &&
      !m.sourceMethod.toLowerCase().includes(search.toLowerCase()) &&
      !m.fileAndFunction.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Верхний статус источников данных */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Диагностика источников и аудит аналитики Ozon
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    isConnected
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                  }`}
                >
                  {isConnected ? 'API ПОДКЛЮЧЕН' : 'ДЕМО-КАТАЛОГ'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Техническая карта формирования каждого KPI, статус официальных методов API и прозрачность происхождения данных
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/[0.08] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-emerald-500' : ''}`} />
              <span>Тест связи с Ozon</span>
            </button>
            <button
              onClick={onOpenOzonSync}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
            >
              Настройки ключей
            </button>
          </div>
        </div>

        {testResult && (
          <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 animate-in fade-in">
            <Info className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{testResult}</span>
          </div>
        )}
      </div>

      {/* 2. Сетка статуса 4 источников данных */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Источник 1: Ozon Seller API */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Ozon Seller API
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                v5 / v4 / v3
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Цены min_price, маркетинг продавца, характеристики, литраж, склады FBO.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.05] text-[10px] font-mono flex justify-between text-slate-400">
            <span>Роль ключа:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Admin Read Only</span>
          </div>
        </div>

        {/* Источник 2: Ozon Performance API */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Ozon Performance
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
                OAuth2 отдельный
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Рекламные кампании и фактический ДРР. В Seller API недоступны, задаются селлером.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.05] text-[10px] font-mono flex justify-between text-slate-400">
            <span>Статус:</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">План селлера</span>
          </div>
        </div>

        {/* Источник 3: Движок Excel формул */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Excel XLSX Движок
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300">
                Formula Live
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Экспорт и импорт с формулами IF, SUM, ROUND, AVERAGE, форматированием ячеек.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.05] text-[10px] font-mono flex justify-between text-slate-400">
            <span>Формулы:</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">Активны</span>
          </div>
        </div>

        {/* Источник 4: Регламент юнит-экономики */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Регламент Ozon 2026
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                УСН 11% / FBO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Ступень комиссии 300 ₽ (23% / 52%), шкала логистики от 0.1 л, налог от колонки E.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.05] text-[10px] font-mono flex justify-between text-slate-400">
            <span>Тарифная сетка:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Синхронизирована</span>
          </div>
        </div>
      </div>

      {/* 3. Техническая карта всех показателей (Технический аудит Этапа 6) */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Техническая карта 13 ключевых метрик аналитики
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Точный путь формирования, используемые поля API, математические формулы и ограничения
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 dark:bg-white/[0.05] p-0.5 rounded-lg border border-slate-200 dark:border-white/[0.08] text-xs">
              {(['all', 'finance', 'sales', 'catalog', 'tariffs'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-white dark:bg-[#1a233b] text-slate-900 dark:text-white shadow-sm font-medium'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  {cat === 'all'
                    ? 'Все'
                    : cat === 'finance'
                    ? 'Финансы'
                    : cat === 'sales'
                    ? 'Продажи'
                    : cat === 'catalog'
                    ? 'Каталог'
                    : 'Тарифы'}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск по метрике или методу API..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-56"
              />
            </div>
          </div>
        </div>

        {/* Таблица аудита метрик */}
        <div className="overflow-x-auto border border-slate-200 dark:border-white/[0.08] rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 font-mono text-[11px] border-b border-slate-200 dark:border-white/[0.08]">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Показатель</th>
                <th className="py-2.5 px-3 font-semibold">Метод API / Источник</th>
                <th className="py-2.5 px-3 font-semibold">Поля ответа & Формула</th>
                <th className="py-2.5 px-3 font-semibold text-center">Происхождение</th>
                <th className="py-2.5 px-3 font-semibold">Ограничения & Особенности</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
              {filteredMetrics.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{m.name}</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">{m.fileAndFunction}</div>
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.05] px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/[0.06]">
                      {m.sourceMethod}
                    </span>
                  </td>

                  <td className="py-3 px-3 max-w-xs">
                    <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                      {m.fieldsUsed}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={m.formula}>
                      f(x): {m.formula}
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        m.dataOrigin === 'api'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25'
                          : m.dataOrigin === 'calculated'
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25'
                          : m.dataOrigin === 'excel'
                          ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/25'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25'
                      }`}
                    >
                      {m.dataOrigin === 'api'
                        ? 'Ozon API'
                        : m.dataOrigin === 'calculated'
                        ? 'Расчет ЮЭ'
                        : m.dataOrigin === 'excel'
                        ? 'Тариф Ozon'
                        : 'Ввод селлера'}
                    </span>
                  </td>

                  <td className="py-3 px-3 max-w-sm text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {m.limitationNote}
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
