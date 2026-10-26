import React, { useState, useMemo } from 'react';
import {
  Package,
  Layers,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  Truck,
  ArrowUpDown,
  Download,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Info,
} from 'lucide-react';
import { ProductUnitData, OzonSupplyOrder } from '../types/unitEconomics';
import { generateStoreAnalytics, StockInventoryItem } from '../services/analyticsService';
import { DEMO_OZON_SUPPLY_ORDERS } from '../services/ozonApi';

interface ProductsStocksAnalyticsProps {
  products: ProductUnitData[];
  onSelectProductForDeepDive: (product: ProductUnitData) => void;
  onExport: () => void;
  onOpenOzonSync: () => void;
}

export const ProductsStocksAnalytics: React.FC<ProductsStocksAnalyticsProps> = ({
  products,
  onSelectProductForDeepDive,
  onExport,
  onOpenOzonSync,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'supply_orders'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'critical' | 'fbo' | 'fbs'>('all');
  const [sortField, setSortField] = useState<'totalAvailableStock' | 'daysOfSupply' | 'retailPrice' | 'volumeLiters'>('daysOfSupply');
  const [sortAsc, setSortAsc] = useState(true);

  const analytics = useMemo(() => {
    return generateStoreAnalytics(products, '30d');
  }, [products]);

  const { stockInventory } = analytics;

  // Оценка денежных средств, замороженных в запасах (по закупочной цене COGS)
  const inventoryCapital = useMemo(() => {
    let totalRub = 0;
    let itemsWithCogs = 0;
    let itemsWithoutCogs = 0;

    stockInventory.forEach((item) => {
      const orig = products.find((p) => p.id === item.id);
      const cogs = orig?.cogs || 0;
      if (cogs > 0) {
        itemsWithCogs++;
        totalRub += item.totalAvailableStock * cogs;
      } else {
        itemsWithoutCogs++;
      }
    });

    return { totalRub, itemsWithCogs, itemsWithoutCogs };
  }, [stockInventory, products]);

  // Фильтрация
  const filteredItems = useMemo(() => {
    let list = stockInventory.filter((item) => {
      const matchText =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode.includes(searchQuery);

      if (!matchText) return false;

      if (stockFilter === 'critical') {
        return item.status === 'critical_low' || item.status === 'low';
      }
      if (stockFilter === 'fbo') {
        return item.warehouseType === 'FBO';
      }
      if (stockFilter === 'fbs') {
        return item.warehouseType === 'FBS' || item.fbsStock > 0;
      }
      return true;
    });

    list.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [stockInventory, searchQuery, stockFilter, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const criticalCount = stockInventory.filter(
    (s) => s.status === 'critical_low' || s.status === 'low'
  ).length;

  const totalFboUnits = stockInventory.reduce((acc, s) => acc + s.fboStock, 0);
  const totalFbsUnits = stockInventory.reduce((acc, s) => acc + s.fbsStock, 0);

  // Если каталог пуст
  if (products.length === 0) {
    return (
      <div className="p-8 text-center space-y-4 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08]">
        <Boxes className="w-12 h-12 text-slate-400 mx-auto" />
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Остатки на складах Ozon не загружены
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Подключите ваш магазин Ozon Seller API с правами Администратор (только чтение) либо загрузите каталог товаров.
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

  return (
    <div className="space-y-6">
      {/* 1. Верхний информационный блок остатков */}
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                Складской учет, оборачиваемость и поставки Ozon
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Мониторинг складских балансов FBO/FBS, прогноз дат окончания остатков, контроль замороженного капитала в товаре и отслеживание статусов заявок на поставку.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenOzonSync}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
              <span>Обновить остатки /v3</span>
            </button>
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-200 dark:bg-white/[0.06] hover:bg-slate-300 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/[0.08] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>XLSX</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Четыре ключевые KPI-плашки складских остатков */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Карточка 1: Остатки FBO */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Остатки на складах FBO
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">
            {totalFboUnits.toLocaleString('ru-RU')} шт.
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Кластер Центр (Тула / Хоругвино)
          </div>
        </div>

        {/* Карточка 2: Остатки FBS */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Остатки продавца FBS
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">
            {totalFbsUnits.toLocaleString('ru-RU')} шт.
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Склад селлера / отгрузка под заказ
          </div>
        </div>

        {/* Карточка 3: Замороженный капитал в товаре */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Капитал в запасах
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              По себестоимости
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">
            {inventoryCapital.totalRub.toLocaleString('ru-RU')} ₽
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {inventoryCapital.itemsWithoutCogs > 0
              ? `У ${inventoryCapital.itemsWithoutCogs} товаров не указана закупка`
              : 'Рассчитан по 100% товаров каталога'}
          </div>
        </div>

        {/* Карточка 4: Риск Out-of-Stock */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Риск Out-of-Stock (&lt;14 дн.)
          </span>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-2">
            {criticalCount} SKU
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Требуется оформление поставки FBO
          </div>
        </div>
      </div>

      {/* 3. Переключатель подразделов: Остатки товаров vs Заявки на поставку */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/[0.08] pb-2">
        <button
          onClick={() => setActiveSubTab('inventory')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'inventory'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Складские балансы и оборачиваемость ({stockInventory.length} SKU)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('supply_orders')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'supply_orders'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Заявки на поставку FBO ({DEMO_OZON_SUPPLY_ORDERS.length})</span>
        </button>
      </div>

      {/* 4. Контент выбранного подраздела */}
      {activeSubTab === 'inventory' ? (
        <div className="p-5 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Быстрые фильтры */}
              <button
                onClick={() => setStockFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  stockFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300'
                }`}
              >
                Все товары ({stockInventory.length})
              </button>
              <button
                onClick={() => setStockFilter('critical')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  stockFilter === 'critical'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}
              >
                Дефицит ({criticalCount})
              </button>
              <button
                onClick={() => setStockFilter('fbo')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  stockFilter === 'fbo'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                }`}
              >
                Склады FBO
              </button>
            </div>

            {/* Поиск */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск по названию, SKU, штрихкоду..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-64"
              />
            </div>
          </div>

          {/* Таблица складских балансов */}
          <div className="overflow-x-auto border border-slate-200 dark:border-white/[0.08] rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 font-mono text-[11px] border-b border-slate-200 dark:border-white/[0.08]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Товар / Штрихкод</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Цены Ozon</th>
                  <th
                    onClick={() => handleSort('totalAvailableStock')}
                    className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Остаток FBO/FBS</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('daysOfSupply')}
                    className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Хватит на / Дефицит</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('volumeLiters')}
                    className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Литраж / Габариты</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-center">Статус</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {filteredItems.map((item) => {
                  const originalProd = products.find((p) => p.id === item.id);
                  const isCogsMissing = !originalProd?.cogs || originalProd.cogs <= 0;
                  
                  // Расчет примерной даты Out-of-Stock
                  const riskDate = new Date();
                  riskDate.setDate(riskDate.getDate() + item.daysOfSupply);
                  const riskDateStr = riskDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>SKU: {item.sku}</span>
                          <span>•</span>
                          <span>EAN: {item.barcode}</span>
                        </div>
                        {isCogsMissing && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Себестоимость не заполнена селлером</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.retailPrice} ₽
                        </div>
                        <div className="text-[10px] text-slate-400">
                          min: {item.minPrice} ₽
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.totalAvailableStock} шт.
                        </div>
                        <div className="text-[10px] text-slate-400">
                          FBO: {item.fboStock} • FBS: {item.fbsStock}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span
                          className={
                            item.daysOfSupply <= 7
                              ? 'text-rose-600 dark:text-rose-400'
                              : item.daysOfSupply <= 14
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }
                        >
                          {item.daysOfSupply} дн.
                        </span>
                        <div className="text-[10px] text-slate-400 font-normal">
                          до {riskDateStr} (~{item.avgDailySales} шт/д)
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {item.volumeLiters} л
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.dimensions.depth}×{item.dimensions.width}×{item.dimensions.height} мм
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                            item.status === 'critical_low'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : item.status === 'low'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : item.status === 'surplus'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {item.status === 'critical_low'
                            ? 'Срочно пополнить'
                            : item.status === 'low'
                            ? 'Низкий остаток'
                            : item.status === 'surplus'
                            ? 'Избыток'
                            : 'В норме'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            if (originalProd) onSelectProductForDeepDive(originalProd);
                          }}
                          className="px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded border border-emerald-500/20 transition-colors cursor-pointer"
                        >
                          Юнит-экономика
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Таблица заявок на поставку FBO */
        <div className="p-5 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.05] pb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Заявки на поставку FBO (POST /v3/supply-order/list)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
              Admin Read-Only
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-white/[0.08] rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 font-mono text-[11px] border-b border-slate-200 dark:border-white/[0.08]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Номер поставки</th>
                  <th className="py-2.5 px-3 font-semibold">Склад назначения Ozon</th>
                  <th className="py-2.5 px-3 font-semibold">Дата оформления</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Объем поставки</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Статус приемки</th>
                  <th className="py-2.5 px-3 font-semibold">Состав товаров</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {DEMO_OZON_SUPPLY_ORDERS.map((ord) => (
                  <tr key={ord.order_id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      {ord.supply_order_number}
                    </td>
                    <td className="py-3 px-3 text-slate-800 dark:text-slate-200">
                      <div>{ord.supply_warehouse_name}</div>
                      {ord.crossdock_cluster && (
                        <div className="text-[10px] text-slate-400">Кластер: {ord.crossdock_cluster}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-mono">
                      {new Date(ord.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {ord.total_items_count} шт.
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                          ord.state === 'ACCEPTED_AT_SUPPLY_WAREHOUSE' || ord.state === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : ord.state === 'ACCEPTANCE_IN_PROGRESS'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {ord.state_title}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-600 dark:text-slate-400">
                      {ord.items && ord.items.length > 0 ? (
                        <div className="space-y-0.5">
                          {ord.items.map((it, idx) => (
                            <div key={idx} className="truncate max-w-xs font-mono">
                              {it.quantity} шт. • {it.name || it.offer_id}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
