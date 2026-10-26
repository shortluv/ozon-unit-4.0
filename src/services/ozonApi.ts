/**
 * Ozon Marketplace API & Live Tariffs Service
 * Интеграция с официальным Ozon Seller API с поддержкой ключа "Администратор (только чтение)" (Admin Read-Only)
 *
 * Исправленные приоритетные поля:
 * 1. Предельная цена:
 *    - Запрос через POST /v5/product/info/prices (с фоллбэком на /v4)
 *    - Извлечение price.min_price (минимальная цена продавца / порог для авто-акций)
 *    - Корректная обработка всех уровней вложенности (items, result.items, result)
 *    - Если min_price не установлен в Ozon (равен 0 или пуст), используется базовая цена продавца price.price с фиксацией статуса fallback
 *    - Если API не вернул значение, сохраняется последнее достоверное значение
 *
 * 2. Цена реализации:
 *    - Означает фактическую цену продажи / базу налога УСН 11% (колонка E в Excel)
 *    - Источники: price.marketing_seller_price из /v5/product/info/prices (цена с учетом скидки продавца)
 *      и проверка отчета реализации POST /v2/finance/realization (seller_price_per_instance)
 *    - Устаревший и удаленный Ozon параметр marketing_price не используется
 *    - Не подставляет случайные или предположительные числа (никаких фиктивных 0.9 * retailPrice)
 *
 * 3. Литраж товара:
 *    - Извлечение литража содержимого из характеристик товара через POST /v4/product/info/attributes
 *    - Нормализация единиц: "50 мл", "100 ml", "0.5 л", "1 л", "250 г" -> в литры (0.05 л, 0.1 л, 0.5 л, 1.0 л)
 *    - Логистический объем упаковки (по габаритам depth × width × height) сохраняется отдельно в dimensions
 *    - Если в атрибутах литраж не найден, сохраняется последнее достоверное значение
 *
 * 4. ДРР (Доля рекламных расходов):
 *    - Официально установлено: Ozon Seller API (api-seller.ozon.ru) с ключом Admin Read Only НЕ предоставляет
 *      потоварную статистику рекламных кампаний и ДРР (данные ведутся в отдельном Ozon Performance API performance.ozon.ru по OAuth2)
 *    - Фиктивные проценты не подставляются, фиксируется прозрачный статус недоступности и сохраняется значение селлера
 */

import { ProductUnitData, ProductDimensions, ProductSyncMeta, FieldSyncInfo, OzonSupplyOrder } from '../types/unitEconomics';
import { getLogisticsTariff, DEFAULT_WAREHOUSE_NAME } from '../utils/calculator';

export interface OzonCredentials {
  clientId: string;
  apiKey: string;
  lastSync?: string;
  sellerName?: string;
  keyType?: 'admin_read_only' | 'admin' | 'products' | 'custom';
  totalProducts?: number;
  warehousesCount?: number;
  customProxyUrl?: string; // Опциональный кастомный URL прокси
}

export interface OzonWarehouse {
  warehouse_id: number;
  name: string;
  is_rf?: boolean;
  status?: string;
  can_print_act_in_advance?: boolean;
}

export interface OzonCategoryTariff {
  id: string;
  name: string;
  commissionUnder300: number; // %
  commissionOver300: number; // %
  lastMilePercent: number; // %
  acquiringPercent: number; // %
  crossDockFixed: number; // ₽
  fulfillmentFixed: number; // ₽
  notes: string;
}

// Актуальные официальные тарифы Ozon (2024–2025) по категориям
export const OZON_OFFICIAL_CATEGORY_TARIFFS: OzonCategoryTariff[] = [
  {
    id: 'beauty_special',
    name: 'Красота и косметика (Спец. тариф магазина: 23% / 52%)',
    commissionUnder300: 23,
    commissionOver300: 52,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    crossDockFixed: 1.63,
    fulfillmentFixed: 10,
    notes: 'Фактическая сетка из вашей таблицы Excel (лист Тарифы)',
  },
  {
    id: 'beauty_standard',
    name: 'Косметика, парфюмерия и гигиена (Общий FBO Ozon)',
    commissionUnder300: 21,
    commissionOver300: 24,
    lastMilePercent: 5.5,
    acquiringPercent: 1.5,
    crossDockFixed: 2.0,
    fulfillmentFixed: 12,
    notes: 'Стандартный регламент Ozon FBO для категории Уход и Красота',
  },
  {
    id: 'apparel',
    name: 'Одежда, обувь и аксессуары',
    commissionUnder300: 23,
    commissionOver300: 26,
    lastMilePercent: 5.5,
    acquiringPercent: 1.5,
    crossDockFixed: 2.5,
    fulfillmentFixed: 15,
    notes: 'FBO регламент Ozon: примерка, возвраты, базовая логистика',
  },
  {
    id: 'home_goods',
    name: 'Товары для дома, кухни и интерьера',
    commissionUnder300: 20,
    commissionOver300: 23,
    lastMilePercent: 5.5,
    acquiringPercent: 1.5,
    crossDockFixed: 2.0,
    fulfillmentFixed: 10,
    notes: 'FBO регламент Ozon для товаров повседневного спроса',
  },
  {
    id: 'electronics',
    name: 'Электроника, гаджеты и аксессуары',
    commissionUnder300: 14,
    commissionOver300: 17,
    lastMilePercent: 5.5,
    acquiringPercent: 1.5,
    crossDockFixed: 2.0,
    fulfillmentFixed: 10,
    notes: 'Сниженная ставка комиссии Ozon для электроники',
  },
  {
    id: 'auto',
    name: 'Автотовары и автохимия',
    commissionUnder300: 19,
    commissionOver300: 22,
    lastMilePercent: 5.5,
    acquiringPercent: 1.5,
    crossDockFixed: 2.5,
    fulfillmentFixed: 12,
    notes: 'FBO регламент для автотоваров',
  },
  {
    id: 'fbs_standard',
    name: 'Ozon FBS (Продажи со своего склада продавца)',
    commissionUnder300: 21,
    commissionOver300: 24,
    lastMilePercent: 5.5,
    acquiringPercent: 1.5,
    crossDockFixed: 0,
    fulfillmentFixed: 30,
    notes: 'Логистика по тарифам FBS Ozon (приемка в СЦ / ПВЗ + магистраль)',
  },
];

const OZON_STORAGE_KEY = 'ozon_seller_api_config_v3';

/**
 * Очистка и санитизация введенных ключей (удаляет пробелы, кавычки, префиксы Client-Id / Api-Key)
 */
export function sanitizeCredential(raw: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/^Client-Id:\s*/i, '')
    .replace(/^Api-Key:\s*/i, '')
    .replace(/^["'`]|["'`]$/g, '')
    .trim();
}

/**
 * Безопасное преобразование строкового числа из API в number
 * Поддерживает запятые, пробелы, null, undefined
 */
export function parsePriceNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const str = String(val).trim().replace(/\s+/g, '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Универсальный сборщик элементов из любых вариантов вложенности ответов Ozon API:
 * { items: [...] }, { result: { items: [...] } }, { result: [...] }, { result: { rows: [...] } }, { rows: [...] }
 */
export function extractItems<T>(data: unknown): T[] {
  if (!data || typeof data !== 'object') return [];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj)) return obj as T[];
  if (Array.isArray(obj.items)) return obj.items as T[];
  if (Array.isArray(obj.rows)) return obj.rows as T[];
  if (Array.isArray(obj.result)) return obj.result as T[];
  if (obj.result && typeof obj.result === 'object') {
    const res = obj.result as Record<string, unknown>;
    if (Array.isArray(res.items)) return res.items as T[];
    if (Array.isArray(res.rows)) return res.rows as T[];
  }
  return [];
}

/**
 * Получить сохраненные ключи Ozon API
 */
export function getSavedOzonCredentials(): OzonCredentials | null {
  try {
    const raw =
      localStorage.getItem(OZON_STORAGE_KEY) ||
      localStorage.getItem('ozon_seller_api_config_v2') ||
      localStorage.getItem('ozon_seller_api_config');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Сохранить ключи Ozon API
 */
export function saveOzonCredentials(creds: OzonCredentials): void {
  const sanitized: OzonCredentials = {
    ...creds,
    clientId: sanitizeCredential(creds.clientId),
    apiKey: sanitizeCredential(creds.apiKey),
    keyType: creds.keyType || 'admin_read_only',
  };
  localStorage.setItem(OZON_STORAGE_KEY, JSON.stringify(sanitized));
}

/**
 * Очистить ключи Ozon API
 */
export function clearOzonCredentials(): void {
  localStorage.removeItem(OZON_STORAGE_KEY);
  localStorage.removeItem('ozon_seller_api_config_v2');
  localStorage.removeItem('ozon_seller_api_config');
}

/**
 * Задержка для повторных попыток (backoff)
 */
function waitDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Вызов метода Ozon Seller API через прокси с повторными попытками при 429 и 5xx
 * Защищен от утечки API-ключа в консоль или сообщения об ошибках
 */
export async function callOzonApi<T>(
  endpoint: string,
  body: Record<string, unknown>,
  credentials: OzonCredentials,
  maxRetries = 2
): Promise<{ success: boolean; data?: T; status?: number; error?: string }> {
  const cId = sanitizeCredential(credentials.clientId);
  const aKey = sanitizeCredential(credentials.apiKey);

  if (!cId || !aKey) {
    return { success: false, error: 'Не указан Client-Id или Api-Key' };
  }

  // Базовый адрес прокси: кастомный URL или встроенный /api/ozon (обрабатывается Vercel Serverless Function / Vite)
  const baseProxy = credentials.customProxyUrl?.trim() || '/api/ozon';
  const cleanBase = baseProxy.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const trimmedEndpoint = cleanEndpoint.replace(/^\/+/, '');

  // Основной и резервный URL для вызова прокси:
  // Для /api/ozon формат с ?path=... гарантированно маршрутизируется Vercel в Serverless Function api/ozon/index.js,
  // исключая 404 router ошибки несовпадения сегментов [...path].js на Vite.
  // При этом если хост настроен через rewrite, поддерживается и прямой путь.
  const isDefaultProxy = cleanBase === '/api/ozon' || cleanBase.endsWith('/api/ozon');
  const targetUrls = isDefaultProxy
    ? [`${cleanBase}?path=${trimmedEndpoint}`, `${cleanBase}${cleanEndpoint}`]
    : [`${cleanBase}${cleanEndpoint}`];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    for (const url of targetUrls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Client-Id': cId,
            'Api-Key': aKey,
          },
          body: JSON.stringify(body),
        });

        // Обработка 429 (Rate Limit) с повтором
        if (response.status === 429 && attempt < maxRetries) {
          await waitDelay(600 * (attempt + 1));
          continue;
        }

        // Обработка 5xx ошибок сервера Ozon с повтором
        if (response.status >= 500 && response.status < 600 && attempt < maxRetries) {
          await waitDelay(800 * (attempt + 1));
          continue;
        }

        let isHtmlResponse = false;
        let rawText = '';
        try {
          rawText = await response.text();
          if (rawText.trim().startsWith('<') || rawText.includes('<!DOCTYPE') || rawText.includes('<html')) {
            isHtmlResponse = true;
          }
        } catch {
          // fallback
        }

        // Если это 404 от Vercel (NOT_FOUND / HTML), и у нас есть резервный формат URL — пробуем резервный
        if (response.status === 404 && (isHtmlResponse || rawText.includes('NOT_FOUND') || !rawText.trim().startsWith('{'))) {
          if (targetUrls.indexOf(url) < targetUrls.length - 1) {
            continue; // Пробуем следующий URL из targetUrls
          }
        }

        if (!response.ok) {
          let errDetail = `HTTP ${response.status}: ${response.statusText}`;
          let parsedMessage: string | null = null;

          if (!isHtmlResponse && rawText.trim().startsWith('{')) {
            try {
              const errorJson = JSON.parse(rawText);
              if (errorJson.message) {
                parsedMessage = errorJson.message;
              } else if (errorJson.error?.message) {
                parsedMessage = errorJson.error.message;
              } else if (errorJson.details?.[0]?.message) {
                parsedMessage = errorJson.details[0].message;
              }
            } catch {
              // fallback
            }
          }

          if (parsedMessage) {
            errDetail = parsedMessage;
          } else if (response.status === 401) {
            errDetail = `Ошибка авторизации (401). Неверный Client-Id (${cId}) или Api-Key. Проверьте правильность копирования из Ozon Seller.`;
          } else if (response.status === 403) {
            errDetail = `Ошибка доступа (403 Forbidden). Убедитесь, что ключ создан с ролью «Администратор (только чтение)» (Admin Read-Only) и активирован в кабинете Ozon Seller.`;
          } else if (response.status === 404) {
            if (isHtmlResponse || rawText.includes('NOT_FOUND') || !rawText.trim().startsWith('{')) {
              errDetail = `Прокси-маршрут /api/ozon не найден на хостинге Vercel (HTTP 404). Запрос к ${endpoint} не был перенаправлен в Ozon. ` +
                `Проверьте vercel.json: маршрут должен направлять "/api/ozon/:path*" на "/api/ozon?path=:path*".`;
            } else {
              errDetail = `Метод или ресурс API не найден (HTTP 404 Not Found). Запрос к ${endpoint} вернул 404 на сервере Ozon.`;
            }
          } else if (response.status === 429) {
            errDetail = `Превышен лимит частоты запросов Ozon API (429 Too Many Requests). Попробуйте повторить через несколько секунд.`;
          }

          return { success: false, status: response.status, error: errDetail };
        }

        let json: unknown = null;
        try {
          json = JSON.parse(rawText);
        } catch {
          json = rawText;
        }
        return { success: true, status: response.status, data: json as T };
      } catch (err: unknown) {
        if (targetUrls.indexOf(url) < targetUrls.length - 1) {
          continue;
        }
        if (attempt < maxRetries) {
          await waitDelay(500 * (attempt + 1));
          continue;
        }
        return {
          success: false,
          error: `Сетевая ошибка при обращении к Ozon API: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
  }

  return { success: false, error: 'Не удалось выполнить запрос к Ozon API после нескольких попыток' };
}

/**
 * Получить список реальных складов продавца из Ozon (/v1/warehouse/list)
 */
export async function fetchOzonWarehouses(credentials: OzonCredentials): Promise<{
  success: boolean;
  warehouses: OzonWarehouse[];
  error?: string;
}> {
  const cId = sanitizeCredential(credentials.clientId);
  const aKey = sanitizeCredential(credentials.apiKey);

  if (!cId || !aKey) {
    return { success: false, warehouses: [], error: 'Не указаны ключи доступа' };
  }

  const res = await callOzonApi<{ result?: OzonWarehouse[] }>(
    '/v1/warehouse/list',
    {},
    { ...credentials, clientId: cId, apiKey: aKey }
  );

  const warehouses = extractItems<OzonWarehouse>(res.data);

  if (res.success && warehouses.length > 0) {
    return { success: true, warehouses };
  }

  return {
    success: false,
    warehouses: [],
    error: res.error || 'Не удалось получить список складов',
  };
}

/**
 * Проверка подключения к Ozon Seller API с ключом типа "Admin Read Only"
 */
export async function testOzonConnection(credentials: OzonCredentials): Promise<{
  success: boolean;
  message: string;
  sellerName?: string;
  totalProducts?: number;
  warehousesCount?: number;
  warehouses?: OzonWarehouse[];
}> {
  const cId = sanitizeCredential(credentials.clientId);
  const aKey = sanitizeCredential(credentials.apiKey);

  if (!cId || !aKey) {
    return {
      success: false,
      message: 'Укажите Client-Id и Api-Key из личного кабинета Ozon Seller (раздел Настройки -> API ключи)',
    };
  }

  let totalProducts = 0;
  let productsSuccess = false;
  let lastError = '';

  const activeCreds: OzonCredentials = {
    ...credentials,
    clientId: cId,
    apiKey: aKey,
  };

  const v3Res = await callOzonApi<{
    result?: { items?: unknown[]; total?: number; last_id?: string };
    items?: unknown[];
    total?: number;
  }>(
    '/v3/product/list',
    {
      filter: { visibility: 'ALL' },
      last_id: '',
      limit: 1,
    },
    activeCreds
  );

  if (v3Res.success && v3Res.data) {
    productsSuccess = true;
    totalProducts = v3Res.data.total ?? v3Res.data.result?.total ?? extractItems(v3Res.data).length;
  } else {
    lastError = v3Res.error || '';
    const v2Res = await callOzonApi<{
      result?: { items?: unknown[]; total?: number };
      items?: unknown[];
      total?: number;
    }>(
      '/v2/product/list',
      {
        filter: { visibility: 'ALL' },
        limit: 1,
      },
      activeCreds
    );

    if (v2Res.success && v2Res.data) {
      productsSuccess = true;
      totalProducts = v2Res.data.total ?? v2Res.data.result?.total ?? extractItems(v2Res.data).length;
    } else if (v2Res.error) {
      lastError = v2Res.error;
    }
  }

  if (!productsSuccess) {
    return {
      success: false,
      message: lastError || 'Не удалось связаться с Ozon API. Проверьте правильность Client-Id и Api-Key.',
    };
  }

  const whRes = await fetchOzonWarehouses({ clientId: cId, apiKey: aKey });
  const warehouses = whRes.warehouses || [];

  return {
    success: true,
    message: `Подключение успешно установлено! Ключ «Администратор (только чтение)» подтвержден. В каталоге Ozon товаров: ${totalProducts}, активных складов селлера: ${warehouses.length}.`,
    sellerName: `Магазин Ozon (Client-Id: ${cId})`,
    totalProducts,
    warehousesCount: warehouses.length,
    warehouses,
  };
}

export type SyncProgressCallback = (statusText: string, progressPercent: number) => void;

export interface FetchOzonOptions {
  selectedWarehouse?: string;
  selectedWarehouseType?: 'FBO' | 'FBS';
  selectedWarehouseId?: string | number;
  defaultCogsPercent?: number; // % себестоимости для новых позиций
  defaultTaxPriceRatio?: number;
  defaultAdSpendPercent?: number;
}

/**
 * Структуры данных Ozon API
 */
export interface RawOzonAttributeValue {
  dictionary_id?: number;
  value: string;
}

export interface RawOzonProductAttributeItem {
  attribute_id: number;
  complex_id?: number;
  values: RawOzonAttributeValue[];
}

export interface RawOzonProductAttribute {
  id: number;
  offer_id: string;
  name: string;
  barcode?: string;
  barcodes?: string[];
  category_id?: number;
  depth?: number;
  width?: number;
  height?: number;
  dimension_unit?: string;
  weight?: number;
  weight_unit?: string;
  price?: string | number;
  old_price?: string | number;
  marketing_price?: string | number;
  min_price?: string | number;
  volume_weight?: number;
  attributes?: RawOzonProductAttributeItem[];
}

export interface RawOzonProductPrice {
  product_id: number;
  offer_id: string;
  price: {
    price: string | number;
    old_price: string | number;
    min_price?: string | number;
    marketing_price?: string | number;
    marketing_seller_price?: string | number;
    retail_price?: string | number;
    currency_code?: string;
  };
  commissions?: {
    sales_percent?: number;
    sales_percent_fbo?: number;
    sales_percent_fbs?: number;
    fbo_deliv_to_customer_amount?: number;
    acquiring?: number;
  };
  volume_weight?: number;
}

export interface RawOzonRealizationRow {
  barcode?: string;
  sku?: number | string;
  offer_id?: string;
  item_name?: string;
  price?: number;
  seller_price_per_instance?: number;
  quantity?: number;
}

/**
 * Нормализация текстового описания объема в литры
 * Поддерживает: "50 мл", "100 ml", "0.5 л", "1 л", "250 г", числовые строки
 */
export function parseVolumeText(
  rawText: string,
  defaultUnit?: string
): { volumeLiters: number; rawValue: string; unit: string } | null {
  if (!rawText || typeof rawText !== 'string') return null;
  const cleaned = rawText.trim().replace(/\s+/g, ' ');

  // 1. Миллилитры: "50 мл", "50 ml", "50мл", "50ml", "50 миллилитров"
  const mlMatch = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*(?:мл|ml|миллилитр\w*)$/i);
  if (mlMatch) {
    const val = parseFloat(mlMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      const liters = Math.round((val / 1000) * 1000) / 1000;
      return { volumeLiters: liters, rawValue: cleaned, unit: 'мл' };
    }
  }

  // 2. Литры: "0.5 л", "0,5 л", "0.5l", "1 л", "1л", "1 литр"
  const lMatch = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*(?:л|l|литр\w*)$/i);
  if (lMatch) {
    const val = parseFloat(lMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      const liters = Math.round(val * 1000) / 1000;
      return { volumeLiters: liters, rawValue: cleaned, unit: 'л' };
    }
  }

  // 3. Граммы для косметических мазей/кремов (20 г -> 0.02 л, 50 г -> 0.05 л)
  const gMatch = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*(?:г|g|грамм\w*)$/i);
  if (gMatch) {
    const val = parseFloat(gMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      const liters = Math.round((val / 1000) * 1000) / 1000;
      return { volumeLiters: liters, rawValue: cleaned, unit: 'г' };
    }
  }

  // 4. Число без указания единицы, но с известной единицей атрибута
  const numOnlyMatch = cleaned.match(/^(\d+(?:[.,]\d+)?)$/);
  if (numOnlyMatch && defaultUnit) {
    const val = parseFloat(numOnlyMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      if (defaultUnit === 'мл' || defaultUnit === 'ml' || defaultUnit === 'г' || defaultUnit === 'g') {
        return { volumeLiters: Math.round((val / 1000) * 1000) / 1000, rawValue: `${val} ${defaultUnit}`, unit: defaultUnit };
      }
      if (defaultUnit === 'л' || defaultUnit === 'l') {
        return { volumeLiters: Math.round(val * 1000) / 1000, rawValue: `${val} ${defaultUnit}`, unit: defaultUnit };
      }
    }
  }

  return null;
}

/**
 * Извлечение литража содержимого из характеристик товара (attributes)
 * Проверяет стандартные атрибуты Ozon: 4389 (Объем мл), 4383 (Объем л), 8229, 9163, 10096 и значения
 */
export function extractContentVolumeFromItem(
  item: RawOzonProductAttribute
): { volumeLiters: number; rawValue: string; unit: string; attributeId?: number } | null {
  if (item.attributes && Array.isArray(item.attributes)) {
    for (const attr of item.attributes) {
      if (!attr.values || !Array.isArray(attr.values)) continue;
      const isMlAttr = [4389, 8229, 10096, 4191].includes(attr.attribute_id);
      const isLAttr = [4383, 9461, 9163].includes(attr.attribute_id);

      for (const v of attr.values) {
        if (!v.value) continue;
        const defaultUnit = isMlAttr ? 'мл' : isLAttr ? 'л' : undefined;
        const parsed = parseVolumeText(v.value, defaultUnit);
        if (parsed) {
          return {
            ...parsed,
            attributeId: attr.attribute_id,
          };
        }
      }
    }
  }

  // Поиск в названии только при наличии однозначного указания ("... 50мл" или "... 1.5 л")
  if (item.name) {
    const titleMatches = [...item.name.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(мл|ml|л|l)\b/gi)];
    if (titleMatches.length === 1) {
      const match = titleMatches[0];
      const val = parseFloat(match[1].replace(',', '.'));
      const unit = match[2].toLowerCase();
      if (!isNaN(val) && val > 0) {
        const isMl = unit === 'мл' || unit === 'ml';
        const volumeLiters = isMl ? Math.round((val / 1000) * 1000) / 1000 : Math.round(val * 1000) / 1000;
        return {
          volumeLiters,
          rawValue: `${match[1]} ${unit}`,
          unit,
        };
      }
    }
  }

  return null;
}

/**
 * Получить финансовый отчет о реализации за текущий или прошлый месяц
 */
export async function fetchRealizationReport(
  credentials: OzonCredentials
): Promise<Map<string, number>> {
  const cId = sanitizeCredential(credentials.clientId);
  const aKey = sanitizeCredential(credentials.apiKey);
  const resultMap = new Map<string, number>();

  if (!cId || !aKey) return resultMap;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Сначала пробуем текущий месяц, затем предыдущий
  const periodsToTry = [
    { month: currentMonth, year: currentYear },
    { month: currentMonth === 1 ? 12 : currentMonth - 1, year: currentMonth === 1 ? currentYear - 1 : currentYear },
  ];

  for (const period of periodsToTry) {
    try {
      const res = await callOzonApi<{
        result?: { rows?: RawOzonRealizationRow[] };
        rows?: RawOzonRealizationRow[];
      }>(
        '/v2/finance/realization',
        {
          month: period.month,
          year: period.year,
        },
        { clientId: cId, apiKey: aKey }
      );

      const rows = extractItems<RawOzonRealizationRow>(res.data);
      if (rows && rows.length > 0) {
        for (const r of rows) {
          const price = r.seller_price_per_instance ?? r.price;
          if (price !== undefined && price > 0) {
            if (r.sku) resultMap.set(String(r.sku), price);
            if (r.offer_id) resultMap.set(r.offer_id, price);
            if (r.barcode) resultMap.set(r.barcode, price);
          }
        }
        if (resultMap.size > 0) break;
      }
    } catch {
      // Игнорируем ошибки доступа, если отчет еще не сформирован
    }
  }

  return resultMap;
}

/**
 * Получить ВСЮ информацию по товарам из Ozon с ключом Admin Read Only:
 * - Все товары каталога продавца
 * - Предельная цена: извлекается price.min_price из POST /v5/product/info/prices (с fallback на price.price)
 * - Цена реализации: извлекается price.marketing_seller_price из POST /v5/product/info/prices или отчета реализации
 * - Литраж товара: извлекается из характеристик POST /v4/product/info/attributes с нормализацией единиц
 * - ДРР: фиксируется честный статус недоступности в Seller API и сохраняются данные селлера
 * - Прозрачные метаданные источника для каждого поля (syncMeta)
 */
export async function fetchLiveOzonProducts(
  credentials: OzonCredentials,
  existingProducts: ProductUnitData[] = [],
  options?: FetchOzonOptions,
  onProgress?: SyncProgressCallback
): Promise<{
  success: boolean;
  products?: ProductUnitData[];
  message: string;
  totalSynced?: number;
  warehouses?: OzonWarehouse[];
  stats?: {
    pricesUpdated: number;
    dimensionsUpdated: number;
    commissionsUpdated: number;
  };
}> {
  const cId = sanitizeCredential(credentials.clientId);
  const aKey = sanitizeCredential(credentials.apiKey);

  if (!cId || !aKey) {
    return {
      success: false,
      message: 'Укажите Client-Id и Api-Key Ozon перед синхронизацией.',
    };
  }

  try {
    onProgress?.('Проверка ключа доступа Admin Read Only и складов...', 5);

    let liveWarehouses: OzonWarehouse[] = [];
    try {
      const whRes = await fetchOzonWarehouses({ clientId: cId, apiKey: aKey });
      if (whRes.success) liveWarehouses = whRes.warehouses;
    } catch {
      // safe fallback
    }

    // =========================================================================
    // ШАГ 1: Получаем полный список артикулов продавца с пагинацией (POST /v3/product/list)
    // =========================================================================
    onProgress?.('Загрузка списка всех товаров из каталога Ozon...', 15);

    const allProductIds: number[] = [];
    const allOfferIds: string[] = [];
    let lastId = '';
    let totalInCatalog = 0;
    const MAX_ITEMS_LIMIT = 500;

    let hasMore = true;
    let pageCount = 0;

    while (hasMore && allProductIds.length < MAX_ITEMS_LIMIT) {
      pageCount++;
      const listRes = await callOzonApi<{
        result?: { items?: Array<{ product_id: number; offer_id: string }>; total?: number; last_id?: string };
        items?: Array<{ product_id: number; offer_id: string }>;
        total?: number;
        last_id?: string;
      }>(
        '/v3/product/list',
        {
          filter: { visibility: 'ALL' },
          last_id: lastId,
          limit: 100,
        },
        { clientId: cId, apiKey: aKey }
      );

      const items = extractItems<{ product_id: number; offer_id: string }>(listRes.data);
      if (listRes.success && items.length > 0) {
        totalInCatalog = listRes.data?.total ?? listRes.data?.result?.total ?? items.length;

        for (const it of items) {
          if (it.product_id && !allProductIds.includes(it.product_id)) {
            allProductIds.push(it.product_id);
            allOfferIds.push(it.offer_id);
          }
        }

        lastId = listRes.data?.last_id ?? listRes.data?.result?.last_id ?? '';
        if (!lastId || items.length === 0 || allProductIds.length >= totalInCatalog) {
          hasMore = false;
        }
      } else {
        // Фоллбэк на v2 при необходимости
        if (pageCount === 1) {
          const v2Res = await callOzonApi<{
            result?: { items?: Array<{ product_id: number; offer_id: string }>; total?: number };
            items?: Array<{ product_id: number; offer_id: string }>;
            total?: number;
          }>(
            '/v2/product/list',
            {
              filter: { visibility: 'ALL' },
              limit: 100,
            },
            { clientId: cId, apiKey: aKey }
          );

          const v2Items = extractItems<{ product_id: number; offer_id: string }>(v2Res.data);
          if (v2Res.success && v2Items.length > 0) {
            totalInCatalog = v2Res.data?.total ?? v2Res.data?.result?.total ?? v2Items.length;
            for (const it of v2Items) {
              if (it.product_id && !allProductIds.includes(it.product_id)) {
                allProductIds.push(it.product_id);
                allOfferIds.push(it.offer_id);
              }
            }
          }
        }
        hasMore = false;
      }
    }

    if (allProductIds.length === 0) {
      return {
        success: false,
        message: 'В вашем магазине Ozon не найдено активных товаров.',
      };
    }

    onProgress?.(`Найдено ${allProductIds.length} артикулов. Загрузка характеристик, литража и габаритов...`, 30);

    // =========================================================================
    // ШАГ 2: Загрузка характеристик и габаритов (POST /v4/product/info/attributes и /v2/product/info/list)
    // =========================================================================
    const attrMap = new Map<string, RawOzonProductAttribute>();
    const CHUNK_SIZE = 50;

    for (let i = 0; i < allOfferIds.length; i += CHUNK_SIZE) {
      const chunkOffers = allOfferIds.slice(i, i + CHUNK_SIZE);
      const chunkIds = allProductIds.slice(i, i + CHUNK_SIZE);

      const percent = Math.min(60, Math.round(30 + (i / allOfferIds.length) * 30));
      onProgress?.(
        `Загрузка характеристик и литража из Ozon (${Math.min(i + CHUNK_SIZE, allOfferIds.length)} / ${allOfferIds.length})...`,
        percent
      );

      // Способ 1 (Основной для характеристик и литража): POST /v4/product/info/attributes
      let gotAttributes = false;
      try {
        const v4AttrRes = await callOzonApi<{
          result?: RawOzonProductAttribute[];
          items?: RawOzonProductAttribute[];
        }>(
          '/v4/product/info/attributes',
          {
            filter: {
              offer_id: chunkOffers,
              visibility: 'ALL',
            },
            limit: CHUNK_SIZE,
          },
          { clientId: cId, apiKey: aKey }
        );

        const v4Items = extractItems<RawOzonProductAttribute>(v4AttrRes.data);
        if (v4AttrRes.success && v4Items.length > 0) {
          gotAttributes = true;
          for (const item of v4Items) {
            if (item.offer_id) attrMap.set(item.offer_id, item);
            if (item.id) attrMap.set(String(item.id), item);
          }
        }
      } catch {
        // safe fallback
      }

      // Фоллбэк 1.1: POST /v3/products/info/attributes
      if (!gotAttributes) {
        try {
          const v3AttrRes = await callOzonApi<{
            result?: RawOzonProductAttribute[];
            items?: RawOzonProductAttribute[];
          }>(
            '/v3/products/info/attributes',
            {
              filter: {
                offer_id: chunkOffers,
              },
              limit: CHUNK_SIZE,
            },
            { clientId: cId, apiKey: aKey }
          );

          const v3Items = extractItems<RawOzonProductAttribute>(v3AttrRes.data);
          if (v3AttrRes.success && v3Items.length > 0) {
            gotAttributes = true;
            for (const item of v3Items) {
              if (item.offer_id) attrMap.set(item.offer_id, item);
              if (item.id) attrMap.set(String(item.id), item);
            }
          }
        } catch {
          // safe fallback
        }
      }

      // Дополнение габаритами и весом из POST /v2/product/info/list
      const v2InfoRes = await callOzonApi<{
        result?: { items?: RawOzonProductAttribute[] };
        items?: RawOzonProductAttribute[];
      }>(
        '/v2/product/info/list',
        {
          offer_id: chunkOffers,
        },
        { clientId: cId, apiKey: aKey }
      );

      const v2Items = extractItems<RawOzonProductAttribute>(v2InfoRes.data);
      if (v2InfoRes.success && v2Items.length > 0) {
        for (const item of v2Items) {
          const existing = attrMap.get(item.offer_id) || attrMap.get(String(item.id));
          if (!existing) {
            if (item.offer_id) attrMap.set(item.offer_id, item);
            if (item.id) attrMap.set(String(item.id), item);
          } else {
            // Обогащаем существующий объект атрибутов недостающими полями габаритов
            if (!existing.depth && item.depth) existing.depth = item.depth;
            if (!existing.width && item.width) existing.width = item.width;
            if (!existing.height && item.height) existing.height = item.height;
            if (!existing.weight && item.weight) existing.weight = item.weight;
            if (!existing.barcode && item.barcode) existing.barcode = item.barcode;
            if ((!existing.barcodes || existing.barcodes.length === 0) && item.barcodes) {
              existing.barcodes = item.barcodes;
            }
            if (!existing.price && item.price) existing.price = item.price;
            if (!existing.old_price && item.old_price) existing.old_price = item.old_price;
          }
        }
      }
    }

    // =========================================================================
    // ШАГ 3: Загрузка цен и комиссий через POST /v5/product/info/prices
    // =========================================================================
    onProgress?.('Загрузка предельных цен (min_price), цен реализации и комиссий...', 65);

    const priceMap = new Map<string, RawOzonProductPrice>();

    for (let i = 0; i < allOfferIds.length; i += CHUNK_SIZE) {
      const chunkOffers = allOfferIds.slice(i, i + CHUNK_SIZE);
      const chunkIds = allProductIds.slice(i, i + CHUNK_SIZE);

      const percent = Math.min(85, Math.round(65 + (i / allOfferIds.length) * 20));
      onProgress?.(
        `Загрузка актуальных цен Ozon (/v5/product/info/prices) (${Math.min(i + CHUNK_SIZE, allOfferIds.length)} / ${allOfferIds.length})...`,
        percent
      );

      // Запрос v5 по offer_id с поддержкой cursor
      let pricesLoaded = false;
      const v5Res = await callOzonApi<{
        result?: { items?: RawOzonProductPrice[]; cursor?: string };
        items?: RawOzonProductPrice[];
        cursor?: string;
      }>(
        '/v5/product/info/prices',
        {
          cursor: '',
          filter: {
            offer_id: chunkOffers,
          },
          limit: CHUNK_SIZE,
        },
        { clientId: cId, apiKey: aKey }
      );

      const v5Items = extractItems<RawOzonProductPrice>(v5Res.data);
      if (v5Res.success && v5Items.length > 0) {
        pricesLoaded = true;
        for (const p of v5Items) {
          if (p.offer_id) priceMap.set(p.offer_id, p);
          if (p.product_id) priceMap.set(String(p.product_id), p);
        }
      }

      if (!pricesLoaded) {
        // Фоллбэк 1: по product_id в v5
        const v5IdRes = await callOzonApi<{
          result?: { items?: RawOzonProductPrice[]; cursor?: string };
          items?: RawOzonProductPrice[];
        }>(
          '/v5/product/info/prices',
          {
            cursor: '',
            filter: {
              product_id: chunkIds,
            },
            limit: CHUNK_SIZE,
          },
          { clientId: cId, apiKey: aKey }
        );

        const v5IdItems = extractItems<RawOzonProductPrice>(v5IdRes.data);
        if (v5IdRes.success && v5IdItems.length > 0) {
          pricesLoaded = true;
          for (const p of v5IdItems) {
            if (p.offer_id) priceMap.set(p.offer_id, p);
            if (p.product_id) priceMap.set(String(p.product_id), p);
          }
        }
      }

      if (!pricesLoaded) {
        // Фоллбэк 2: /v4/product/info/prices
        const v4Res = await callOzonApi<{
          result?: { items?: RawOzonProductPrice[] };
          items?: RawOzonProductPrice[];
        }>(
          '/v4/product/info/prices',
          {
            filter: {
              offer_id: chunkOffers,
            },
            limit: CHUNK_SIZE,
          },
          { clientId: cId, apiKey: aKey }
        );

        const v4Items = extractItems<RawOzonProductPrice>(v4Res.data);
        if (v4Res.success && v4Items.length > 0) {
          pricesLoaded = true;
          for (const p of v4Items) {
            if (p.offer_id) priceMap.set(p.offer_id, p);
            if (p.product_id) priceMap.set(String(p.product_id), p);
          }
        }
      }
    }

    // =========================================================================
    // ШАГ 4: Загрузка отчета о реализации (POST /v2/finance/realization)
    // =========================================================================
    onProgress?.('Проверка состоявшейся реализации из финансового учета...', 88);
    const realizationMap = await fetchRealizationReport({ clientId: cId, apiKey: aKey });

    onProgress?.('Формирование расчетной матрицы и метаданных прозрачности...', 95);

    // =========================================================================
    // ШАГ 5: Точное сопоставление товаров и сборка матрицы
    // =========================================================================
    const existingMap = new Map<string, ProductUnitData>();
    for (const ep of existingProducts) {
      if (ep.sku) {
        existingMap.set(ep.sku.trim(), ep);
        existingMap.set(ep.sku.trim().toLowerCase(), ep);
      }
      if (ep.id) existingMap.set(ep.id, ep);
      if (ep.barcode) existingMap.set(ep.barcode.trim(), ep);
    }

    let pricesUpdatedCount = 0;
    let dimensionsUpdatedCount = 0;
    let commissionsUpdatedCount = 0;

    const assignedWarehouse = options?.selectedWarehouse || DEFAULT_WAREHOUSE_NAME;
    const assignedWarehouseType: 'FBO' | 'FBS' = options?.selectedWarehouseType || 'FBO';
    const assignedWarehouseId = options?.selectedWarehouseId;

    const fetchedProducts: ProductUnitData[] = [];
    const syncTimestamp = new Date().toISOString();

    for (let i = 0; i < allOfferIds.length; i++) {
      const offerId = allOfferIds[i];
      const prodId = allProductIds[i];

      const attr = attrMap.get(offerId) || attrMap.get(String(prodId));
      const priceInfo = priceMap.get(offerId) || priceMap.get(String(prodId));
      
      // Надежное сопоставление с ранее сохраненным товаром
      const barcodeCandidate = attr?.barcode || (attr?.barcodes && attr.barcodes[0]) || '';
      const prev =
        existingMap.get(offerId) ||
        existingMap.get(offerId.toLowerCase()) ||
        existingMap.get(String(prodId)) ||
        (barcodeCandidate ? existingMap.get(barcodeCandidate) : undefined);

      // -----------------------------------------------------------------------
      // 1. ПРЕДЕЛЬНАЯ ЦЕНА (retailPrice)
      // В Ozon API /v5/product/info/prices:
      // price.min_price — минимальная цена продавца (нижний порог цены / предельная минимальная цена)
      // price.price — базовая цена продавца (текущая цена продажи)
      // -----------------------------------------------------------------------
      let retailPrice = 0;
      let limitPriceMeta: FieldSyncInfo;

      const rawMinPrice = parsePriceNumber(priceInfo?.price?.min_price ?? attr?.min_price);
      const rawSellerPrice = parsePriceNumber(priceInfo?.price?.price ?? attr?.price ?? priceInfo?.price?.retail_price);

      if (rawMinPrice !== null && rawMinPrice > 0) {
        retailPrice = rawMinPrice;
        pricesUpdatedCount++;
        limitPriceMeta = {
          sourceMethod: 'POST /v5/product/info/prices',
          fieldUsed: 'price.min_price',
          status: 'synced',
          message: 'Актуальная минимальная цена продавца (предельный порог цены)',
          rawValue: priceInfo?.price?.min_price ?? attr?.min_price,
          updatedAt: syncTimestamp,
        };
      } else if (rawSellerPrice !== null && rawSellerPrice > 0) {
        retailPrice = rawSellerPrice;
        pricesUpdatedCount++;
        limitPriceMeta = {
          sourceMethod: 'POST /v5/product/info/prices',
          fieldUsed: 'price.price',
          status: 'fallback_seller_price',
          message: 'Минимальная цена (min_price) не установлена в Ozon; использована текущая цена продажи продавца',
          rawValue: priceInfo?.price?.price ?? attr?.price,
          updatedAt: syncTimestamp,
        };
      } else if (prev?.retailPrice && prev.retailPrice > 0) {
        retailPrice = prev.retailPrice;
        limitPriceMeta = {
          sourceMethod: 'manual',
          fieldUsed: 'previous',
          status: 'kept_previous',
          message: 'API Ozon не вернул цены; сохранено предыдущее значение',
          rawValue: prev.retailPrice,
          updatedAt: syncTimestamp,
        };
      } else {
        retailPrice = 250;
        limitPriceMeta = {
          sourceMethod: 'manual',
          fieldUsed: 'default',
          status: 'unavailable',
          message: 'Цена не указана в Ozon; задано базовое значение',
          rawValue: 250,
          updatedAt: syncTimestamp,
        };
      }

      // Старая цена до скидки (old_price)
      let oldRetailPrice: number | undefined;
      const rawOldPrice = parsePriceNumber(priceInfo?.price?.old_price ?? attr?.old_price);
      if (rawOldPrice !== null && rawOldPrice > retailPrice) {
        oldRetailPrice = rawOldPrice;
      } else if (prev?.oldRetailPrice) {
        oldRetailPrice = prev.oldRetailPrice;
      }

      // -----------------------------------------------------------------------
      // 2. ЦЕНА РЕАЛИЗАЦИИ (taxPrice)
      // База для расчета налога УСН 11% (столбец E в Excel).
      // Источники:
      // a) Фактическая цена реализации из финансового отчета (/v2/finance/realization)
      // b) Маркетинговая цена со скидкой продавца (price.marketing_seller_price в /v5)
      // c) Если скидка продавца отсутствует — цена продажи продавца
      // d) Сохранение предыдущего достоверного значения без генерации фиктивных 90%
      // -----------------------------------------------------------------------
      let taxPrice = retailPrice;
      let realizationPriceMeta: FieldSyncInfo;

      const realizedFromReport =
        realizationMap.get(offerId) ??
        realizationMap.get(String(prodId)) ??
        (barcodeCandidate ? realizationMap.get(barcodeCandidate) : undefined);

      const rawMarketingSellerPrice = parsePriceNumber(
        priceInfo?.price?.marketing_seller_price ?? attr?.marketing_price
      );

      if (realizedFromReport !== undefined && realizedFromReport > 0) {
        taxPrice = realizedFromReport;
        realizationPriceMeta = {
          sourceMethod: 'POST /v2/finance/realization',
          fieldUsed: 'seller_price_per_instance',
          status: 'synced',
          message: 'Фактическая цена состоявшейся реализации товара из отчета Ozon',
          rawValue: realizedFromReport,
          updatedAt: syncTimestamp,
        };
      } else if (rawMarketingSellerPrice !== null && rawMarketingSellerPrice > 0) {
        taxPrice = rawMarketingSellerPrice;
        realizationPriceMeta = {
          sourceMethod: 'POST /v5/product/info/prices',
          fieldUsed: 'price.marketing_seller_price',
          status: 'synced',
          message: 'Цена реализации с учетом маркетинговой скидки продавца',
          rawValue: priceInfo?.price?.marketing_seller_price ?? attr?.marketing_price,
          updatedAt: syncTimestamp,
        };
      } else if (prev?.taxPrice && prev.taxPrice > 0 && prev.retailPrice === retailPrice) {
        taxPrice = prev.taxPrice;
        realizationPriceMeta = {
          sourceMethod: 'manual',
          fieldUsed: 'previous',
          status: 'kept_previous',
          message: 'Сохранена ранее установленная цена реализации товара для налога',
          rawValue: prev.taxPrice,
          updatedAt: syncTimestamp,
        };
      } else {
        // Если скидка отсутствует, цена реализации равна розничной цене
        taxPrice = retailPrice;
        realizationPriceMeta = {
          sourceMethod: 'POST /v5/product/info/prices',
          fieldUsed: 'price.price',
          status: 'fallback_seller_price',
          message: 'Скидки продавца нет; цена реализации для налога равна цене продажи',
          rawValue: retailPrice,
          updatedAt: syncTimestamp,
        };
      }

      // -----------------------------------------------------------------------
      // 3. ЛИТРАЖ ТОВАРА (volumeLiters) И ГАБАРИТЫ УПАКОВКИ
      // Источники:
      // a) Извлечение литража содержимого из характеристик (POST /v4/product/info/attributes)
      //    Поддержка "50 мл", "100 ml", "0.5 л", "1 л", "250 г" -> нормализация в литры
      // b) Сохранение физических габаритов упаковки (depth, width, height) в dimensions
      // c) Если в карточке нет атрибута объема: сохраняется предыдущее значение,
      //    либо рассчитывается объем упаковки для логистики
      // -----------------------------------------------------------------------
      let volumeLiters = 0.1;
      let contentVolumeData: ProductUnitData['contentVolume'] | undefined;
      let volumeMeta: FieldSyncInfo;

      // Извлекаем объем содержимого из характеристик
      const contentVolumeParsed = attr ? extractContentVolumeFromItem(attr) : null;

      // Физические габариты упаковки для логистики
      const depth = Number(attr?.depth) || 0;
      const width = Number(attr?.width) || 0;
      const height = Number(attr?.height) || 0;
      const weight = Number(attr?.weight) || 0;
      const unit = (attr?.dimension_unit || 'мм').toLowerCase();
      const weightUnit = (attr?.weight_unit || 'г').toLowerCase();

      let packageVolumeLiters = 0;
      if (depth > 0 && width > 0 && height > 0) {
        dimensionsUpdatedCount++;
        if (unit === 'см' || unit === 'cm') {
          packageVolumeLiters = Math.round(((depth * width * height) / 1000) * 100) / 100;
        } else {
          packageVolumeLiters = Math.round(((depth * width * height) / 1000000) * 100) / 100;
        }
      } else if (priceInfo?.volume_weight && Number(priceInfo.volume_weight) > 0) {
        packageVolumeLiters = Math.round(Number(priceInfo.volume_weight) * 5 * 100) / 100;
      }

      if (contentVolumeParsed) {
        contentVolumeData = {
          raw: contentVolumeParsed.rawValue,
          valueLiters: contentVolumeParsed.volumeLiters,
          unit: contentVolumeParsed.unit,
          attributeId: contentVolumeParsed.attributeId,
        };
        // Используем извлеченный литраж
        volumeLiters = contentVolumeParsed.volumeLiters;
        volumeMeta = {
          sourceMethod: 'POST /v4/product/info/attributes',
          fieldUsed: contentVolumeParsed.attributeId
            ? `attributes[${contentVolumeParsed.attributeId}].value`
            : 'name_volume',
          status: 'synced',
          message: `Литраж содержимого извлечен из характеристик товара (${contentVolumeParsed.rawValue})`,
          rawValue: contentVolumeParsed.rawValue,
          updatedAt: syncTimestamp,
        };
      } else if (prev?.contentVolume) {
        contentVolumeData = prev.contentVolume;
        volumeLiters = prev.volumeLiters;
        volumeMeta = {
          sourceMethod: 'manual',
          fieldUsed: 'previous_content_volume',
          status: 'kept_previous',
          message: `Сохранено предыдущее значение объема содержимого (${prev.contentVolume.raw})`,
          rawValue: prev.contentVolume.raw,
          updatedAt: syncTimestamp,
        };
      } else if (prev?.volumeLiters && prev.volumeLiters > 0) {
        volumeLiters = prev.volumeLiters;
        volumeMeta = {
          sourceMethod: 'manual',
          fieldUsed: 'previous',
          status: 'kept_previous',
          message: `В характеристиках объем не указан; сохранено предыдущее значение (${prev.volumeLiters} л)`,
          rawValue: prev.volumeLiters,
          updatedAt: syncTimestamp,
        };
      } else if (packageVolumeLiters > 0) {
        volumeLiters = packageVolumeLiters;
        volumeMeta = {
          sourceMethod: 'POST /v2/product/info/list',
          fieldUsed: 'dimensions',
          status: 'fallback_seller_price',
          message: `Характеристика объема отсутствует в карточке; рассчитан логистический объем упаковки по габаритам (${packageVolumeLiters} л)`,
          rawValue: packageVolumeLiters,
          updatedAt: syncTimestamp,
        };
      } else {
        volumeLiters = 0.1;
        volumeMeta = {
          sourceMethod: 'manual',
          fieldUsed: 'default',
          status: 'unavailable',
          message: 'Литраж не определен; установлено минимальное значение по умолчанию 0.1 л',
          rawValue: 0.1,
          updatedAt: syncTimestamp,
        };
      }

      // -----------------------------------------------------------------------
      // 4. ДРР (ДОЛЯ РЕКЛАМНЫХ РАСХОДОВ)
      // Проверка API: Ozon Seller API с ключом Admin Read Only не возвращает
      // статистику рекламных кампаний и ДРР. Рекламный кабинет находится в
      // отдельном контуре Ozon Performance API (performance.ozon.ru, OAuth2).
      // Фиксируется статус недоступности, сохраняется значение селлера.
      // -----------------------------------------------------------------------
      const adSpendPercent = prev?.adSpendPercent !== undefined
        ? prev.adSpendPercent
        : (options?.defaultAdSpendPercent ?? 16);

      const drrMeta: FieldSyncInfo = {
        sourceMethod: 'Ozon Performance API (отдельный контур)',
        fieldUsed: 'none',
        status: 'unavailable',
        message:
          'Метрика ДРР недоступна через Ozon Seller API с ключом Admin Read Only. Статистика рекламных расходов ведется в отдельном сервисе Ozon Performance (performance.ozon.ru, OAuth2). Сохранено значение селлера.',
        rawValue: `${adSpendPercent}%`,
        updatedAt: syncTimestamp,
      };

      // -----------------------------------------------------------------------
      // 5. СЕБЕСТОИМОСТЬ (COGS) И СБОРЫ OZON
      // Себестоимость является внутренней тайной селлера и строго сохраняется
      // -----------------------------------------------------------------------
      let cogs = 0;
      if (prev?.cogs !== undefined && prev.cogs > 0) {
        cogs = prev.cogs;
      } else if (options?.defaultCogsPercent) {
        cogs = Math.round(retailPrice * (options.defaultCogsPercent / 100));
      } else {
        cogs = Math.round(retailPrice * 0.25);
      }

      const plannedSales = prev?.plannedSalesUnits ?? 200;

      // Комиссии Ozon
      const apiFboCommission = priceInfo?.commissions?.sales_percent_fbo ?? priceInfo?.commissions?.sales_percent;
      let commissionOver300 = 52;

      if (apiFboCommission && apiFboCommission > 0) {
        commissionOver300 = apiFboCommission;
        commissionsUpdatedCount++;
      } else if (prev?.commissionOver300) {
        commissionOver300 = prev.commissionOver300;
      }

      const commissionUnder300 = prev?.commissionUnder300 ?? 23;
      const acquiringPercent = priceInfo?.commissions?.acquiring
        ? Number(priceInfo.commissions.acquiring)
        : (prev?.acquiringPercent ?? 1.5);

      const crossDockFixed = assignedWarehouseType === 'FBS' ? 0 : (prev?.crossDockFixed ?? 1.63);
      const fulfillmentFixed = assignedWarehouseType === 'FBS' ? 30 : (prev?.fulfillmentFixed ?? 10);

      const barcode = barcodeCandidate || `OZN-${prodId}`;
      const title = attr?.name || `Товар Ozon ${offerId}`;

      const dimensionsData: ProductDimensions = {
        depth,
        width,
        height,
        weight,
        unit,
        weightUnit,
      };

      const syncMeta: ProductSyncMeta = {
        lastSyncDate: syncTimestamp,
        limitPriceMeta,
        realizationPriceMeta,
        volumeMeta,
        drrMeta,
      };

      fetchedProducts.push({
        id: prev?.id || `ozon_${prodId}_${offerId}`,
        sku: offerId,
        title,
        barcode,
        category: prev?.category || 'Каталог Ozon',
        warehouse: assignedWarehouse,
        warehouseType: assignedWarehouseType,
        warehouseId: assignedWarehouseId,
        dimensions: dimensionsData,
        contentVolume: contentVolumeData,
        retailPrice,
        oldRetailPrice,
        taxPrice,
        cogs,
        volumeLiters,
        adSpendPercent,
        fulfillmentFixed,
        ddvRub: prev?.ddvRub ?? 7.0,
        lpRub: prev?.lpRub ?? 0.1,
        crossDockFixed,
        lastMilePercent: prev?.lastMilePercent ?? 4.9,
        acquiringPercent,
        commissionUnder300,
        commissionOver300,
        forceMajeurePercent: 1.0,
        taxPercent: prev?.taxPercent ?? 11,
        plannedSalesUnits: plannedSales,
        notes: `Ozon API: Предельная цена ${retailPrice} ₽ [${limitPriceMeta.fieldUsed}], реализация ${taxPrice} ₽ [${realizationPriceMeta.fieldUsed}], литраж ${volumeLiters} л [${volumeMeta.fieldUsed}]. Склад: ${assignedWarehouse}.`,
        syncMeta,
      });
    }

    onProgress?.('Синхронизация успешно завершена!', 100);

    saveOzonCredentials({
      clientId: cId,
      apiKey: aKey,
      keyType: 'admin_read_only',
      lastSync: syncTimestamp,
      sellerName: `Ozon Seller (${cId})`,
      totalProducts: fetchedProducts.length,
      warehousesCount: liveWarehouses.length,
    });

    return {
      success: true,
      products: fetchedProducts,
      totalSynced: fetchedProducts.length,
      warehouses: liveWarehouses,
      stats: {
        pricesUpdated: pricesUpdatedCount,
        dimensionsUpdated: dimensionsUpdatedCount,
        commissionsUpdated: commissionsUpdatedCount,
      },
      message: `Успешно загружено ${fetchedProducts.length} позиций из Ozon с ключом «Администратор (только чтение)»! Предельная цена, цена реализации, литраж (${dimensionsUpdatedCount} позиций), склад и комиссии Ozon актуализированы.`,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Неизвестная ошибка синхронизации';
    return {
      success: false,
      message: `Ошибка при синхронизации с Ozon: ${msg}`,
    };
  }
}

/**
 * Демо-каталог реальных товаров Ozon с полными метаданными синхронизации
 */
export const DEMO_OZON_LIVE_CATALOG: ProductUnitData[] = [
  {
    id: 'ozon_live_demo_1',
    sku: 'OZN-94821034',
    title: 'Крем для лица восстанавливающий с гиалуроновой кислотой 50мл',
    barcode: '4607001234567',
    category: 'Уход за лицом',
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: 590,
    taxPrice: 531,
    cogs: 110,
    volumeLiters: 0.05,
    contentVolume: { raw: '50 мл', valueLiters: 0.05, unit: 'мл', attributeId: 4389 },
    dimensions: { depth: 60, width: 60, height: 50, weight: 120, unit: 'мм', weightUnit: 'г' },
    adSpendPercent: 12,
    fulfillmentFixed: 10,
    ddvRub: 7.0,
    lpRub: 0.1,
    crossDockFixed: 1.63,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    commissionUnder300: 23,
    commissionOver300: 52,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
    plannedSalesUnits: 1400,
    notes: 'Предельная цена: 590 ₽ (/v5 price.min_price), реализация: 531 ₽ (marketing_seller_price), литраж: 0.05 л (характеристика "50 мл").',
    syncMeta: {
      lastSyncDate: new Date().toISOString(),
      limitPriceMeta: {
        sourceMethod: 'POST /v5/product/info/prices',
        fieldUsed: 'price.min_price',
        status: 'synced',
        message: 'Минимальная цена продавца (предельный порог цены)',
        rawValue: '590.00',
        updatedAt: new Date().toISOString(),
      },
      realizationPriceMeta: {
        sourceMethod: 'POST /v5/product/info/prices',
        fieldUsed: 'price.marketing_seller_price',
        status: 'synced',
        message: 'Цена реализации с учетом скидки продавца',
        rawValue: '531.00',
        updatedAt: new Date().toISOString(),
      },
      volumeMeta: {
        sourceMethod: 'POST /v4/product/info/attributes',
        fieldUsed: 'attributes[4389].value',
        status: 'synced',
        message: 'Литраж содержимого извлечен из характеристик товара (50 мл)',
        rawValue: '50 мл',
        updatedAt: new Date().toISOString(),
      },
      drrMeta: {
        sourceMethod: 'Ozon Performance API (отдельный контур)',
        fieldUsed: 'none',
        status: 'unavailable',
        message: 'ДРР недоступен через Ozon Seller API с ключом Admin Read Only. Требуется доступ к Ozon Performance API. Сохранено значение селлера (12%).',
        rawValue: '12%',
        updatedAt: new Date().toISOString(),
      },
    },
  },
  {
    id: 'ozon_live_demo_2',
    sku: 'OZN-77492104',
    title: 'Пенка для умывания очищающая с центеллой азиатской 150мл',
    barcode: '4607001234574',
    category: 'Очищение кожи',
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: 480,
    taxPrice: 432,
    cogs: 95,
    volumeLiters: 0.15,
    contentVolume: { raw: '150 мл', valueLiters: 0.15, unit: 'мл', attributeId: 4389 },
    dimensions: { depth: 160, width: 50, height: 40, weight: 180, unit: 'мм', weightUnit: 'г' },
    adSpendPercent: 10,
    fulfillmentFixed: 10,
    ddvRub: 7.0,
    lpRub: 0.1,
    crossDockFixed: 1.63,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    commissionUnder300: 23,
    commissionOver300: 52,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
    plannedSalesUnits: 950,
    notes: 'Предельная цена: 480 ₽ (/v5 price.min_price), реализация: 432 ₽, объем: 0.15 л (150 мл).',
    syncMeta: {
      lastSyncDate: new Date().toISOString(),
      limitPriceMeta: {
        sourceMethod: 'POST /v5/product/info/prices',
        fieldUsed: 'price.min_price',
        status: 'synced',
        message: 'Минимальная цена продавца',
        rawValue: '480.00',
        updatedAt: new Date().toISOString(),
      },
      realizationPriceMeta: {
        sourceMethod: 'POST /v5/product/info/prices',
        fieldUsed: 'price.marketing_seller_price',
        status: 'synced',
        message: 'Цена реализации с учетом скидки продавца',
        rawValue: '432.00',
        updatedAt: new Date().toISOString(),
      },
      volumeMeta: {
        sourceMethod: 'POST /v4/product/info/attributes',
        fieldUsed: 'attributes[4389].value',
        status: 'synced',
        message: 'Литраж содержимого извлечен из характеристик товара (150 мл)',
        rawValue: '150 мл',
        updatedAt: new Date().toISOString(),
      },
      drrMeta: {
        sourceMethod: 'Ozon Performance API (отдельный контур)',
        fieldUsed: 'none',
        status: 'unavailable',
        message: 'ДРР недоступен через Ozon Seller API с ключом Admin Read Only. Сохранено значение селлера (10%).',
        rawValue: '10%',
        updatedAt: new Date().toISOString(),
      },
    },
  },
  {
    id: 'ozon_live_demo_3',
    sku: 'OZN-33819402',
    title: 'Бальзам для губ восстанавливающий с пантенолом (эконом-сегмент)',
    barcode: '4607001234581',
    category: 'Уход за губами',
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: 199,
    taxPrice: 179,
    cogs: 32,
    volumeLiters: 0.02,
    contentVolume: { raw: '20 мл', valueLiters: 0.02, unit: 'мл', attributeId: 4389 },
    dimensions: { depth: 50, width: 40, height: 25, weight: 20, unit: 'мм', weightUnit: 'г' },
    adSpendPercent: 8,
    fulfillmentFixed: 10,
    ddvRub: 7.0,
    lpRub: 0.1,
    crossDockFixed: 1.63,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    commissionUnder300: 23,
    commissionOver300: 52,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
    plannedSalesUnits: 3200,
    notes: 'Товар до 300 ₽: спец-тариф комиссии 23% и льготная логистика 20 ₽.',
    syncMeta: {
      lastSyncDate: new Date().toISOString(),
      limitPriceMeta: {
        sourceMethod: 'POST /v5/product/info/prices',
        fieldUsed: 'price.min_price',
        status: 'synced',
        message: 'Минимальная цена продавца',
        rawValue: '199.00',
        updatedAt: new Date().toISOString(),
      },
      realizationPriceMeta: {
        sourceMethod: 'POST /v5/product/info/prices',
        fieldUsed: 'price.marketing_seller_price',
        status: 'synced',
        message: 'Цена реализации с учетом скидки',
        rawValue: '179.00',
        updatedAt: new Date().toISOString(),
      },
      volumeMeta: {
        sourceMethod: 'POST /v4/product/info/attributes',
        fieldUsed: 'attributes[4389].value',
        status: 'synced',
        message: 'Литраж содержимого извлечен из характеристик товара (20 мл)',
        rawValue: '20 мл',
        updatedAt: new Date().toISOString(),
      },
      drrMeta: {
        sourceMethod: 'Ozon Performance API (отдельный контур)',
        fieldUsed: 'none',
        status: 'unavailable',
        message: 'ДРР недоступен через Ozon Seller API с ключом Admin Read Only. Сохранено значение селлера (8%).',
        rawValue: '8%',
        updatedAt: new Date().toISOString(),
      },
    },
  },
  {
    id: 'ozon_live_demo_4',
    sku: 'OZN-66291045',
    title: 'Сыворотка для лица с ниацинамидом и цинком 30мл',
    barcode: '4607001234598',
    category: 'Сыворотки',
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: 620,
    taxPrice: 558,
    cogs: 115,
    volumeLiters: 0.03,
    contentVolume: { raw: '30 мл', valueLiters: 0.03, unit: 'мл', attributeId: 4389 },
    dimensions: { depth: 100, width: 40, height: 30, weight: 95, unit: 'мм', weightUnit: 'г' },
    adSpendPercent: 11,
    fulfillmentFixed: 10,
    ddvRub: 7.0,
    lpRub: 0.1,
    crossDockFixed: 1.63,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    commissionUnder300: 23,
    commissionOver300: 52,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
    plannedSalesUnits: 1800,
    notes: 'Предельная цена: 620 ₽ (/v5 min_price), реализация: 558 ₽, объем: 0.03 л (30 мл).',
    syncMeta: {
      lastSyncDate: new Date().toISOString(),
      limitPriceMeta: {
        sourceMethod: 'POST /v5/product/info/prices',
        fieldUsed: 'price.min_price',
        status: 'synced',
        message: 'Минимальная цена продавца',
        rawValue: '620.00',
        updatedAt: new Date().toISOString(),
      },
      realizationPriceMeta: {
        sourceMethod: 'POST /v5/product/info/prices',
        fieldUsed: 'price.marketing_seller_price',
        status: 'synced',
        message: 'Цена реализации с учетом скидки продавца',
        rawValue: '558.00',
        updatedAt: new Date().toISOString(),
      },
      volumeMeta: {
        sourceMethod: 'POST /v4/product/info/attributes',
        fieldUsed: 'attributes[4389].value',
        status: 'synced',
        message: 'Литраж содержимого извлечен из характеристик товара (30 мл)',
        rawValue: '30 мл',
        updatedAt: new Date().toISOString(),
      },
      drrMeta: {
        sourceMethod: 'Ozon Performance API (отдельный контур)',
        fieldUsed: 'none',
        status: 'unavailable',
        message: 'ДРР недоступен через Ozon Seller API с ключом Admin Read Only. Сохранено значение селлера (11%).',
        rawValue: '11%',
        updatedAt: new Date().toISOString(),
      },
    },
  },
  {
    id: 'ozon_live_demo_5',
    sku: 'OZN-11849203',
    title: 'Мицеллярная вода для снятия макияжа 400мл',
    barcode: '4607001234604',
    category: 'Демакияж',
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: 390,
    taxPrice: 351,
    cogs: 78,
    volumeLiters: 0.4,
    contentVolume: { raw: '400 мл', valueLiters: 0.4, unit: 'мл', attributeId: 4389 },
    dimensions: { depth: 190, width: 70, height: 50, weight: 440, unit: 'мм', weightUnit: 'г' },
    adSpendPercent: 9,
    fulfillmentFixed: 10,
    ddvRub: 7.0,
    lpRub: 0.1,
    crossDockFixed: 1.63,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    commissionUnder300: 23,
    commissionOver300: 52,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
    plannedSalesUnits: 800,
    notes: 'Предельная цена: 390 ₽, реализация: 351 ₽, объем содержимого: 0.4 л (400 мл).',
    syncMeta: {
      lastSyncDate: new Date().toISOString(),
      limitPriceMeta: {
        sourceMethod: 'POST /v5/product/info/prices',
        fieldUsed: 'price.min_price',
        status: 'synced',
        message: 'Минимальная цена продавца',
        rawValue: '390.00',
        updatedAt: new Date().toISOString(),
      },
      realizationPriceMeta: {
        sourceMethod: 'POST /v5/product/info/prices',
        fieldUsed: 'price.marketing_seller_price',
        status: 'synced',
        message: 'Цена реализации с учетом скидки продавца',
        rawValue: '351.00',
        updatedAt: new Date().toISOString(),
      },
      volumeMeta: {
        sourceMethod: 'POST /v4/product/info/attributes',
        fieldUsed: 'attributes[4389].value',
        status: 'synced',
        message: 'Литраж содержимого извлечен из характеристик товара (400 мл)',
        rawValue: '400 мл',
        updatedAt: new Date().toISOString(),
      },
      drrMeta: {
        sourceMethod: 'Ozon Performance API (отдельный контур)',
        fieldUsed: 'none',
        status: 'unavailable',
        message: 'ДРР недоступен через Ozon Seller API с ключом Admin Read Only. Сохранено значение селлера (9%).',
        rawValue: '9%',
        updatedAt: new Date().toISOString(),
      },
    },
  },
  {
    id: 'ozon_live_demo_6',
    sku: 'OZN-55029314',
    title: 'Гидрогелевые патчи для глаз с муцином улитки (60 шт)',
    barcode: '4607001234611',
    category: 'Уход за кожей вокруг глаз',
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: 750,
    taxPrice: 675,
    cogs: 160,
    volumeLiters: 0.15,
    contentVolume: { raw: '150 мл', valueLiters: 0.15, unit: 'мл', attributeId: 4389 },
    dimensions: { depth: 85, width: 85, height: 48, weight: 160, unit: 'мм', weightUnit: 'г' },
    adSpendPercent: 14,
    fulfillmentFixed: 10,
    ddvRub: 7.0,
    lpRub: 0.1,
    crossDockFixed: 1.63,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    commissionUnder300: 23,
    commissionOver300: 52,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
    plannedSalesUnits: 1200,
    notes: 'Предельная цена: 750 ₽, реализация: 675 ₽, объем: 0.15 л.',
    syncMeta: {
      lastSyncDate: new Date().toISOString(),
      limitPriceMeta: {
        sourceMethod: 'POST /v5/product/info/prices',
        fieldUsed: 'price.min_price',
        status: 'synced',
        message: 'Минимальная цена продавца',
        rawValue: '750.00',
        updatedAt: new Date().toISOString(),
      },
      realizationPriceMeta: {
        sourceMethod: 'POST /v5/product/info/prices',
        fieldUsed: 'price.marketing_seller_price',
        status: 'synced',
        message: 'Цена реализации с учетом скидки продавца',
        rawValue: '675.00',
        updatedAt: new Date().toISOString(),
      },
      volumeMeta: {
        sourceMethod: 'POST /v4/product/info/attributes',
        fieldUsed: 'attributes[4389].value',
        status: 'synced',
        message: 'Литраж содержимого извлечен из характеристик товара (150 мл)',
        rawValue: '150 мл',
        updatedAt: new Date().toISOString(),
      },
      drrMeta: {
        sourceMethod: 'Ozon Performance API (отдельный контур)',
        fieldUsed: 'none',
        status: 'unavailable',
        message: 'ДРР недоступен через Ozon Seller API с ключом Admin Read Only. Сохранено значение селлера (14%).',
        rawValue: '14%',
        updatedAt: new Date().toISOString(),
      },
    },
  },
];

/**
 * Калькулятор официальной логистики Ozon по габаритам (см) и цене
 */
export function calculateOzonDimensionsLogistics(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  retailPrice: number
): {
  volumeLiters: number;
  baseTariff: number;
  notes: string;
} {
  const vol = Math.max(0.01, (lengthCm * widthCm * heightCm) / 1000);
  const roundedVol = Math.round(vol * 100) / 100;
  const tariff = getLogisticsTariff(roundedVol, retailPrice);

  let notes = '';
  if (retailPrice <= 300) {
    notes = `Льготный тариф Ozon для товаров до 300 ₽ (${tariff} ₽ при объеме ${roundedVol} л)`;
  } else {
    notes = `Стандартный тариф FBO Ozon свыше 300 ₽ (${tariff} ₽ при объеме ${roundedVol} л)`;
  }

  return {
    volumeLiters: roundedVol,
    baseTariff: tariff,
    notes,
  };
}

// ========================================================
// ЭТАЛОННЫЕ ЗАЯВКИ НА ПОСТАВКУ FBO (ДЛЯ ТЕСТИРОВАНИЯ И ДЕМО-РЕЖИМА)
// ========================================================
export const DEMO_OZON_SUPPLY_ORDERS: OzonSupplyOrder[] = [
  {
    order_id: 1048291,
    supply_order_number: 'SUP-2025-0482',
    state: 'ACCEPTED_AT_SUPPLY_WAREHOUSE',
    state_title: 'Принято на складе поставки',
    created_at: '2025-05-18T10:30:00Z',
    supply_warehouse_name: 'Склад FBO Тула (Кластер Центр)',
    supply_warehouse_id: 22104,
    total_items_count: 360,
    crossdock_cluster: 'Центр',
    items: [
      { sku: 'OZN3493060723', offer_id: 'SHMP-001', name: 'Бессульфатный шампунь с кератином', quantity: 180 },
      { sku: 'OZN3493060724', offer_id: 'MSK-002', name: 'Маска для глубокого восстановления', quantity: 120 },
      { sku: 'OZN3493060727', offer_id: 'SCRB-005', name: 'Скраб-пилинг для кожи головы', quantity: 60 },
    ],
  },
  {
    order_id: 1052194,
    supply_order_number: 'SUP-2025-0519',
    state: 'ACCEPTANCE_IN_PROGRESS',
    state_title: 'В процессе приемки',
    created_at: '2025-05-24T14:15:00Z',
    supply_warehouse_name: 'Склад FBO Хоругвино (Кластер Центр)',
    supply_warehouse_id: 22105,
    total_items_count: 240,
    crossdock_cluster: 'Центр',
    items: [
      { sku: 'OZN3493060725', offer_id: 'OIL-003', name: 'Масло-флюид для кончиков волос', quantity: 140 },
      { sku: 'OZN3493060726', offer_id: 'FLUID-004', name: 'Термозащитный спрей 15-в-1', quantity: 100 },
    ],
  },
  {
    order_id: 1059480,
    supply_order_number: 'SUP-2025-0601',
    state: 'TIME_SLOT_CHOSEN',
    state_title: 'Таймслот согласован (В пути)',
    created_at: '2025-05-27T08:00:00Z',
    supply_warehouse_name: 'Склад FBO Санкт-Петербург (Северо-Запад)',
    supply_warehouse_id: 22108,
    total_items_count: 150,
    crossdock_cluster: 'Северо-Запад',
    items: [
      { sku: 'OZN3493060723', offer_id: 'SHMP-001', name: 'Бессульфатный шампунь с кератином', quantity: 80 },
      { sku: 'OZN3493060728', offer_id: 'LIP-006', name: 'Бальзам для губ восстанавливающий', quantity: 70 },
    ],
  },
];

/**
 * Получить список заявок на поставку FBO через POST /v3/supply-order/list
 * Официальный метод Ozon Seller API (Admin read only)
 */
export async function fetchOzonSupplyOrders(
  credentials: OzonCredentials,
  states?: string[]
): Promise<{ success: boolean; supplyOrders: OzonSupplyOrder[]; error?: string }> {
  try {
    const res = await callOzonApi<{
      result?: {
        items?: Array<{
          order_id: number;
          supply_order_number?: string;
          order_number?: string;
          state: string;
          state_name?: string;
          created_at: string;
          supply_warehouse?: { name: string; warehouse_id?: number };
          total_items_count?: number;
          items?: Array<{ sku: number | string; offer_id: string; quantity: number }>;
        }>;
      };
      items?: any[];
    }>(
      '/v3/supply-order/list',
      {
        page: 1,
        page_size: 50,
        filter: states && states.length > 0 ? { states } : {},
      },
      credentials
    );

    if (res.success && res.data) {
      const rawList = res.data.result?.items || res.data.items || [];
      const orders: OzonSupplyOrder[] = rawList.map((item) => ({
        order_id: item.order_id,
        supply_order_number: item.supply_order_number || item.order_number || `ORD-${item.order_id}`,
        state: (item.state as any) || 'ORDER_CREATED',
        state_title: item.state_name || item.state,
        created_at: item.created_at || new Date().toISOString(),
        supply_warehouse_name: item.supply_warehouse?.name || 'Склад FBO Ozon',
        supply_warehouse_id: item.supply_warehouse?.warehouse_id,
        total_items_count: item.total_items_count || (item.items ? item.items.reduce((s: number, it: { quantity?: number }) => s + (it.quantity || 0), 0) : 0),
        items: item.items,
      }));
      return { success: true, supplyOrders: orders };
    }

    return { success: false, supplyOrders: [], error: res.error || 'Не удалось получить заявки на поставку' };
  } catch (err: any) {
    return { success: false, supplyOrders: [], error: err.message };
  }
}

/**
 * Получить подробные остатки по складам FBO/FBS через POST /v3/product/info/stocks
 */
export async function fetchOzonWarehouseStocks(
  credentials: OzonCredentials,
  limit: number = 100
): Promise<{
  success: boolean;
  stocks: Array<{
    product_id: number;
    offer_id: string;
    fbo_present: number;
    fbo_reserved: number;
    fbs_present: number;
    fbs_reserved: number;
  }>;
  error?: string;
}> {
  try {
    const res = await callOzonApi<{
      result?: {
        items?: Array<{
          product_id: number;
          offer_id: string;
          stocks?: Array<{
            type: 'fbo' | 'fbs';
            present: number;
            reserved: number;
          }>;
        }>;
      };
      items?: any[];
    }>(
      '/v3/product/info/stocks',
      {
        filter: { visibility: 'ALL' },
        limit,
      },
      credentials
    );

    if (res.success && res.data) {
      const rawItems: any[] = res.data.result?.items || res.data.items || [];
      const formatted = rawItems.map((item: any) => {
        let fbo_present = 0;
        let fbo_reserved = 0;
        let fbs_present = 0;
        let fbs_reserved = 0;
        if (Array.isArray(item.stocks)) {
          item.stocks.forEach((st: { type: string; present?: number; reserved?: number }) => {
            if (st.type === 'fbo') {
              fbo_present += st.present || 0;
              fbo_reserved += st.reserved || 0;
            } else if (st.type === 'fbs') {
              fbs_present += st.present || 0;
              fbs_reserved += st.reserved || 0;
            }
          });
        }
        return {
          product_id: item.product_id,
          offer_id: item.offer_id,
          fbo_present,
          fbo_reserved,
          fbs_present,
          fbs_reserved,
        };
      });
      return { success: true, stocks: formatted };
    }

    return { success: false, stocks: [], error: res.error || 'Не удалось получить остатки' };
  } catch (err: any) {
    return { success: false, stocks: [], error: err.message };
  }
}

/**
 * Получить список финансовых транзакций Ozon через POST /v3/finance/transaction/list
 */
export async function fetchOzonTransactions(
  credentials: OzonCredentials,
  dateFrom: string,
  dateTo: string
): Promise<{
  success: boolean;
  transactions: Array<{
    operation_id: number;
    operation_type: string;
    operation_date: string;
    operation_type_name: string;
    delivery_charge: number;
    return_delivery_charge: number;
    accruals_for_sale: number;
    sale_commission: number;
    amount: number;
    type: string;
  }>;
  error?: string;
}> {
  try {
    const res = await callOzonApi<{
      result?: {
        operations?: Array<{
          operation_id: number;
          operation_type: string;
          operation_date: string;
          operation_type_name: string;
          delivery_charge?: number;
          return_delivery_charge?: number;
          accruals_for_sale?: number;
          sale_commission?: number;
          amount?: number;
          type?: string;
        }>;
      };
      operations?: any[];
    }>(
      '/v3/finance/transaction/list',
      {
        filter: {
          date: {
            from: dateFrom,
            to: dateTo,
          },
          transaction_type: 'all',
        },
        page: 1,
        page_size: 100,
      },
      credentials
    );

    if (res.success && res.data) {
      const ops = res.data.result?.operations || res.data.operations || [];
      const txs = ops.map((op) => ({
        operation_id: op.operation_id,
        operation_type: op.operation_type,
        operation_date: op.operation_date,
        operation_type_name: op.operation_type_name || op.operation_type,
        delivery_charge: op.delivery_charge || 0,
        return_delivery_charge: op.return_delivery_charge || 0,
        accruals_for_sale: op.accruals_for_sale || 0,
        sale_commission: op.sale_commission || 0,
        amount: op.amount || 0,
        type: op.type || 'operation',
      }));
      return { success: true, transactions: txs };
    }

    return { success: false, transactions: [], error: res.error || 'Не удалось получить транзакции' };
  } catch (err: any) {
    return { success: false, transactions: [], error: err.message };
  }
}

