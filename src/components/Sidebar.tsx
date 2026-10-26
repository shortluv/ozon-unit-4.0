import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Receipt,
  Boxes,
  TrendingUp,
  Calculator,
  RefreshCw,
  Upload,
  Download,
  Plus,
  ShieldCheck,
  Layers,
  Store,
  Sun,
  Moon,
  Laptop,
  Database,
  FileSpreadsheet,
  Settings,
} from 'lucide-react';
import { useTheme, ThemeMode } from '../context/ThemeContext';

export type MainTabType =
  | 'overview'
  | 'orders'
  | 'finance'
  | 'stocks'
  | 'live_analytics'
  | 'unit_economics'
  | 'diagnostics'
  | 'import_export'
  | 'settings';

interface SidebarProps {
  activeTab: MainTabType;
  setActiveTab: (tab: MainTabType) => void;
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
  isOzonConnected = false,
  productCount,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { theme, setTheme } = useTheme();

  // Группа 1: Аналитика и управление (Linear style)
  const analyticsNav = [
    {
      id: 'overview' as const,
      label: 'Обзор магазина',
      icon: LayoutDashboard,
    },
    {
      id: 'orders' as const,
      label: 'Продажи и заказы',
      icon: ShoppingBag,
    },
    {
      id: 'finance' as const,
      label: 'Финансы (P&L)',
      icon: Receipt,
    },
    {
      id: 'stocks' as const,
      label: 'Товары и остатки',
      icon: Boxes,
      badge: String(productCount),
    },
    {
      id: 'live_analytics' as const,
      label: 'Живая аналитика',
      icon: TrendingUp,
      isLive: true,
    },
    {
      id: 'unit_economics' as const,
      label: 'Юнит-экономика',
      icon: Calculator,
    },
  ];

  // Группа 2: Инструменты, источники и настройки
  const toolsNav = [
    {
      id: 'diagnostics' as const,
      label: 'Синхронизация и источники',
      icon: Database,
    },
    {
      id: 'import_export' as const,
      label: 'Импорт и экспорт Excel',
      icon: FileSpreadsheet,
    },
    {
      id: 'settings' as const,
      label: 'Настройки',
      icon: Settings,
    },
  ];

  const handleNavClick = (tabId: MainTabType) => {
    setActiveTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-[#0c101b] border-r border-slate-200/90 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 select-none transition-colors">
      {/* Brand & Organization Header */}
      <div className="p-4 border-b border-slate-200/90 dark:border-white/[0.08]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm">
              <Layers className="w-4 h-4 text-white stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white font-sans">
                  Ozon Hub
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                  PRO
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Store className="w-3 h-3 text-slate-400" />
                <span className="truncate max-w-[130px]">Beauty Store (FBO)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Connection Status Bar */}
        <div
          onClick={onOpenOzonSync}
          className="mt-3 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.06] cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isOzonConnected
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              {isOzonConnected ? 'API Ozon подключен' : 'Настроить Ozon API'}
            </span>
          </div>
          <RefreshCw className="w-3 h-3 text-slate-400 group-hover:text-emerald-500 group-hover:rotate-180 transition-all duration-300" />
        </div>
      </div>

      {/* Main Navigation (Categorized Linear-style) */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {/* Группа 1: Аналитика */}
        <div>
          <div className="px-2.5 mb-1.5 text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase font-mono">
            Аналитика
          </div>
          <nav className="space-y-0.5">
            {analyticsNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {item.isLive && (
                      <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-600 dark:text-emerald-400 px-1 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-semibold">
                        LIVE
                      </span>
                    )}
                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400'
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

        {/* Группа 2: Инструменты & Источники */}
        <div>
          <div className="px-2.5 mb-1.5 text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase font-mono">
            Источники & Инструменты
          </div>
          <nav className="space-y-0.5">
            {toolsNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Тема оформления */}
        <div>
          <div className="px-2.5 mb-1.5 text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase font-mono">
            Тема
          </div>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-white/[0.04] p-0.5 rounded-lg border border-slate-200/80 dark:border-white/[0.06]">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <Sun className="w-3 h-3" />
              <span>Свет</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#1a233b] text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-3 h-3" />
              <span>Тьма</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                theme === 'system'
                  ? 'bg-white dark:bg-[#1a233b] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Laptop className="w-3 h-3" />
              <span>Авто</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="p-3 border-t border-slate-200/90 dark:border-white/[0.08]">
        <button
          onClick={() => {
            onNewProduct();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Новый товар</span>
        </button>
      </div>

      {/* Footer Profile */}
      <div className="p-3 border-t border-slate-200/90 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.015]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-white/[0.08] flex items-center justify-center text-[11px] font-bold text-slate-700 dark:text-slate-300 font-mono">
              OZ
            </div>
            <div className="truncate">
              <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
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
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-60 shrink-0 h-screen sticky top-0 z-30">
        {content}
      </aside>

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
