import React from 'react';
import { ProductUnitData } from '../types/unitEconomics';
import { calculateUnitEconomics, formatCurrency, formatPercent } from '../utils/calculator';
import { Lightbulb, AlertTriangle, TrendingUp, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface EconomicsAdvisorProps {
  products: ProductUnitData[];
  onSelectProduct: (product: ProductUnitData) => void;
}

interface Diagnosis {
  type: 'danger' | 'warning' | 'opportunity';
  title: string;
  sku: string;
  product: ProductUnitData;
  description: string;
  recommendation: string;
  impact: string;
}

export const EconomicsAdvisor: React.FC<EconomicsAdvisorProps> = ({
  products,
  onSelectProduct,
}) => {
  const diagnoses: Diagnosis[] = [];

  products.forEach((prod) => {
    const calc = calculateUnitEconomics(prod);

    // 1. Loss Diagnosis
    if (calc.netProfitPerUnit < 0) {
      diagnoses.push({
        type: 'danger',
        title: 'Торговля в прямой минус',
        sku: prod.sku,
        product: prod,
        description: `Каждая продажа приносит убыток ${formatCurrency(Math.abs(calc.netProfitPerUnit))}. Всего расходов: ${formatCurrency(calc.totalExpensesRub)} при розничной цене ${formatCurrency(prod.retailPrice)}.`,
        recommendation: `Поднимите розничную цену минимум до ${formatCurrency(Math.ceil(calc.breakEvenPrice * 1.15))} или оптимизируйте себестоимость закупки до ${formatCurrency(Math.max(0, prod.cogs - Math.abs(calc.netProfitPerUnit) - 10))}.`,
        impact: `Предотвратит убыток ${formatCurrency(Math.abs(calc.monthlyNetProfit))}/мес`,
      });
    }

    // 2. Ozon 300 ₽ Commission Cliff (From the user's specific spreadsheet logic!)
    if (prod.retailPrice > 300 && prod.retailPrice <= 360) {
      const simulatedUnder300 = calculateUnitEconomics({
        ...prod,
        retailPrice: 299,
      });

      if (simulatedUnder300.netProfitPerUnit > calc.netProfitPerUnit) {
        diagnoses.push({
          type: 'opportunity',
          title: 'Ловушка комиссии Ozon: цена чуть выше 300 ₽',
          sku: prod.sku,
          product: prod,
          description: `При цене ${formatCurrency(prod.retailPrice)} комиссия Ozon взлетает до ${calc.appliedCommissionPercent}% (${formatCurrency(calc.commissionRub)}). При цене 299 ₽ комиссия составит всего 23%, и чистая прибыль на единицу будет выше!`,
          recommendation: `Снизьте предельную цену до 299 ₽. Это снизит комиссию на 29 процентных пунктов и увеличит чистую прибыль с ${formatCurrency(calc.netProfitPerUnit)} до ${formatCurrency(simulatedUnder300.netProfitPerUnit)}!`,
          impact: `+${formatCurrency((simulatedUnder300.netProfitPerUnit - calc.netProfitPerUnit) * prod.plannedSalesUnits)}/мес`,
        });
      }
    }

    // 3. Excessive Ad Spend (ДРР %)
    if (prod.adSpendPercent >= 18 && calc.marginPercent < 10 && calc.marginPercent > 0) {
      diagnoses.push({
        type: 'warning',
        title: 'Реклама забирает основную прибыль (высокий ДРР)',
        sku: prod.sku,
        product: prod,
        description: `Рекламная ставка (${prod.adSpendPercent}%) слишком высока для текущей наценки. Чистая маржа составляет всего ${formatPercent(calc.marginPercent)}.`,
        recommendation: `Снизьте ДРР до 14–16% в продвижении в поиске/трафаретах, либо поднимите цену на 10–15 ₽.`,
        impact: `Рост маржи до +${formatPercent(calc.marginPercent + 3)}`,
      });
    }

    // 4. Healthy margin items (Cash cows)
    if (calc.marginPercent >= 12 && calc.roiPercent >= 60) {
      diagnoses.push({
        type: 'opportunity',
        title: 'Товар-флагман с высокой окупаемостью (ROI > 60%)',
        sku: prod.sku,
        product: prod,
        description: `Прибыль ${formatCurrency(calc.netProfitPerUnit)} на 1 шт, ROI ${formatPercent(calc.roiPercent)} и устойчивая маржа ${formatPercent(calc.marginPercent)}.`,
        recommendation: 'Можно безопасно масштабировать объемы закупки или удерживать текущие рекламные позиции в топе.',
        impact: 'Стабильный генератор прибыли магазина',
      });
    }
  });

  return (
    <div className="bg-[#0e1424] border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
      <div className="border-b border-white/[0.06] pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>Аудит юнит-экономики магазина Ozon</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Автоматический аудит комиссионных ступеней (до/свыше 300 ₽), рекламных ставок и резервов маржинальности
          </p>
        </div>
        <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 font-medium hidden sm:inline-block">
          Smart Advisor
        </span>
      </div>

      {diagnoses.length === 0 ? (
        <div className="p-12 text-center bg-[#080c16] rounded-2xl border border-white/[0.06]">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="text-base font-bold text-white">Все показатели в балансе!</div>
          <div className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">
            В каталоге нет критических ошибок ценообразования или скрытых убытков.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {diagnoses.map((d, index) => {
            const isDanger = d.type === 'danger';
            const isWarning = d.type === 'warning';

            return (
              <div
                key={index}
                className={`p-5 rounded-2xl border transition-all ${
                  isDanger
                    ? 'bg-rose-500/[0.04] border-rose-500/25 hover:border-rose-500/40'
                    : isWarning
                    ? 'bg-amber-500/[0.04] border-amber-500/25 hover:border-amber-500/40'
                    : 'bg-emerald-500/[0.04] border-emerald-500/25 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    {isDanger ? (
                      <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/20">
                        <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
                      </div>
                    ) : isWarning ? (
                      <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">
                        <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        <TrendingUp className="w-4 h-4 stroke-[2.2]" />
                      </div>
                    )}
                    <span className="text-xs font-bold text-white">{d.title}</span>
                    <span className="text-xs font-mono text-slate-400">· {d.sku}</span>
                    <span className="text-xs text-slate-300 truncate max-w-xs hidden md:inline">
                      ({d.product.title})
                    </span>
                  </div>

                  <span className={`text-xs font-mono font-bold tabular-nums px-2.5 py-1 rounded-lg border ${
                    isDanger 
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' 
                      : isWarning 
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' 
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  }`}>
                    {d.impact}
                  </span>
                </div>

                <div className="text-xs text-slate-300 mb-3 leading-relaxed">
                  {d.description}
                </div>

                <div className="p-3 bg-[#080c16] border border-white/[0.06] rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-slate-300 leading-relaxed">
                    <strong className="text-indigo-400 font-semibold">Рекомендация: </strong>
                    {d.recommendation}
                  </div>
                  <button
                    onClick={() => onSelectProduct(d.product)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 whitespace-nowrap shrink-0 transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20"
                  >
                    <span>Моделировать в калькуляторе</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
