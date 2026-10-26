import React from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Layers,
  CheckCircle2,
  Table,
  HelpCircle,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import { ProductUnitData } from '../types/unitEconomics';
import { exportProductsToExcel } from '../utils/excelHelper';

interface ImportExportViewProps {
  products: ProductUnitData[];
  onOpenImport: () => void;
  onImportProducts: (newItems: ProductUnitData[], mode: 'replace' | 'append') => void;
}

export const ImportExportView: React.FC<ImportExportViewProps> = ({
  products,
  onOpenImport,
  onImportProducts,
}) => {
  const handleExportExcel = () => {
    exportProductsToExcel(products);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(products, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ozon_analytics_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Заголовок */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Импорт и экспорт данных Ozon
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Интерактивный обмен данными с таблицами Microsoft Excel (.xlsx) с поддержкой динамических математических формул
            </p>
          </div>
        </div>
      </div>

      {/* 2. Две основные плитки: Экспорт и Импорт */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Экспорт */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.05] pb-3">
              <Download className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Экспорт в Excel (.xlsx)
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Формирует профессиональный файл Excel, в котором прибыль, маржа и ДРР вычисляются с помощью <strong>живых формул Excel</strong>, а не вставлены плоскими числами:
            </p>

            <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 list-disc pl-4">
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Формула прибыли:</strong>{' '}
                <code className="font-mono text-emerald-600 dark:text-emerald-400">=IF(D2&gt;0, ROUND(D2-U2, 2), 0)</code>
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Формула маржи:</strong>{' '}
                <code className="font-mono text-emerald-600 dark:text-emerald-400">=IF(D2&gt;0, ROUND(V2/D2, 4), 0)</code>
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Итоговая строка:</strong>{' '}
                <code className="font-mono text-slate-700 dark:text-slate-300">=SUM(...)</code> и{' '}
                <code className="font-mono text-slate-700 dark:text-slate-300">=AVERAGE(...)</code>
              </li>
              <li>
                Два листа: «Юнит-экономика товаров» и «Тарифы и методология».
              </li>
            </ul>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/[0.05]">
            <button
              onClick={handleExportExcel}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Выгрузить файл Excel (.XLSX)</span>
            </button>

            <button
              onClick={handleExportJson}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Резервная копия (JSON)</span>
            </button>
          </div>
        </div>

        {/* Импорт */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.05] pb-3">
              <Upload className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Импорт каталога товаров
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Загрузите вашу существующую таблицу Excel с юнит-экономикой товаров. Парсер автоматически распознает столбцы:
            </p>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <div className="p-1.5 rounded bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
                • Артикул (SKU)
              </div>
              <div className="p-1.5 rounded bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
                • Предельная цена
              </div>
              <div className="p-1.5 rounded bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
                • Цена реализации
              </div>
              <div className="p-1.5 rounded bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
                • Себестоимость закупки
              </div>
              <div className="p-1.5 rounded bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
                • Литраж / Объем
              </div>
              <div className="p-1.5 rounded bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
                • ДРР % рекламы
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Поддерживает как объединение по SKU (дополнение новыми товарами), так и полную замену каталога.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.05]">
            <button
              onClick={onOpenImport}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-slate-800 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/[0.08] transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-blue-500" />
              <span>Выбрать файл Excel для импорта</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
