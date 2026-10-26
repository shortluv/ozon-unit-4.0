import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Receipt,
  Truck,
  Layers,
  ShieldCheck,
  AlertCircle,
  Download,
  HelpCircle,
  FileSpreadsheet,
  PieChart,
} from 'lucide-react';
import { ProductUnitData } from '../types/unitEconomics';
import { generateStoreAnalytics } from '../services/analyticsService';

interface FinanceAnalyticsProps {
  products: ProductUnitData[];
  onExport: () => void;
  onOpenOzonSync: () => void;
  isOzonConnected?: boolean;
}

export const FinanceAnalytics: React.FC<FinanceAnalyticsProps> = ({
  products,
  onExport,
  onOpenOzonSync,
  isOzonConnected = false,
}) => {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const analytics = useMemo(() => {
    return generateStoreAnalytics(products, period);
  }, [products, period]);

  const { financeSummary } = analytics;

  // Если каталог пуст
  if (products.length === 0) {
    return (
      <div className="p-8 text-center space-y-4 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08]">
        <Receipt className="w-12 h-12 text-slate-400 mx-auto" />
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Финансовые данные Ozon еще не загружены
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Подключите ваш магазин Ozon Seller API или загрузите каталог товаров для автоматического построения P&L отчета и маржинальности.
        </p>
        <button
          onClick={onOpenOzonSync}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
        >
          Подключить Ozon API
        </button>
      </div>
    );
  }

  // Чистая выплата Ozon на расчетный счет селлера
  const totalOzonDeductions =
    financeSummary.marketplaceCommissions.total +
    financeSummary.logisticsExpenses.total +
    financeSummary.otherDeductions.total;
  const netPayoutFromOzon = Math.max(0, financeSummary.accrualsRevenue - totalOzonDeductions);

  return (
    <div className="space-y-6">
      {/* 1. Верхний информационный блок: разделение факта Ozon и расчетов */}
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                Финансовый отчет и P&L структура маржинальности Ozon
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Строгое разграничение: <strong>[Факт Ozon]</strong> (начисления покупателей, комиссии и логистика), <strong>[Выплата на р/с]</strong> (взаиморасчеты с Ozon), <strong>[Ввод селлера]</strong> (закупка COGS и ДРР) и <strong>[Расчет ЮЭ]</strong> (чистая прибыль бизнеса).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-white dark:bg-white/[0.05] p-1 rounded-lg border border-slate-200 dark:border-white/[0.08]">
              {(['7d', '30d', '90d'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    period === p
                      ? 'bg-slate-100 dark:bg-[#1a233b] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {p === '7d' ? '7 дней' : p === '30d' ? '30 дней' : '90 дней'}
                </button>
              ))}
            </div>

            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Выгрузить P&L</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Четыре ключевые финансовые агрегации */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Карточка 1: Начисления покупателей */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              1. Начисления Ozon (Вал)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Факт Ozon
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">
            {financeSummary.accrualsRevenue.toLocaleString('ru-RU')} ₽
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 space-y-1 border-t border-slate-100 dark:border-white/[0.05] pt-2">
            <div className="flex justify-between">
              <span>Реализация (по отчету):</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {financeSummary.realizationRevenue.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Сумма покупок клиентами:</span>
              <span className="font-mono">Включая СПП Ozon</span>
            </div>
          </div>
        </div>

        {/* Карточка 2: Совокупные удержания Ozon */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              2. Удержания Ozon
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              Факт Ozon
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-2">
            -{totalOzonDeductions.toLocaleString('ru-RU')} ₽
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 space-y-1 border-t border-slate-100 dark:border-white/[0.05] pt-2">
            <div className="flex justify-between">
              <span>Комиссии маркетплейса:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {financeSummary.marketplaceCommissions.total.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <div className="flex justify-between">
              <span>Логистика и доставка:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {financeSummary.logisticsExpenses.total.toLocaleString('ru-RU')} ₽
              </span>
            </div>
          </div>
        </div>

        {/* Карточка 3: Чистая выплата на расчетный счет */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              3. Выплата на р/с селлера
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Выплата Ozon
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-2">
            +{netPayoutFromOzon.toLocaleString('ru-RU')} ₽
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 space-y-1 border-t border-slate-100 dark:border-white/[0.05] pt-2">
            <div className="flex justify-between">
              <span>Доля от начислений:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {financeSummary.accrualsRevenue > 0
                  ? ((netPayoutFromOzon / financeSummary.accrualsRevenue) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Начислено минус удержано Ozon</span>
            </div>
          </div>
        </div>

        {/* Карточка 4: Чистый финансовый результат бизнеса */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              4. Чистая прибыль (Net)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Расчет ЮЭ
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            +{financeSummary.netProfit.toLocaleString('ru-RU')} ₽
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 space-y-1 border-t border-slate-100 dark:border-white/[0.05] pt-2">
            <div className="flex justify-between">
              <span>Маржинальность чистая:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {financeSummary.netMarginPercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Рентабельность (ROI):</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {financeSummary.roiPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Детализированная таблица P&L калькуляции */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Левая колонка: Детализация комиссий и логистики Ozon */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.05] pb-3">
            <Receipt className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Структура комиссий Ozon (Ступени 300 ₽ и эквайринг)
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-white/[0.02]">
              <span className="text-slate-600 dark:text-slate-400">
                Комиссия за товары до 300 ₽ (льготная ставка 23%):
              </span>
              <span className="font-mono font-medium text-slate-900 dark:text-white">
                {financeSummary.marketplaceCommissions.under300.toLocaleString('ru-RU')} ₽
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-white/[0.02]">
              <span className="text-slate-600 dark:text-slate-400">
                Комиссия за товары свыше 300 ₽ (базовая ставка 52%):
              </span>
              <span className="font-mono font-medium text-slate-900 dark:text-white">
                {financeSummary.marketplaceCommissions.over300.toLocaleString('ru-RU')} ₽
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-white/[0.02]">
              <span className="text-slate-600 dark:text-slate-400">
                Эквайринг Ozon (1.5%):
              </span>
              <span className="font-mono font-medium text-slate-900 dark:text-white">
                {financeSummary.marketplaceCommissions.acquiring.toLocaleString('ru-RU')} ₽
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-white/[0.08]">
              <span>Итого комиссии Ozon:</span>
              <span className="font-mono text-rose-600 dark:text-rose-400">
                {financeSummary.marketplaceCommissions.total.toLocaleString('ru-RU')} ₽
              </span>
            </div>
          </div>

          {/* Логистический блок */}
          <div className="pt-4 border-t border-slate-100 dark:border-white/[0.05]">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-blue-500" />
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                Логистика Ozon (Регламент FBO/FBS 2025/2026)
              </h4>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">Сборка и фулфилмент (ФФ 10 ₽/ед):</span>
                <span className="font-mono">{financeSummary.logisticsExpenses.fulfillment.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">Магистраль (по литражу и кластерам):</span>
                <span className="font-mono">{financeSummary.logisticsExpenses.trunking.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">Последняя миля покупателю (4.9%):</span>
                <span className="font-mono">{financeSummary.logisticsExpenses.lastMile.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">Кросс-докинг Ozon (1.63 ₽/ед):</span>
                <span className="font-mono">{financeSummary.logisticsExpenses.crossDock.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">ДДВ и локальность продаж:</span>
                <span className="font-mono">{financeSummary.logisticsExpenses.ddvAndLp.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">Обратная логистика возвратов/отмен:</span>
                <span className="font-mono">{financeSummary.logisticsExpenses.returnsAndCancellations.toLocaleString('ru-RU')} ₽</span>
              </div>

              <div className="flex justify-between items-center pt-2 font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-white/[0.08]">
                <span>Итого логистика:</span>
                <span className="font-mono text-rose-600 dark:text-rose-400">
                  {financeSummary.logisticsExpenses.total.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Правая колонка: Себестоимость, реклама и налоги */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.05] pb-3">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Расходы селлера (COGS, реклама ДРР и налоги)
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Себестоимость */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05]">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Себестоимость закупки (COGS)
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {financeSummary.cogsTotal.toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Конфиденциальные данные продавца из каталога юнит-экономики
              </div>
            </div>

            {/* Рекламные расходы (ДРР) */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Рекламные расходы (ДРР {financeSummary.advertisingExpenses.avgDrrPercent}%)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                    План селлера
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {financeSummary.advertisingExpenses.total.toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {financeSummary.advertisingExpenses.note}
              </div>
            </div>

            {/* Налоги УСН 11% */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05]">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Налог УСН (11% от цены реализации)
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {financeSummary.taxesTotal.toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Рассчитан по налоговому профилю РФ от цены реализации со скидкой продавца
              </div>
            </div>

            {/* Прочие удержания Ozon */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05]">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Хранение FBO и сервисные услуги
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {financeSummary.otherDeductions.total.toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Размещение на складе FBO и компенсации акций Ozon
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
