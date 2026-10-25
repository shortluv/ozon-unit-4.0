/**
 * Vercel Serverless Function: Ozon Seller API Proxy
 * Чистый JavaScript (ES Module) — не требует компиляции TypeScript,
 * исключает ошибки TS2688 на Vercel и работает с нативным fetch Node.js.
 */
export default async function handler(req, res) {
  // 1. Заголовки CORS для работы в браузере
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Client-Id, Api-Key, client-id, api-key'
  );

  // 2. Предварительный запрос CORS (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end('OK');
    return;
  }

  try {
    // 3. Определение целевого пути в Ozon API
    let ozonPath = '';
    if (req.query && req.query.path) {
      if (Array.isArray(req.query.path)) {
        ozonPath = req.query.path.join('/');
      } else if (typeof req.query.path === 'string') {
        ozonPath = req.query.path;
      }
    }

    if (!ozonPath && req.url) {
      const [pathname, search] = req.url.split('?');
      if (search) {
        try {
          const params = new URLSearchParams(search);
          const qp = params.get('path');
          if (qp) ozonPath = qp;
        } catch {
          // ignore
        }
      }
      if (!ozonPath) {
        ozonPath = pathname.replace(/^\/api\/ozon\/?/i, '');
      }
    }

    ozonPath = ozonPath.replace(/^\/+/, '');

    // Защита от ошибочных квадратных скобок Vercel router
    if (ozonPath === '[...path]' || ozonPath === '%5B...path%5D' || ozonPath.startsWith('[...path]')) {
      ozonPath = '';
    }

    // Диагностика при обращении к /api/ozon
    if (!ozonPath) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'Ozon Seller API Proxy (Vercel Serverless Function)',
          timestamp: new Date().toISOString(),
          message: 'Прокси готов к работе. Передавайте Client-Id и Api-Key в заголовках.',
        })
      );
      return;
    }

    const targetUrl = `https://api-seller.ozon.ru/${ozonPath}`;

    // 4. Заголовки авторизации Ozon
    const clientId = req.headers['client-id'] || req.headers['Client-Id'] || '';
    const apiKey = req.headers['api-key'] || req.headers['Api-Key'] || '';
    const contentType = req.headers['content-type'] || 'application/json';

    const headersToSend = {
      'Content-Type': contentType,
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; OzonUnitEconomicsApp/1.0)',
    };

    if (clientId) headersToSend['Client-Id'] = String(clientId).trim();
    if (apiKey) headersToSend['Api-Key'] = String(apiKey).trim();

    // 5. Подготовка тела запроса
    let bodyData = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body !== undefined && req.body !== null) {
        bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      } else {
        bodyData = await new Promise((resolve) => {
          let chunks = '';
          req.on('data', (chunk) => {
            chunks += chunk;
          });
          req.on('end', () => resolve(chunks));
          req.on('error', () => resolve(''));
        });
      }
      if (!bodyData) {
        bodyData = '{}';
      }
    }

    // 6. Запрос к официальному серверу Ozon Seller API
    const ozonRes = await fetch(targetUrl, {
      method: req.method || 'POST',
      headers: headersToSend,
      body: bodyData,
    });

    const responseText = await ozonRes.text();
    const ozonContentType = ozonRes.headers.get('content-type') || 'application/json';

    res.statusCode = ozonRes.status;
    res.setHeader('Content-Type', ozonContentType);
    res.end(responseText);
  } catch (error) {
    console.error('Ozon Proxy Vercel Error:', error);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          message: `Ошибка Vercel Proxy при вызове Ozon API: ${error?.message || String(error)}`,
          code: 'PROXY_FORWARD_ERROR',
        },
      })
    );
  }
}
