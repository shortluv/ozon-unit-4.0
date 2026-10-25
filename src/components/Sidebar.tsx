import React from 'react';
import {
  Table2,
  TrendingUp,
  Calculator,
  Grid3X3,
  Lightbulb,
  RefreshCw,
  Upload,
  Download,
  Plus,
  ShieldCheck,
  Building2,
  ChevronRight,
  ChevronDown,
  Layers,
  Store,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'catalog' | 'live_analytics' | 'single' | 'matrix' | 'advisor';
  setActiveTab: (tab: 'catalog' | 'live_analytics' | 'single' | 'matrix' | 'advisor') => void;
  onOpenImport: () => void;
  onExport: () => void;
  onNewProduct: () => void;
  onOpenOzonSync: () => void;
  isOzonConnected?: boolean;
  productCount: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenImport,
  onExport,
  onNewProduct,
  onOpenOzonSync,
  isOzonConnected,
  productCount,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'catalog' as const,
      label: 'Каталог товаров',
      description: 'Юнит-экономика и маржа',
      icon: Table2,
      badge: String(productCount),
    },
    {
      id: 'live_analytics' as const,
      label: 'Живая аналитика',
      description: 'Графики и тренды Ozon',
      icon: TrendingUp,
      isLive: true,
    },
    {
      id: 'single' as const,
      label: 'Калькулятор позиции',
      description: 'Детальный разбор 1 SKU',
      icon: Calculator,
    },
    {
      id: 'matrix' as const,
      label: 'Матрица «Что, если?»',
      description: 'Стресс-тест цен и объемов',
      icon: Grid3X3,
    },
    {
      id: 'advisor' as const,
      label: 'AI-Аудит и советы',
      description: 'Рекомендации по марже',
      icon: Lightbulb,
    },
  ];

  const handleNavClick = (tabId: typeof activeTab) => {
    setActiveTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  const content = (
    <div className="flex flex-col h-full bg-[#0b101b] border-r border-white/[0.07] text-slate-200 select-none">
      {/* Brand & Organization Switcher (Mercury Signature) */}
      <div className="p-4 border-b border-white/[0.07]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mercury Geometric Monogram */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-400 p-[1px] shadow-[0_0_20px_rgba(79,70,229,0.3)]">
              <div className="w-full h-full bg-[#0b101b] rounded-[11px] flex items-center justify-center">
                <Layers className="w-4 h-4 text-indigo-400 stroke-[2.2]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-tight text-white font-sans">
                  Ozon Analytics
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                  PRO
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <Store className="w-3 h-3 text-slate-500" />
                <span className="truncate max-w-[130px]">Beauty Store (FBO)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Connection Status Bar */}
        <div
          onClick={onOpenOzonSync}
          className="mt-3.5 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isOzonConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-xs text-slate-300 font-medium">
              {isOzonConnected ? 'Ozon API подключен' : 'Настроить Ozon API'}
            </span>
          </div>
          <RefreshCw className="w-3 h-3 text-slate-400 group-hover:text-indigo-400 group-hover:rotate-180 transition-all duration-300" />
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Section: Рабочее пространство */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase font-mono">
            Рабочее пространство
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600/15 text-white border border-indigo-500/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <div className="truncate text-left">
                      <div className={`truncate ${isActive ? 'font-semibold text-white' : ''}`}>
                        {item.label}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {item.isLive && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE
                      </span>
                    )}
                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isActive
                            ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30'
                            : 'bg-white/[0.05] text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section: Интеграции & Данные */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase font-mono">
            Данные & Синхронизация
          </div>
          <div className="space-y-1">
            <button
              onClick={() => {
                onOpenOzonSync();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 text-blue-400 group-hover:rotate-45 transition-transform" />
                <span>Ozon Seller API</span>
              </div>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                v3 / v2
              </span>
            </button>

            <button
              onClick={() => {
                onOpenImport();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Upload className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                <span>Импорт из Excel</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">XLSX</span>
            </button>

            <button
              onClick={onExport}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-all cursor-pointer group"
              title="Выгрузить юнит-экономику в Excel (.xlsx) с живыми формулами"
            >
              <div className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300" />
                <span>Экспорт в Excel</span>
              </div>
              <span className="text-[10px] text-emerald-400/80 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                .XLSX
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Action Button (Mercury Style) */}
      <div className="p-3 border-t border-white/[0.07]">
        <button
          onClick={() => {
            onNewProduct();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.25)] hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Новый товар</span>
        </button>
      </div>

      {/* Footer Profile (Mercury Organization Widget) */}
      <div className="p-3 border-t border-white/[0.07] bg-white/[0.015]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-white/[0.08] flex items-center justify-center text-xs font-bold text-slate-300 font-mono">
              OZ
            </div>
            <div className="truncate">
              <div className="text-xs font-medium text-slate-200 truncate">
                ID 1275310
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Admin Read-Only
              </div>
            </div>
          </div>
          <button
            onClick={onOpenOzonSync}
            title="Настройки синхронизации"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {content}
      </aside>

      {/* Mobile Slide-Over Overlay */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10 animate-in slide-in-from-left duration-200 shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
