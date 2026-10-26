import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  RefreshCw,
  Sun,
  Moon,
  Laptop,
  Building2,
  Percent,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getSavedOzonCredentials, clearOzonCredentials } from '../services/ozonApi';
import { STANDARD_WAREHOUSES, DEFAULT_WAREHOUSE_NAME, STANDARD_TAX_REGIMES, DEFAULT_TAX_CONFIG } from '../utils/calculator';
import { ProductUnitData, TaxRegimeConfig, TaxSystemType, BusinessEntityType, VatMode } from '../types/unitEconomics';
import { DEMO_OZON_LIVE_CATALOG } from '../services/ozonApi';

interface SettingsViewProps {
  onOpenOzonSync: () => void;
  onResetToDemo: () => void;
  onUpdateWarehouseAll: (warehouseName: string, warehouseType: 'FBO' | 'FBS') => void;
  onApplyTaxToAll?: (taxRate: number) => void;
  productCount: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenOzonSync,
  onResetToDemo,
  onUpdateWarehouseAll,
  onApplyTaxToAll,
  productCount,
}) => {
  const { theme, setTheme } = useTheme();
  const creds = getSavedOzonCredentials();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(DEFAULT_WAREHOUSE_NAME);
  const [selectedTaxProfileId, setSelectedTaxProfileId] = useState<string>('usn_income_11');
  const [taxConfig, setTaxConfig] = useState<TaxRegimeConfig>(DEFAULT_TAX_CONFIG);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [taxApplyMessage, setTaxApplyMessage] = useState<string | null>(null);

  const handleWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedWarehouse(val);
    const wh = STANDARD_WAREHOUSES.find((w) => w.name === val);
    if (wh) {
      onUpdateWarehouseAll(wh.name, wh.type);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const handleTaxProfileChange = (profileId: string) => {
    setSelectedTaxProfileId(profileId);
    const found = STANDARD_TAX_REGIMES.find((r) => r.id === profileId);
    if (found) {
      setTaxConfig(found.config);
    }
  };

  const handleApplyTaxProfile = () => {
    if (onApplyTaxToAll) {
      onApplyTaxToAll(taxConfig.ratePercent);
    }
    setTaxApplyMessage(`Ставка ${taxConfig.ratePercent}% успешно применена ко всем ${productCount} товарам!`);
    setTimeout(() => setTaxApplyMessage(null), 3000);
  };

  const maskedKey = creds?.apiKey
    ? `${creds.apiKey.slice(0, 4)}••••••••••••••••${creds.apiKey.slice(-4)}`
    : 'Не задан';

  // Пример расчета налога для демо-товара 1000 ₽
  const samplePrice = 1000;
  let sampleTaxRub = 0;
  let sampleVatRub = 0;
  if (taxConfig.vatMode === 'special_5') {
    sampleVatRub = Math.round((samplePrice * 5) / 105);
  } else if (taxConfig.vatMode === 'special_7') {
    sampleVatRub = Math.round((samplePrice * 7) / 107);
  } else if (taxConfig.vatMode === 'standard_20') {
    sampleVatRub = Math.round((samplePrice * 20) / 120);
  }
  sampleTaxRub = Math.round(((samplePrice - sampleVatRub) * taxConfig.ratePercent) / 100);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Заголовок */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center">
            <Settings className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Настройки платформы Ozon Analytics
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Управление профилем продавца, параметрами налогообложения РФ (реформа НДС 2025/2026), темой оформления и складами
            </p>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Настройки склада успешно применены ко всем {productCount} товарам каталога!</span>
        </div>
      )}

      {taxApplyMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{taxApplyMessage}</span>
        </div>
      )}

      {/* 2. Подключение к Ozon Seller API */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.05] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Интеграция Ozon Seller API
            </h3>
          </div>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              creds?.clientId && creds?.apiKey
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
            }`}
          >
            {creds?.clientId && creds?.apiKey ? 'АКТИВЕН' : 'НЕ НАСТРОЕН'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1 font-mono text-[11px]">Client-Id:</label>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] font-mono text-slate-800 dark:text-slate-200">
              {creds?.clientId || 'Не указан (демо-режим)'}
            </div>
          </div>
          <div>
            <label className="text-slate-400 block mb-1 font-mono text-[11px]">Api-Key (Скрыт):</label>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] font-mono text-slate-800 dark:text-slate-200 truncate">
              {maskedKey}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-slate-400">
            Требуются права «Администратор (только чтение)» в ЛК Ozon Seller
          </div>
          <div className="flex items-center gap-2">
            {creds && (
              <button
                onClick={() => {
                  if (confirm('Очистить сохраненные ключи Ozon API?')) {
                    clearOzonCredentials();
                    window.location.reload();
                  }
                }}
                className="px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              >
                Отключить API
              </button>
            )}
            <button
              onClick={onOpenOzonSync}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Изменить ключи / Синхронизация</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Налоговый профиль продавца РФ (Реформа 2025/2026) */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.05] pb-3">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Налоговый режим РФ и реформа НДС 2025/2026
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
            ФНС РФ 2025/2026
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Выбор готового профиля */}
          <div>
            <label className="text-slate-600 dark:text-slate-300 block mb-1.5 font-medium">
              Выберите налоговый профиль бизнеса:
            </label>
            <select
              value={selectedTaxProfileId}
              onChange={(e) => handleTaxProfileChange(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer text-xs"
            >
              {STANDARD_TAX_REGIMES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              {STANDARD_TAX_REGIMES.find((r) => r.id === selectedTaxProfileId)?.description}
            </p>
          </div>

          {/* Форма бизнеса */}
          <div>
            <label className="text-slate-600 dark:text-slate-300 block mb-1.5 font-medium">
              Организационная форма:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'ip', label: 'ИП' },
                { id: 'ooo', label: 'ООО' },
                { id: 'self_employed', label: 'Самозанятый' },
              ].map((ent) => (
                <button
                  key={ent.id}
                  type="button"
                  onClick={() => setTaxConfig((prev) => ({ ...prev, entityType: ent.id as any }))}
                  className={`py-2 px-2 rounded-lg text-center font-medium border text-xs transition-colors cursor-pointer ${
                    taxConfig.entityType === ent.id
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {ent.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {taxConfig.entityType === 'ip' ? 'Доступны фиксированные страховые взносы' : 'Юридическое лицо / спецрежим'}
            </p>
          </div>
        </div>

        {/* Реформа НДС 2025/2026: диапазон выручки */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              Правила НДС при УСН (Федеральный закон № 176-ФЗ)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Порог выручки в год
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setTaxConfig((prev) => ({
                  ...prev,
                  vatMode: 'exempt',
                  vatRate: 0,
                  annualRevenueBracket: 'under_60m',
                }));
              }}
              className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                taxConfig.vatMode === 'exempt'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                  : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="font-semibold">До 60 млн ₽</div>
              <div className="text-[10px] text-slate-400 mt-0.5">НДС 0% (освобождение)</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setTaxConfig((prev) => ({
                  ...prev,
                  vatMode: 'special_5',
                  vatRate: 5,
                  annualRevenueBracket: '60m_to_250m',
                }));
              }}
              className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                taxConfig.vatMode === 'special_5'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                  : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="font-semibold">60 – 250 млн ₽</div>
              <div className="text-[10px] text-slate-400 mt-0.5">НДС 5% (спецставка)</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setTaxConfig((prev) => ({
                  ...prev,
                  vatMode: 'special_7',
                  vatRate: 7,
                  annualRevenueBracket: '250m_to_450m',
                }));
              }}
              className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                taxConfig.vatMode === 'special_7'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                  : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="font-semibold">250 – 450 млн ₽</div>
              <div className="text-[10px] text-slate-400 mt-0.5">НДС 7% (спецставка)</div>
            </button>
          </div>
        </div>

        {/* Интерактивное превью расчета на 1000 ₽ */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">
              Пример нагрузки на товар стоимостью 1 000 ₽:
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Основной налог: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{sampleTaxRub} ₽</span> ({taxConfig.ratePercent}%)
              {sampleVatRub > 0 && (
                <span> • НДС: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+{sampleVatRub} ₽</span> ({taxConfig.vatRate}%)</span>
              )}
              <span> • Совокупный налог: <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{sampleTaxRub + sampleVatRub} ₽</span></span>
            </div>
          </div>

          <button
            onClick={handleApplyTaxProfile}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shrink-0"
          >
            Применить ставку ко всем ({productCount}) товарам
          </button>
        </div>

        <p className="text-[11px] text-slate-400 italic">
          * Расчет аналитический, формируется для юнит-экономики и анализа маржинальности продаж на Ozon. Не является официальной налоговой декларацией.
        </p>
      </div>

      {/* 4. Выбор основного склада Ozon */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.05] pb-3">
          <Building2 className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Основной склад отгрузки Ozon
          </h3>
        </div>

        <div className="text-xs">
          <label className="text-slate-600 dark:text-slate-300 block mb-1.5 font-medium">
            Склад отгрузки Ozon:
          </label>
          <select
            value={selectedWarehouse}
            onChange={handleWarehouseChange}
            className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {STANDARD_WAREHOUSES.map((w) => (
              <option key={w.id} value={w.name}>
                {w.name} ({w.type})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Корректирует базовый тариф магистрали и фулфилмента по региональным кластерам Ozon
          </p>
        </div>
      </div>

      {/* 4. Тема оформления */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.05] pb-3">
          <Sun className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Тема интерфейса
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-slate-100 dark:bg-white/[0.1] border-emerald-500 text-slate-900 dark:text-white font-medium shadow-sm'
                : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <span className="text-xs">Светлая</span>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-100 dark:bg-white/[0.1] border-emerald-500 text-slate-900 dark:text-white font-medium shadow-sm'
                : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-500 hover:text-slate-800'
            }`}
          >
            <Moon className="w-5 h-5 text-indigo-400" />
            <span className="text-xs">Тёмная</span>
          </button>

          <button
            onClick={() => setTheme('system')}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
              theme === 'system'
                ? 'bg-slate-100 dark:bg-white/[0.1] border-emerald-500 text-slate-900 dark:text-white font-medium shadow-sm'
                : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-500 hover:text-slate-800'
            }`}
          >
            <Laptop className="w-5 h-5 text-emerald-500" />
            <span className="text-xs">Системная</span>
          </button>
        </div>
      </div>

      {/* 5. Сброс каталога к эталону */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
            Восстановить эталонный каталог Ozon
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Сбрасывает текущие изменения и загружает проверенный каталог товаров с метаданными API
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm('Сбросить данные к эталонному каталогу Ozon?')) {
              onResetToDemo();
            }
          }}
          className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Сбросить к эталону</span>
        </button>
      </div>
    </div>
  );
};
