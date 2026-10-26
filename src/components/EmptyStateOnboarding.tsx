import React from 'react';
import {
  ShieldCheck,
  FileSpreadsheet,
  Layers,
  Plus,
  ArrowRight,
  Info,
  CheckCircle2,
  Lock,
  Boxes,
} from 'lucide-react';

interface EmptyStateOnboardingProps {
  onOpenOzonSync: () => void;
  onOpenImport: () => void;
  onLoadDemo: () => void;
  onOpenNewProduct: () => void;
}

export const EmptyStateOnboarding: React.FC<EmptyStateOnboardingProps> = ({
  onOpenOzonSync,
  onOpenImport,
  onLoadDemo,
  onOpenNewProduct,
}) => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-300">
      {/* 1. Главный баннер первого запуска */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Платформа юнит-экономики и аналитики Ozon 2025/2026</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Добро пожаловать в Ozon Seller Analytics
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Профессиональный сервис для продавцов маркетплейса: расчет реальной юнит-экономики товаров, комиссии Ozon, логистика по литражу, реформа НДС 2025/2026 и контроль оборачиваемости.
        </p>
      </div>

      {/* 2. Четыре пути начала работы */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Путь 1: Ozon Seller API */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111726] border-2 border-emerald-500/30 dark:border-emerald-500/30 hover:border-emerald-500 transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-4 group">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                Рекомендуемый вариант
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                Подключить Ozon Seller API
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Автоматическая загрузка каталога, цен реализации со скидкой продавца, габаритов, остатков FBO/FBS и отчетов о реализации. Безопасный доступ с правами <strong>«Администратор (только чтение)»</strong>.
            </p>
          </div>

          <button
            onClick={onOpenOzonSync}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <span>Ввести Client-Id и Api-Key</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Путь 2: Демонстрационный магазин */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15] transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-4 group">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-semibold">
                Для ознакомления
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                Изучить на демонстрационном магазине Ozon
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Загрузит эталонный каталог из 6 товаров категории «Красота» со всеми характеристиками, тарифами Ozon (23%/52%), логистикой по литражу и графиками динамики.
            </p>
          </div>

          <button
            onClick={onLoadDemo}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <span>Открыть демо-магазин</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Путь 3: Импорт таблицы Excel */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15] transition-all shadow-sm flex flex-col justify-between space-y-4 group">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold">
                Из вашей таблицы
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                Импортировать каталог (.xlsx / .csv)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Загрузите существующую таблицу Excel с артикулами, ценами и себестоимостью. Парсер автоматически сопоставит столбцы и пересчитает юнит-экономику.
            </p>
          </div>

          <button
            onClick={onOpenImport}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-200 dark:border-white/[0.08] transition-colors cursor-pointer"
          >
            <span>Выбрать файл Excel</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Путь 4: Создание товара вручную */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15] transition-all shadow-sm flex flex-col justify-between space-y-4 group">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
                Ручной расчет
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                Добавить товар вручную
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Быстрый расчет юнит-экономики для 1 нового SKU: введите цену реализации, себестоимость и габариты для мгновенного расчета маржи и точки безубыточности.
            </p>
          </div>

          <button
            onClick={onOpenNewProduct}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-200 dark:border-white/[0.08] transition-colors cursor-pointer"
          >
            <span>Создать карточку товара</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* 3. Гарантия прозрачности и безопасности */}
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
        <Lock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-slate-800 dark:text-slate-200">
            Принцип достоверности Ozon Seller Analytics
          </div>
          <p className="leading-relaxed">
            Мы не показываем выдуманную прибыль или фиктивные нули. До подключения вашего магазина система не выдает прогноз за подтвержденный факт. Ваши API-ключи хранятся исключительно в защищенном локальном хранилище вашего браузера и никогда не передаются третьим лицам.
          </p>
        </div>
      </div>
    </div>
  );
};
