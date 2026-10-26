/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ProductUnitData } from './types/unitEconomics';
import { DEMO_OZON_LIVE_CATALOG, getSavedOzonCredentials } from './services/ozonApi';
import { MARKETPLACE_PRESETS } from './utils/calculator';
import { exportProductsToExcel } from './utils/excelHelper';
import { recordPriceSnapshot, recordPriceSnapshotsBatch } from './services/priceHistoryService';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar, MainTabType } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewDashboard } from './components/OverviewDashboard';
import { SalesOrdersAnalytics } from './components/SalesOrdersAnalytics';
import { FinanceAnalytics } from './components/FinanceAnalytics';
import { ProductsStocksAnalytics } from './components/ProductsStocksAnalytics';
import { LiveAnalytics } from './components/LiveAnalytics';
import { UnitEconomicsWorkspace } from './components/UnitEconomicsWorkspace';
import { DataSourcesDiagnostics } from './components/DataSourcesDiagnostics';
import { ImportExportView } from './components/ImportExportView';
import { SettingsView } from './components/SettingsView';
import { OzonSyncModal } from './components/OzonSyncModal';
import { ImportModal } from './components/ImportModal';
import { NewProductModal } from './components/NewProductModal';

const STORAGE_KEY = 'unit_economics_products_v3';
const DEMO_MODE_KEY = 'ozon_analytics_is_demo_mode';

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  // Demo mode state
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem(DEMO_MODE_KEY) === 'true';
  });

  // Products storage with initial fallback to DEMO_OZON_LIVE_CATALOG
  const [products, setProducts] = useState<ProductUnitData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Не удалось загрузить товары из локального хранилища', e);
    }
    // Если демо-режим активирован в localStorage или первый запуск
    const demoSaved = localStorage.getItem(DEMO_MODE_KEY);
    if (demoSaved === 'false') {
      return [];
    }
    // По умолчанию предоставляем эталонный каталог с явным статусом демо-режима
    return DEMO_OZON_LIVE_CATALOG;
  });

  // Navigation and active view (default to Overview)
  const [activeTab, setActiveTab] = useState<MainTabType>('overview');
  const [selectedProduct, setSelectedProduct] = useState<ProductUnitData | null>(null);

  // Modals & Mobile drawer
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [isOzonSyncOpen, setIsOzonSyncOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Saved credentials status
  const [isOzonConnected, setIsOzonConnected] = useState(false);

  useEffect(() => {
    const creds = getSavedOzonCredentials();
    setIsOzonConnected(Boolean(creds?.clientId && creds?.apiKey));
  }, [isOzonSyncOpen]);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
      localStorage.setItem(DEMO_MODE_KEY, isDemoMode ? 'true' : 'false');
    } catch (e) {
      console.error('Ошибка сохранения товаров в localStorage', e);
    }
  }, [products, isDemoMode]);

  const handleLoadDemo = () => {
    setIsDemoMode(true);
    setProducts(DEMO_OZON_LIVE_CATALOG);
  };

  const handleExitDemo = () => {
    setIsDemoMode(false);
    setProducts([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(DEMO_MODE_KEY, 'false');
  };

  // CRUD & Updates
  const handleUpdateProduct = (updated: ProductUnitData) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (selectedProduct?.id === updated.id) {
      setSelectedProduct(updated);
    }
    recordPriceSnapshot(updated, 'user_input');
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (selectedProduct?.id === id) {
      setSelectedProduct(null);
    }
  };

  const handleDuplicateProduct = (prod: ProductUnitData) => {
    const duplicated: ProductUnitData = {
      ...prod,
      id: `copy_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sku: `${prod.sku}-COPY`,
      title: `${prod.title} (Копия)`,
    };
    setProducts((prev) => [duplicated, ...prev]);
    recordPriceSnapshot(duplicated, 'user_input');
  };

  const handleAddProduct = (newProd: ProductUnitData) => {
    setProducts((prev) => [newProd, ...prev]);
    setIsNewProductOpen(false);
    recordPriceSnapshot(newProd, 'user_input');
  };

  const handleImportProducts = (newItems: ProductUnitData[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setProducts(newItems);
    } else {
      setProducts((prev) => {
        const existingMap = new Map(prev.map((p) => [p.sku, p]));
        newItems.forEach((item) => {
          existingMap.set(item.sku, item);
        });
        return Array.from(existingMap.values());
      });
    }
    recordPriceSnapshotsBatch(newItems, 'excel_import');
  };

  const handleApplyPresetToAll = (presetId: string) => {
    const preset = MARKETPLACE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setProducts((prev) =>
      prev.map((item) => ({
        ...item,
        commissionUnder300: preset.commissionUnder300,
        commissionOver300: preset.commissionOver300,
        lastMilePercent: preset.lastMilePercent,
        acquiringPercent: preset.acquiringPercent,
        crossDockFixed: preset.crossDockFixed,
        fulfillmentFixed: preset.fulfillmentFixed,
        forceMajeurePercent: preset.forceMajeurePercent,
        taxPercent: preset.taxPercent,
      }))
    );
  };

  const handleUpdateWarehouseAll = (warehouseName: string, warehouseType: 'FBO' | 'FBS') => {
    setProducts((prev) =>
      prev.map((item) => ({
        ...item,
        warehouse: warehouseName,
        warehouseType: warehouseType,
        crossDockFixed: warehouseType === 'FBS' ? 0 : 1.63,
        fulfillmentFixed: warehouseType === 'FBS' ? 30 : 10,
      }))
    );
  };

  const handleApplyTariffToAll = (tariff: {
    name: string;
    commissionUnder300: number;
    commissionOver300: number;
    lastMilePercent: number;
    acquiringPercent: number;
    crossDockFixed: number;
    fulfillmentFixed: number;
  }) => {
    setProducts((prev) =>
      prev.map((item) => ({
        ...item,
        commissionUnder300: tariff.commissionUnder300,
        commissionOver300: tariff.commissionOver300,
        lastMilePercent: tariff.lastMilePercent,
        acquiringPercent: tariff.acquiringPercent,
        crossDockFixed: tariff.crossDockFixed,
        fulfillmentFixed: tariff.fulfillmentFixed,
      }))
    );
  };

  const handleSelectForDeepDive = (product: ProductUnitData) => {
    setSelectedProduct(product);
    setActiveTab('unit_economics');
  };

  const handleExport = () => {
    exportProductsToExcel(products);
  };

  const handleApplyTaxToAll = (taxRate: number) => {
    setProducts((prev) =>
      prev.map((item) => ({
        ...item,
        taxPercent: taxRate,
      }))
    );
  };

  const handleResetToDemo = () => {
    handleLoadDemo();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-slate-100 flex flex-row font-sans selection:bg-emerald-500/25 selection:text-emerald-800 dark:selection:text-emerald-200 transition-colors w-full min-w-0 overflow-x-hidden">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenImport={() => setIsImportOpen(true)}
        onExport={handleExport}
        onNewProduct={() => setIsNewProductOpen(true)}
        onOpenOzonSync={() => setIsOzonSyncOpen(true)}
        isOzonConnected={isOzonConnected}
        productCount={products.length}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 max-w-full flex flex-col min-h-screen bg-slate-50 dark:bg-[#070b13] transition-colors overflow-hidden">
        {/* TopBar */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenImport={() => setIsImportOpen(true)}
          onExport={handleExport}
          onNewProduct={() => setIsNewProductOpen(true)}
          onOpenOzonSync={() => setIsOzonSyncOpen(true)}
          isOzonConnected={isOzonConnected}
          productCount={products.length}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Демо-баннер прозрачности */}
        {isDemoMode && !isOzonConnected && products.length > 0 && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono font-semibold text-[10px]">
                ДЕМО-РЕЖИМ
              </span>
              <span className="text-slate-700 dark:text-slate-300">
                Отображаются эталонные товары Ozon с официальными тарифами. Данные не являются подтвержденной выручкой вашего магазина.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsOzonSyncOpen(true)}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors cursor-pointer"
              >
                Подключить свой API
              </button>
              <button
                onClick={handleExitDemo}
                className="px-3 py-1 bg-slate-200 dark:bg-white/[0.08] hover:bg-slate-300 dark:hover:bg-white/[0.15] text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Очистить демо-данные
              </button>
            </div>
          </div>
        )}

        {/* Content Viewport */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 overflow-hidden">
          {/* Tab 1: Обзор магазина */}
          {activeTab === 'overview' && (
            <OverviewDashboard
              products={products}
              onOpenOzonSync={() => setIsOzonSyncOpen(true)}
              onOpenNewProduct={() => setIsNewProductOpen(true)}
              onExport={handleExport}
              onNavigateTab={setActiveTab}
              onSelectProductForDeepDive={handleSelectForDeepDive}
              isOzonConnected={isOzonConnected}
              isDemoMode={isDemoMode}
              onLoadDemo={handleLoadDemo}
              onOpenImport={() => setIsImportOpen(true)}
            />
          )}

          {/* Tab 2: Продажи и заказы */}
          {activeTab === 'orders' && (
            <SalesOrdersAnalytics
              products={products}
              onSelectProductForDeepDive={handleSelectForDeepDive}
              onExport={handleExport}
            />
          )}

          {/* Tab 3: Финансы */}
          {activeTab === 'finance' && (
            <FinanceAnalytics
              products={products}
              onExport={handleExport}
              onOpenOzonSync={() => setIsOzonSyncOpen(true)}
              isOzonConnected={isOzonConnected}
            />
          )}

          {/* Tab 4: Товары и остатки */}
          {activeTab === 'stocks' && (
            <ProductsStocksAnalytics
              products={products}
              onSelectProductForDeepDive={handleSelectForDeepDive}
              onExport={handleExport}
              onOpenOzonSync={() => setIsOzonSyncOpen(true)}
            />
          )}

          {/* Tab 5: Живая аналитика */}
          {activeTab === 'live_analytics' && (
            <LiveAnalytics
              products={products}
              onOpenOzonSync={() => setIsOzonSyncOpen(true)}
              isOzonConnected={isOzonConnected}
              onSelectProductForDeepDive={handleSelectForDeepDive}
            />
          )}

          {/* Tab 6: Юнит-экономика (Таблица, Калькулятор 1 SKU, Матрица, Советник) */}
          {activeTab === 'unit_economics' && (
            <UnitEconomicsWorkspace
              products={products}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onDuplicateProduct={handleDuplicateProduct}
              onAddProduct={handleAddProduct}
              selectedProduct={selectedProduct}
              setSelectedProduct={setSelectedProduct}
              onApplyPresetToAll={handleApplyPresetToAll}
              onUpdateWarehouseAll={handleUpdateWarehouseAll}
              onExport={handleExport}
              onOpenOzonSync={() => setIsOzonSyncOpen(true)}
              onOpenNewProduct={() => setIsNewProductOpen(true)}
            />
          )}

          {/* Tab 7: Синхронизация и источники (Диагностика) */}
          {activeTab === 'diagnostics' && (
            <DataSourcesDiagnostics onOpenOzonSync={() => setIsOzonSyncOpen(true)} />
          )}

          {/* Tab 8: Импорт и экспорт */}
          {activeTab === 'import_export' && (
            <ImportExportView
              products={products}
              onOpenImport={() => setIsImportOpen(true)}
              onImportProducts={handleImportProducts}
            />
          )}

          {/* Tab 9: Настройки */}
          {activeTab === 'settings' && (
            <SettingsView
              onOpenOzonSync={() => setIsOzonSyncOpen(true)}
              onResetToDemo={handleResetToDemo}
              onUpdateWarehouseAll={handleUpdateWarehouseAll}
              onApplyTaxToAll={handleApplyTaxToAll}
              productCount={products.length}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <OzonSyncModal
        isOpen={isOzonSyncOpen}
        onClose={() => setIsOzonSyncOpen(false)}
        currentProducts={products}
        onImportProducts={handleImportProducts}
        onApplyTariffToAll={handleApplyTariffToAll}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportProducts={handleImportProducts}
      />

      <NewProductModal
        isOpen={isNewProductOpen}
        onClose={() => setIsNewProductOpen(false)}
        onAddProduct={handleAddProduct}
      />
    </div>
  );
}
