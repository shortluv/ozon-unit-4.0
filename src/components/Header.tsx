import React from 'react';
import {
  Menu,
  RefreshCw,
  Upload,
  Download,
  Plus,
  Search,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'catalog' | 'live_analytics' | 'single' | 'matrix' | 'advisor';
  setActiveTab: (tab: 'catalog' | 'live_analytics' | 'single' | 'matrix' | 'advisor') => void;
  onOpenImport: () => void;
  onExport: () => void;
  onNewProduct: () => void;
  onOpenOzonSync: () => void;
  isOzonConnected?: boolean;
  productCount: number;
  onOpenMobileMenu?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenImport,
  onExport,
  onNewProduct,
  onOpenOzonSync,
  isOzonConnected,
  productCount,
  onOpenMobileMenu,
  searchQuery = '',
  onSearchChange,
}) => {
  const titles = {
    catalog: {
      breadcrumb: 'Каталог товаров',
      subtitle: 'Юнит-экономика, пороги комиссий и чистая прибыль',
    },
    live_analytics: {
      breadcrumb: 'Живая аналитика',
      subtitle: 'Динамика цен, маржи и синхронизация с Ozon API',
    },
    single: {
      breadcrumb: 'Калькулятор позиции',
      subtitle: 'Пошаговый расчет и декомпозиция затрат на 1 товар',
    },
    matrix: {
      breadcrumb: 'Матрица «Что, если?»',
      subtitle: 'Стресс-тестирование маржинальности при колебаниях цен',
    },
    advisor: {
      breadcrumb: 'AI-Аудит и советы',
      subtitle: 'Алгоритмический аудит ассортимента и предупреждение убытков',
    },
  };

  const current = titles[activeTab] || titles.catalog;

  return (
    <header className="sticky top-0 z-20 bg-[#090d16]/85 backdrop-blur-xl border-b border-white/[0.07] transition-all">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Left Zone: Mobile Menu Toggle + Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger */}
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="Открыть меню"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Trail (Mercury Standard) */}
            <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
              <span className="text-slate-500 hidden sm:inline">Дашборд</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:inline" />
              <h1 className="font-semibold text-white text-sm sm:text-base tracking-tight truncate">
                {current.breadcrumb}
              </h1>
              {activeTab === 'catalog' && (
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-white/[0.05] border border-white/[0.08] text-slate-300 ml-1">
                  {productCount} SKU
                </span>
              )}
            </div>
          </div>

          {/* Right Zone: Mercury Actions (Sync, Import, Export, + New Product) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Ozon Sync & Tariffs Button */}
            <button
              onClick={onOpenOzonSync}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all border cursor-pointer ${
                isOzonConnected
                  ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                  : 'bg-white/[0.03] hover:bg-white/[0.07] text-slate-300 border-white/[0.08]'
              }`}
              title="Синхронизация с Ozon Seller API"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Ozon API</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOzonConnected ? 'bg-emerald-400' : 'bg-blue-400 animate-pulse'
                }`}
              />
            </button>

            {/* Import from Excel */}
            <button
              onClick={onOpenImport}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] rounded-lg transition-all cursor-pointer"
              title="Загрузить Excel-файл с товарами"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Импорт</span>
            </button>

            {/* Export to Excel */}
            <button
              onClick={onExport}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] rounded-lg transition-all cursor-pointer"
              title="Выгрузить юнит-экономику в Excel (.xlsx) с математическими формулами и динамическими расчётами"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Экспорт XLSX</span>
            </button>

            {/* Primary Action Button: + Новый товар (Mercury Royal Indigo) */}
            <button
              onClick={onNewProduct}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shadow-[0_0_20px_rgba(79,70,229,0.25)] hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden xs:inline">Добавить товар</span>
              <span className="xs:hidden">Товар</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
