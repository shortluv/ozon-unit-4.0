import * as XLSX from 'xlsx';
import { ProductUnitData, UnitEconomicsResult } from '../types/unitEconomics';
import { calculateUnitEconomics } from './calculator';

export interface ColumnMapping {
  sku: string;
  title: string;
  category: string;
  
  // 4 Primary inputs requested by user
  retailPrice: string; // Предельная цена реализации
  cogs: string; // Закупка
  adSpendPercent: string; // Процент рекламы
  volumeLiters: string; // Литраж (л)
  
  // Background parameters from Excel unit economics
  taxPrice: string;
  ddvRub: string;
  lpRub: string;
  fulfillmentFixed: string;
  crossDockFixed: string;
  taxPercent: string;
  plannedSalesUnits: string;
}

// Synonyms dictionary for smart column auto-detection
const COLUMN_SYNONYMS: Record<keyof ColumnMapping, string[]> = {
  sku: ['артикул', 'sku', 'код товара', 'код', 'арт', 'id', 'номер'],
  title: ['название товара', 'название', 'наименование', 'товар', 'продукт', 'title', 'name', 'номенклатура'],
  category: ['категория', 'раздел', 'группа', 'category'],
  
  // User's 4 core parameters
  retailPrice: [
    'цена\nпродажи, ₽\nпредельная',
    'цена продажи, ₽ предельная',
    'цена продажи предельная',
    'предельная цена реализации',
    'предельная цена',
    'цена продажи, ₽',
    'цена продажи',
    'розничная цена',
    'цена',
    'price'
  ],
  cogs: [
    'закупка /\nсебест, ₽',
    'закупка / себест, ₽',
    'закупка / себест',
    'закупка',
    'себест, ₽',
    'себест',
    'цена закупки',
    'себестоимость',
    'cogs',
    'закуп'
  ],
  volumeLiters: [
    'литраж,\nл',
    'литраж, л',
    'литраж',
    'объем, л',
    'объем (л)',
    'объем',
    'литры',
    'л',
    'volume'
  ],
  adSpendPercent: [
    'реклама,\n%',
    'реклама, %',
    'реклама %',
    'процент рекламы',
    'дрр, %',
    'дрр %',
    'дрр',
    'реклама',
    'ads'
  ],
  
  taxPrice: [
    'цена\nреализации для налога',
    'цена реализации для налога',
    'цена для налога',
    'цена реализации'
  ],
  ddvRub: ['ддв', 'ддв, расход/ед, ₽', 'доставка до места выдачи', 'доставка доместа выдачи'],
  lpRub: ['лп', 'лп, расход/ед, ₽', 'локальность продаж', 'локальность'],
  fulfillmentFixed: ['фф, ₽', 'фф', 'фулфилмент'],
  crossDockFixed: ['кросс-\nдок, ₽', 'кросс-док, ₽', 'кросс-док', 'кроссдок'],
  taxPercent: ['налог, ₽/\n11%', 'налог, ₽/ 11%', 'налог 11%', 'налог %', 'ставка налога', 'усн %'],
  plannedSalesUnits: ['план продаж', 'продажи шт', 'количество', 'объем продаж', 'продажи в месяц', 'партия'],
};

export function autoDetectColumns(availableHeaders: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    sku: '',
    title: '',
    category: '',
    retailPrice: '',
    cogs: '',
    adSpendPercent: '',
    volumeLiters: '',
    taxPrice: '',
    ddvRub: '',
    lpRub: '',
    fulfillmentFixed: '',
    crossDockFixed: '',
    taxPercent: '',
    plannedSalesUnits: '',
  };

  const normalizedHeaders = availableHeaders.map((h) => ({
    original: h,
    cleaned: String(h).trim().toLowerCase().replace(/\r\n/g, '\n'),
  }));

  for (const [key, synonyms] of Object.entries(COLUMN_SYNONYMS) as [keyof ColumnMapping, string[]][]) {
    // 1. Exact match
    const exact = normalizedHeaders.find((h) => synonyms.includes(h.cleaned));
    if (exact) {
      mapping[key] = exact.original;
      continue;
    }
    // 2. Partial match
    const partial = normalizedHeaders.find((h) =>
      synonyms.some((syn) => h.cleaned.includes(syn) || syn.includes(h.cleaned))
    );
    if (partial) {
      mapping[key] = partial.original;
    }
  }

  return mapping;
}

export function parseExcelFile(file: File): Promise<{ headers: string[]; rawRows: Record<string, any>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Find sheet: either "UNIT по товарам" or the first available sheet
        const sheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes('unit')) || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // If sheet has title / description on rows 1-2 (as in user file), start reading headers from row 3 (range 2)
        let rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', range: 2 });
        
        // If row 3 didn't yield columns like SKU/Name, try range 0
        if (!rawJson.length || (!rawJson[0]['Артикул'] && !rawJson[0]['Название товара'] && !rawJson[0]['Цена\nпродажи, ₽\nпредельная'])) {
          const altJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          if (altJson.length) rawJson = altJson;
        }

        if (!rawJson.length) {
          throw new Error('Таблица пустая или не содержит строк с данными');
        }

        // Filter out summary rows like "ИТОГО ПО МАГАЗИНУ"
        const filteredRows = rawJson.filter((r) => {
          const firstVal = String(Object.values(r)[0] || '').toLowerCase();
          const nameVal = String(r['Название товара'] || r['Наименование'] || '').toLowerCase();
          return !firstVal.includes('итого') && !nameVal.includes('итого');
        });

        const headers = Object.keys(filteredRows[0] || rawJson[0]);
        resolve({ headers, rawRows: filteredRows.length ? filteredRows : rawJson });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsArrayBuffer(file);
  });
}

function cleanNumeric(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const str = String(val).replace(/\s+/g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? fallback : parsed;
}

export function convertRowsToProducts(
  rawRows: Record<string, any>[],
  mapping: ColumnMapping
): ProductUnitData[] {
  return rawRows.map((row, index) => {
    const sku = mapping.sku && row[mapping.sku] ? String(row[mapping.sku]).trim() : `OZN-${1000 + index}`;
    const title = mapping.title && row[mapping.title] ? String(row[mapping.title]).trim() : `Товар ${index + 1}`;
    const category = mapping.category && row[mapping.category] ? String(row[mapping.category]).trim() : 'Красота и гигиена';
    
    // 4 Primary inputs requested by user
    const retailPrice = cleanNumeric(mapping.retailPrice ? row[mapping.retailPrice] : 0, 250);
    const cogs = cleanNumeric(mapping.cogs ? row[mapping.cogs] : 0, 45);
    
    // Ads % (handles both decimals like 0.16 and percentage strings like "16%")
    let adSpendPercent = 16;
    if (mapping.adSpendPercent && row[mapping.adSpendPercent] !== undefined && row[mapping.adSpendPercent] !== '') {
      const rawAds = cleanNumeric(row[mapping.adSpendPercent], 16);
      adSpendPercent = rawAds <= 1.0 ? Number((rawAds * 100).toFixed(1)) : rawAds;
    }

    // Liters
    const volumeLiters = cleanNumeric(mapping.volumeLiters ? row[mapping.volumeLiters] : 0, 0.1);

    // Tax price (E)
    const taxPrice = mapping.taxPrice && row[mapping.taxPrice] !== undefined && row[mapping.taxPrice] !== ''
      ? cleanNumeric(row[mapping.taxPrice], retailPrice)
      : retailPrice;

    // DDV & LP
    const ddvRub = mapping.ddvRub && row[mapping.ddvRub] !== undefined && row[mapping.ddvRub] !== ''
      ? cleanNumeric(row[mapping.ddvRub], 7.5)
      : 7.5;

    const lpRub = mapping.lpRub && row[mapping.lpRub] !== undefined && row[mapping.lpRub] !== ''
      ? cleanNumeric(row[mapping.lpRub], 0.1)
      : 0.1;

    const fulfillmentFixed = mapping.fulfillmentFixed && row[mapping.fulfillmentFixed] !== undefined && row[mapping.fulfillmentFixed] !== ''
      ? cleanNumeric(row[mapping.fulfillmentFixed], 10)
      : 10;

    const crossDockFixed = mapping.crossDockFixed && row[mapping.crossDockFixed] !== undefined && row[mapping.crossDockFixed] !== ''
      ? cleanNumeric(row[mapping.crossDockFixed], 1.63)
      : 1.63;

    let taxPercent = 11;
    if (mapping.taxPercent && row[mapping.taxPercent] !== undefined && row[mapping.taxPercent] !== '') {
      const rawTax = cleanNumeric(row[mapping.taxPercent], 11);
      taxPercent = rawTax <= 1.0 ? Number((rawTax * 100).toFixed(1)) : rawTax;
    }

    const plannedSalesUnits = mapping.plannedSalesUnits && row[mapping.plannedSalesUnits] !== undefined && row[mapping.plannedSalesUnits] !== ''
      ? cleanNumeric(row[mapping.plannedSalesUnits], 150)
      : 150;

    return {
      id: `imported_${Date.now()}_${index}`,
      sku,
      title,
      category,
      retailPrice,
      cogs,
      volumeLiters,
      adSpendPercent,
      taxPrice,
      ddvRub,
      lpRub,
      fulfillmentFixed,
      crossDockFixed,
      lastMilePercent: 4.9,
      acquiringPercent: 1.5,
      commissionUnder300: 23,
      commissionOver300: 52,
      forceMajeurePercent: 1.0,
      taxPercent,
      plannedSalesUnits,
    };
  });
}

// Generate sample Excel template matching user's real Ozon store spreadsheet
export function generateSampleTemplateExcel(): void {
  const sampleData = [
    {
      '№': 1,
      'Название товара': 'Китайская чудо мазь зеленая',
      'Артикул': 'OZN3493060723',
      'Цена продажи, ₽ предельная': 240,
      'Цена реализации для налога': 216,
      'Закупка / себест, ₽': 40,
      'Литраж, л': 0.29,
      'Реклама, %': '16%',
      'ДДВ, ₽': 7.91,
      'ЛП, ₽': 0.14,
      'Кросс-док, ₽': 1.63,
      'ФФ, ₽': 10,
      'Налог, %': '11%',
      'План продаж (шт)': 300,
    },
    {
      '№': 2,
      'Название товара': 'Тушь Hyper Curl',
      'Артикул': 'OZN4497059559',
      'Цена продажи, ₽ предельная': 275,
      'Цена реализации для налога': 228,
      'Закупка / себест, ₽': 50,
      'Литраж, л': 0.10,
      'Реклама, %': '16%',
      'ДДВ, ₽': 6.95,
      'ЛП, ₽': 0.04,
      'Кросс-док, ₽': 1.63,
      'ФФ, ₽': 10,
      'Налог, %': '11%',
      'План продаж (шт)': 250,
    },
    {
      '№': 3,
      'Название товара': 'Крем роллер Sadoer золотой',
      'Артикул': 'OZN3492926989',
      'Цена продажи, ₽ предельная': 280,
      'Цена реализации для налога': 228,
      'Закупка / себест, ₽': 63,
      'Литраж, л': 0.18,
      'Реклама, %': '10%',
      'ДДВ, ₽': 8.36,
      'ЛП, ₽': 0.13,
      'Кросс-док, ₽': 1.63,
      'ФФ, ₽': 10,
      'Налог, %': '11%',
      'План продаж (шт)': 150,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'UNIT по товарам');
  XLSX.writeFile(wb, 'Юнит_Экономика_Ozon_Шаблон.xlsx');
}

// Export calculated products with complete mathematical formulas and aesthetic styling to Excel
export function exportProductsToExcel(products: ProductUnitData[]): void {
  const list = Array.isArray(products) ? products : [];
  const wb = XLSX.utils.book_new();

  // Column definitions: header title, width, alignment/type
  const columnDefs = [
    { key: 'num', title: '№', width: 6 },
    { key: 'sku', title: 'Артикул Ozon', width: 18 },
    { key: 'title', title: 'Название товара', width: 34 },
    { key: 'category', title: 'Категория', width: 22 },
    { key: 'warehouse', title: 'Склад отгрузки', width: 24 },
    { key: 'liters', title: 'Литраж (л)', width: 13 },
    { key: 'retailPrice', title: 'Предельная цена (₽)', width: 20 },
    { key: 'taxPrice', title: 'База налога УСН (₽)', width: 20 },
    { key: 'cogs', title: 'Себестоимость / Закупка (₽)', width: 22 },
    { key: 'adSpendPercent', title: 'Реклама ДРР (%)', width: 16 },
    { key: 'baseLogistics', title: 'Тариф логистики Ozon (₽)', width: 22 },
    { key: 'lastMile', title: 'Последняя миля 4.9% (₽)', width: 20 },
    { key: 'acquiring', title: 'Эквайринг 1.5% (₽)', width: 17 },
    { key: 'crossDock', title: 'Кросс-докинг (₽)', width: 16 },
    { key: 'ddv', title: 'ДДВ (доставка до ПВЗ) (₽)', width: 22 },
    { key: 'lp', title: 'ЛП (локальность) (₽)', width: 18 },
    { key: 'totalLogistics', title: 'ИТОГО логистика Ozon (₽)', width: 22 },
    { key: 'commission', title: 'Комиссия Ozon (23%/52%) (₽)', width: 24 },
    { key: 'fulfillment', title: 'Фулфилмент (ФФ) (₽)', width: 18 },
    { key: 'adSpendRub', title: 'Расход на рекламу (₽)', width: 20 },
    { key: 'taxRub', title: 'Налог УСН 11% (₽)', width: 18 },
    { key: 'forceMajeure', title: 'Форс-мажор 1% (₽)', width: 17 },
    { key: 'totalExpenses', title: 'ИТОГО ВСЕ РАСХОДЫ (₽)', width: 22 },
    { key: 'netProfit', title: 'ЧИСТАЯ ПРИБЫЛЬ ЕД (₽)', width: 22 },
    { key: 'margin', title: 'Маржинальность (%)', width: 17 },
    { key: 'roi', title: 'ROI (%)', width: 15 },
    { key: 'breakEven', title: 'Точка безубыточности (₽)', width: 22 },
    { key: 'salesUnits', title: 'План продаж (шт/мес)', width: 20 },
    { key: 'monthlyRevenue', title: 'Выручка в месяц (₽)', width: 22 },
    { key: 'monthlyProfit', title: 'ЧИСТАЯ ПРИБЫЛЬ В МЕСЯЦ (₽)', width: 26 },
  ];

  const ws: any = {};
  const totalCols = columnDefs.length;

  // 1. Write Header Row (Row 0 in 0-indexed SheetJS, Row 1 in Excel)
  columnDefs.forEach((col, c) => {
    const cellRef = XLSX.utils.encode_cell({ c, r: 0 });
    ws[cellRef] = {
      t: 's',
      v: col.title,
    };
  });

  // 2. Write Product Rows with active Excel formulas
  list.forEach((prod, idx) => {
    const r = idx + 1; // 0-indexed row (Row r+1 in Excel formula notation)
    const excelRow = r + 1; // 1-indexed Excel row number
    const calc: UnitEconomicsResult = calculateUnitEconomics(prod);

    // Col letters mapping:
    // A: num (0)
    // B: sku (1)
    // C: title (2)
    // D: category (3)
    // E: warehouse (4)
    // F: liters (5)
    // G: retailPrice (6)
    // H: taxPrice (7)
    // I: cogs (8)
    // J: adSpendPercent (9)
    // K: baseLogistics (10)
    // L: lastMile (11)
    // M: acquiring (12)
    // N: crossDock (13)
    // O: ddv (14)
    // P: lp (15)
    // Q: totalLogistics (16)
    // R: commission (17)
    // S: fulfillment (18)
    // T: adSpendRub (19)
    // U: taxRub (20)
    // V: forceMajeure (21)
    // W: totalExpenses (22)
    // X: netProfit (23)
    // Y: margin (24)
    // Z: roi (25)
    // AA: breakEven (26)
    // AB: salesUnits (27)
    // AC: monthlyRevenue (28)
    // AD: monthlyProfit (29)

    // Col A: №
    ws[XLSX.utils.encode_cell({ c: 0, r })] = { t: 'n', v: idx + 1 };
    
    // Col B: SKU
    ws[XLSX.utils.encode_cell({ c: 1, r })] = { t: 's', v: prod.sku };

    // Col C: Title
    ws[XLSX.utils.encode_cell({ c: 2, r })] = { t: 's', v: prod.title };

    // Col D: Category
    ws[XLSX.utils.encode_cell({ c: 3, r })] = { t: 's', v: prod.category || 'Красота и гигиена' };

    // Col E: Warehouse
    ws[XLSX.utils.encode_cell({ c: 4, r })] = { t: 's', v: calc.warehouse };

    // Col F: Liters (E2 in formulas below if 1-indexed, but here col 5 = F)
    ws[XLSX.utils.encode_cell({ c: 5, r })] = {
      t: 'n',
      v: prod.volumeLiters,
      z: '0.00 "л"',
    };

    // Col G: Retail Price (Предельная цена продажи)
    ws[XLSX.utils.encode_cell({ c: 6, r })] = {
      t: 'n',
      v: calc.retailPrice,
      z: '#,##0.00 "₽"',
    };

    // Col H: Tax Price (Цена реализации для налога)
    ws[XLSX.utils.encode_cell({ c: 7, r })] = {
      t: 'n',
      v: calc.taxPrice,
      z: '#,##0.00 "₽"',
    };

    // Col I: COGS (Закупка)
    ws[XLSX.utils.encode_cell({ c: 8, r })] = {
      t: 'n',
      v: calc.cogs,
      z: '#,##0.00 "₽"',
    };

    // Col J: Ad spend rate % (ДРР)
    const adRateDecimal = Number((prod.adSpendPercent / 100).toFixed(4));
    ws[XLSX.utils.encode_cell({ c: 9, r })] = {
      t: 'n',
      v: adRateDecimal,
      z: '0.0%',
    };

    // Col K: Base logistics tariff (Formula based on Ozon official liter tiers & 300₽ threshold)
    const logisticsFormula = `IF(G${excelRow}<=300,IF(F${excelRow}<=0.2,20,IF(F${excelRow}<=0.4,22,IF(F${excelRow}<=0.6,23,IF(F${excelRow}<=0.8,23,IF(F${excelRow}<=1,25,IF(F${excelRow}<=1.25,27,27+(F${excelRow}-1.25)*10)))))),IF(F${excelRow}<=0.2,76,IF(F${excelRow}<=0.4,84,IF(F${excelRow}<=0.6,88,IF(F${excelRow}<=0.8,88,IF(F${excelRow}<=1,88,IF(F${excelRow}<=1.25,89,89+(F${excelRow}-1.25)*15)))))))`;
    ws[XLSX.utils.encode_cell({ c: 10, r })] = {
      t: 'n',
      v: calc.baseLogisticsTariff,
      f: logisticsFormula,
      z: '#,##0.00 "₽"',
    };

    // Col L: Last mile 4.9% (=ROUND(G{row} * 0.049, 2))
    ws[XLSX.utils.encode_cell({ c: 11, r })] = {
      t: 'n',
      v: Number(calc.lastMileRub.toFixed(2)),
      f: `ROUND(G${excelRow}*0.049,2)`,
      z: '#,##0.00 "₽"',
    };

    // Col M: Acquiring 1.5% (=ROUND(G{row} * 0.015, 2))
    ws[XLSX.utils.encode_cell({ c: 12, r })] = {
      t: 'n',
      v: Number(calc.acquiringRub.toFixed(2)),
      f: `ROUND(G${excelRow}*0.015,2)`,
      z: '#,##0.00 "₽"',
    };

    // Col N: Cross-dock fixed (₽)
    ws[XLSX.utils.encode_cell({ c: 13, r })] = {
      t: 'n',
      v: Number(calc.crossDockRub.toFixed(2)),
      z: '#,##0.00 "₽"',
    };

    // Col O: DDV fixed (₽)
    ws[XLSX.utils.encode_cell({ c: 14, r })] = {
      t: 'n',
      v: Number(calc.ddvRub.toFixed(2)),
      z: '#,##0.00 "₽"',
    };

    // Col P: LP fixed (₽)
    ws[XLSX.utils.encode_cell({ c: 15, r })] = {
      t: 'n',
      v: Number(calc.lpRub.toFixed(2)),
      z: '#,##0.00 "₽"',
    };

    // Col Q: Total logistics (=SUM(K{row}:P{row}))
    ws[XLSX.utils.encode_cell({ c: 16, r })] = {
      t: 'n',
      v: Number(calc.totalLogisticsRub.toFixed(2)),
      f: `SUM(K${excelRow}:P${excelRow})`,
      z: '#,##0.00 "₽"',
    };

    // Col R: Commission Ozon (23% if price <= 300, 52% if price > 300)
    const commFormula = `IF(G${excelRow}<=300,ROUND(G${excelRow}*0.23,2),ROUND(G${excelRow}*0.52,2))`;
    ws[XLSX.utils.encode_cell({ c: 17, r })] = {
      t: 'n',
      v: Number(calc.commissionRub.toFixed(2)),
      f: commFormula,
      z: '#,##0.00 "₽"',
    };

    // Col S: Fulfillment (₽)
    ws[XLSX.utils.encode_cell({ c: 18, r })] = {
      t: 'n',
      v: calc.fulfillmentRub,
      z: '#,##0.00 "₽"',
    };

    // Col T: Ad spend ₽ (=ROUND(G{row} * J{row}, 2))
    ws[XLSX.utils.encode_cell({ c: 19, r })] = {
      t: 'n',
      v: Number(calc.adSpendRub.toFixed(2)),
      f: `ROUND(G${excelRow}*J${excelRow},2)`,
      z: '#,##0.00 "₽"',
    };

    // Col U: USN Tax 11% (=ROUND(H{row} * 0.11, 2) calculated on realization price in Col H)
    ws[XLSX.utils.encode_cell({ c: 20, r })] = {
      t: 'n',
      v: Number(calc.taxRub.toFixed(2)),
      f: `ROUND(H${excelRow}*0.11,2)`,
      z: '#,##0.00 "₽"',
    };

    // Col V: Force-majeure / defects 1% (=ROUND(G{row} * 0.01, 2))
    ws[XLSX.utils.encode_cell({ c: 21, r })] = {
      t: 'n',
      v: Number(calc.forceMajeureRub.toFixed(2)),
      f: `ROUND(G${excelRow}*0.01,2)`,
      z: '#,##0.00 "₽"',
    };

    // Col W: TOTAL EXPENSES (=I{row}+Q{row}+R{row}+S{row}+T{row}+U{row}+V{row})
    ws[XLSX.utils.encode_cell({ c: 22, r })] = {
      t: 'n',
      v: Number(calc.totalExpensesRub.toFixed(2)),
      f: `I${excelRow}+Q${excelRow}+R${excelRow}+S${excelRow}+T${excelRow}+U${excelRow}+V${excelRow}`,
      z: '#,##0.00 "₽"',
    };

    // Col X: NET PROFIT PER UNIT (=G{row} - W{row})
    ws[XLSX.utils.encode_cell({ c: 23, r })] = {
      t: 'n',
      v: Number(calc.netProfitPerUnit.toFixed(2)),
      f: `G${excelRow}-W${excelRow}`,
      z: '#,##0.00 "₽"',
    };

    // Col Y: Margin % (=IF(G{row}>0, X{row}/G{row}, 0))
    ws[XLSX.utils.encode_cell({ c: 24, r })] = {
      t: 'n',
      v: Number((calc.marginPercent / 100).toFixed(4)),
      f: `IF(G${excelRow}>0,X${excelRow}/G${excelRow},0)`,
      z: '0.0%',
    };

    // Col Z: ROI % (=IF(I{row}>0, X{row}/I{row}, 0))
    ws[XLSX.utils.encode_cell({ c: 25, r })] = {
      t: 'n',
      v: Number((calc.roiPercent / 100).toFixed(4)),
      f: `IF(I${excelRow}>0,X${excelRow}/I${excelRow},0)`,
      z: '0.0%',
    };

    // Col AA: Break-even retail price
    const beFormula = `ROUND((I${excelRow}+K${excelRow}+N${excelRow}+O${excelRow}+P${excelRow}+S${excelRow})/MAX(0.01,1-(IF(G${excelRow}<=300,0.23,0.52)+0.049+0.015+J${excelRow}+0.11+0.01)),0)`;
    ws[XLSX.utils.encode_cell({ c: 26, r })] = {
      t: 'n',
      v: Number(calc.breakEvenPrice.toFixed(0)),
      f: beFormula,
      z: '#,##0 "₽"',
    };

    // Col AB: Planned Monthly Sales (units)
    ws[XLSX.utils.encode_cell({ c: 27, r })] = {
      t: 'n',
      v: prod.plannedSalesUnits || 150,
      z: '#,##0 "шт"',
    };

    // Col AC: Monthly Revenue (=ROUND(G{row} * AB{row}, 2))
    ws[XLSX.utils.encode_cell({ c: 28, r })] = {
      t: 'n',
      v: Number(calc.monthlyRevenue.toFixed(2)),
      f: `ROUND(G${excelRow}*AB${excelRow},2)`,
      z: '#,##0.00 "₽"',
    };

    // Col AD: Monthly Net Profit (=ROUND(X{row} * AB{row}, 2))
    ws[XLSX.utils.encode_cell({ c: 29, r })] = {
      t: 'n',
      v: Number(calc.monthlyNetProfit.toFixed(2)),
      f: `ROUND(X${excelRow}*AB${excelRow},2)`,
      z: '#,##0.00 "₽"',
    };
  });

  // 3. Summary Row at the Bottom (Row list.length + 1)
  const summaryR = list.length + 1;
  const summaryExcelRow = summaryR + 1;
  const firstRow = 2;
  const lastProdRow = list.length + 1;

  if (list.length > 0) {
    // Label
    ws[XLSX.utils.encode_cell({ c: 1, r: summaryR })] = {
      t: 's',
      v: 'ИТОГО ПО МАГАЗИНУ (ИТОГИ / СРЕДНИЕ)',
    };

    // Avg retail price
    ws[XLSX.utils.encode_cell({ c: 6, r: summaryR })] = {
      t: 'n',
      f: `AVERAGE(G${firstRow}:G${lastProdRow})`,
      z: '#,##0.00 "₽"',
    };

    // Avg COGS
    ws[XLSX.utils.encode_cell({ c: 8, r: summaryR })] = {
      t: 'n',
      f: `AVERAGE(I${firstRow}:I${lastProdRow})`,
      z: '#,##0.00 "₽"',
    };

    // Avg total logistics
    ws[XLSX.utils.encode_cell({ c: 16, r: summaryR })] = {
      t: 'n',
      f: `AVERAGE(Q${firstRow}:Q${lastProdRow})`,
      z: '#,##0.00 "₽"',
    };

    // Avg commission
    ws[XLSX.utils.encode_cell({ c: 17, r: summaryR })] = {
      t: 'n',
      f: `AVERAGE(R${firstRow}:R${lastProdRow})`,
      z: '#,##0.00 "₽"',
    };

    // Avg total expenses
    ws[XLSX.utils.encode_cell({ c: 22, r: summaryR })] = {
      t: 'n',
      f: `AVERAGE(W${firstRow}:W${lastProdRow})`,
      z: '#,##0.00 "₽"',
    };

    // Avg unit net profit
    ws[XLSX.utils.encode_cell({ c: 23, r: summaryR })] = {
      t: 'n',
      f: `AVERAGE(X${firstRow}:X${lastProdRow})`,
      z: '#,##0.00 "₽"',
    };

    // Store weighted margin
    ws[XLSX.utils.encode_cell({ c: 24, r: summaryR })] = {
      t: 'n',
      f: `IF(SUM(AC${firstRow}:AC${lastProdRow})>0,SUM(AD${firstRow}:AD${lastProdRow})/SUM(AC${firstRow}:AC${lastProdRow}),0)`,
      z: '0.0%',
    };

    // Avg ROI
    ws[XLSX.utils.encode_cell({ c: 25, r: summaryR })] = {
      t: 'n',
      f: `AVERAGE(Z${firstRow}:Z${lastProdRow})`,
      z: '0.0%',
    };

    // Total monthly sales units
    ws[XLSX.utils.encode_cell({ c: 27, r: summaryR })] = {
      t: 'n',
      f: `SUM(AB${firstRow}:AB${lastProdRow})`,
      z: '#,##0 "шт"',
    };

    // Total monthly revenue
    ws[XLSX.utils.encode_cell({ c: 28, r: summaryR })] = {
      t: 'n',
      f: `SUM(AC${firstRow}:AC${lastProdRow})`,
      z: '#,##0.00 "₽"',
    };

    // Total monthly net profit
    ws[XLSX.utils.encode_cell({ c: 29, r: summaryR })] = {
      t: 'n',
      f: `SUM(AD${firstRow}:AD${lastProdRow})`,
      z: '#,##0.00 "₽"',
    };
  }

  // Set worksheet bounds & column widths
  const maxRowIndex = list.length > 0 ? summaryR : 0;
  ws['!ref'] = XLSX.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: totalCols - 1, r: maxRowIndex },
  });

  ws['!cols'] = columnDefs.map((col) => ({ wch: col.width }));

  // Auto-filter on the data range headers
  if (list.length > 0) {
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { c: 0, r: 0 },
        e: { c: totalCols - 1, r: lastProdRow - 1 },
      }),
    };
  }

  // Append Main Sheet
  XLSX.utils.book_append_sheet(wb, ws, 'Юнит-экономика товаров');

  // 4. Create Sheet 2: Methodology & Tariff Reference
  const guideData = [
    {
      'Раздел': 'Порог 300 ₽ на Ozon',
      'Параметр / Правило': 'Ступень тарификации Ozon 2025/2026',
      'Значение': 'При розничной цене ≤ 300 ₽ комиссия составляет 23%, базовый тариф логистики от 20 ₽. При цене > 300 ₽ комиссия возрастает до 52%, а базовый тариф логистики начинается от 76 ₽.',
    },
    {
      'Раздел': 'Зона обрыва 301–350 ₽',
      'Параметр / Правило': 'Опасная ценовая яма',
      'Значение': 'Товары в диапазоне 301–350 ₽ приносят продавцу МЕНЬШЕ чистой прибыли, чем при цене 300 ₽ из-за резкого скачка комиссии на +29% и логистики на +56 ₽. Рекомендуется продавать по 300 ₽ либо повышать выше 380 ₽.',
    },
    {
      'Раздел': 'База налога УСН 11%',
      'Параметр / Правило': 'Колонка H (База налога / Цена реализации)',
      'Значение': 'Налог 11% исчисляется от фактической цены реализации товара (Колонка H), а не от розничной цены со скидкой. Формула: =ROUND(H{строка} * 0.11, 2).',
    },
    {
      'Раздел': 'Логистика Ozon FBO',
      'Параметр / Правило': 'Формула по литражу (Колонка F)',
      'Значение': 'Считается по ступеням объёма: ≤0.2л (20₽/76₽), ≤0.4л (22₽/84₽), ≤0.6л (23₽/88₽), ≤0.8л (23₽/88₽), ≤1.0л (25₽/88₽), ≤1.25л (27₽/89₽), свыше 1.25л (+10₽/+15₽ за доп. литр).',
    },
    {
      'Раздел': 'Сборы маркетплейса',
      'Параметр / Правило': 'Последняя миля и эквайринг',
      'Значение': 'Последняя миля: 4.9% от розничной цены продажи. Интернет-эквайринг: 1.5% от розничной цены продажи.',
    },
    {
      'Раздел': 'Реклама (ДРР)',
      'Параметр / Правило': 'Колонка J (ДРР %)',
      'Значение': 'Расход на рекламу Ozon Performance рассчитывается в рублях как: =ROUND(G{строка} * J{строка}, 2).',
    },
    {
      'Раздел': 'Динамические формулы',
      'Параметр / Правило': 'Интерактивность Excel таблицы',
      'Значение': 'Все формулы в файле живые: при изменении розничной цены (Колонка G), себестоимости закупки (Колонка I), литража (Колонка F) или % рекламы (Колонка J) все расходы, налоги, маржа и чистая прибыль автоматически пересчитываются!',
    },
  ];

  const wsGuide = XLSX.utils.json_to_sheet(guideData);
  wsGuide['!cols'] = [{ wch: 26 }, { wch: 36 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Тарифы и методология');

  // Trigger download in browser
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Юнит_Экономика_Ozon_${dateStr}.xlsx`);
}

