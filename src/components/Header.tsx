import React from 'react';
import {
  Menu,
  RefreshCw,
  Upload,
  Download,
  Plus,
  ChevronRight,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { MainTabType } from './Sidebar';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  activeTab: MainTabType;
  setActiveTab: (tab: MainTabType) => void;
  onOpenImport: () => void;
  onExport: () => void;
  onNewProduct: () => void;
  onOpenOzonSync: () => void;
  isOzonConnected?: boolean;
  productCount: number;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenImport,
  onExport,
  onNewProduct,
  onOpenOzonSync,
  isOzonConnected = false,
  productCount,
  onOpenMobileMenu,
}) => {
  const { theme, toggleTheme } = useTheme();

  const titles: Record<MainTabType, { breadcrumb: string; subtitle: string }> = {
    overview: {
      breadcrumb: 'Обзор магазина',
      subtitle: 'Сводные KPI, динамика выручки и предупреждения селлеру',
    },
    orders: {
      breadcrumb: 'Продажи и заказы',
      subtitle: 'Воронка: заказы, отгрузки, выкупы, возвраты и средний чек',
    },
    finance: {
      breadcrumb: 'Финансы (P&L)',
      subtitle: 'Отчет о реализации: начисления, комиссии Ozon, логистика и чистая прибыль',
    },
    stocks: {
      breadcrumb: 'Товары и остатки',
      subtitle: 'Склады FBO/FBS, литраж упаковки, оборачиваемость и дефицит',
    },
    live_analytics: {
      breadcrumb: 'Живая аналитика',
      subtitle: 'Динамика цен, маржи и синхронизация с Ozon Seller API',
    },
    unit_economics: {
      breadcrumb: 'Юнит-экономика',
      subtitle: 'Калькулятор 1 SKU, матрица «Что, если?», таблица и AI-аудит',
    },
    diagnostics: {
      breadcrumb: 'Синхронизация и источники',
      subtitle: 'Техническая карта KPI, аудит методов API и проверка связи',
    },
    import_export: {
      breadcrumb: 'Импорт и экспорт Excel',
      subtitle: 'Выгрузка с живыми математическими формулами и загрузка каталога',
    },
    settings: {
      breadcrumb: 'Настройки',
      subtitle: 'Параметры Ozon Seller API, налоговая ставка УСН и склады',
    },
  };

  const current = titles[activeTab] || titles.overview;

  return (
    <header className="sticky top-0 z-20 bg-white/90 dark:bg-[#0c101b]/90 backdrop-blur-md border-b border-slate-200/90 dark:border-white/[0.08] transition-colors">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-14">
          {/* Левая зона: мобильное меню + хлебные крошки */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="Открыть меню"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
              <span className="hidden sm:inline">Ozon Hub</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 hidden sm:inline" />
              <h1 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight truncate">
                {current.breadcrumb}
              </h1>
              {activeTab === 'unit_economics' && (
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 ml-1">
                  {productCount} SKU
                </span>
              )}
            </div>
          </div>

          {/* Правая зона: Индикатор обновления, тема, Ozon API, Экспорт, + Новый товар */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Время последнего обновления */}
            <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mr-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Обновлено: {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {/* Кнопка переключения темы */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] transition-colors cursor-pointer"
              title="Переключить тему оформления (Светлая / Тёмная)"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Ozon Sync Button */}
            <button
              onClick={onOpenOzonSync}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all border cursor-pointer ${
                isOzonConnected
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-100 dark:bg-white/[0.03] hover:bg-slate-200 dark:hover:bg-white/[0.07] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08]'
              }`}
              title="Синхронизация с Ozon Seller API"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Ozon API</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOzonConnected ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
                }`}
              />
            </button>

            {/* Export to Excel */}
            <button
              onClick={onExport}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-all cursor-pointer"
              title="Выгрузить юнит-экономику в Excel (.xlsx) с математическими формулами"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>XLSX</span>
            </button>

            {/* Primary Action Button: + Новый товар */}
            <button
              onClick={onNewProduct}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden xs:inline">Товар</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
