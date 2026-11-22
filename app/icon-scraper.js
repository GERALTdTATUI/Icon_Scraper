import * as cheerio from 'cheerio';

const default_settings = {
  reject_search_downed_domains: false,
  try_path_guessing: true,
  use_external_apis: true,
}

const SELECTORS = [
  'link[rel="icon"]',
  'link[rel="shortcut icon"]',
  'link[rel="apple-touch-icon"]',
  'link[rel="apple-touch-icon-precomposed"]',
  'link[rel="mask-icon"]'
];

const ICON_PATHS = [
  '/favicon.ico',
  '/favicon.png',
  '/favicon.svg',

  '/apple-touch-icon.ico',
  '/apple-touch-icon.png',
  '/apple-touch-icon.svg',

  '/logo.ico',
  '/logo.png',
  '/logo.svg',

  '/luci-static/bootstrap-dark/logo.ico',
  '/luci-static/bootstrap-dark/logo.png',
  '/luci-static/bootstrap-dark/logo.svg',

  '/ui/themes/opnsense/build/images/favicon.ico',
  '/ui/themes/opnsense/build/images/favicon.png',
  '/ui/themes/opnsense/build/images/favicon.svg',

  '/assets/logo/esphome-favicon.ico',
  '/assets/logo/esphome-favicon.png',
  '/assets/logo/esphome-favicon.svg',

  '/static/icons/favicon.ico',
  '/static/icons/favicon.png',
  '/static/icons/favicon.svg',

  '/icons/icon-16.png',
  '/icons/icon-32.png',
  '/icons/icon-64.png',
  '/icons/icon-128.png',
  '/icons/icon-192.png',
  '/icons/icon-256.png',
];

const icon_scraper_apis = [
  'https://geticon.dev/?url=<domain>',
  'https://a.favicon.im/<domain>?larger=true',
  'https://icons.duckduckgo.com/ip3/<domain>.ico'
];

function print_request_details(domain, params) {
  console.log("======================================+++======================================")
  
  console.log(`Searching icon for domain: ${domain}, using:
    Search rejection for donwned hosts: ${params.reject_search_downed_domains ? "YES" : "NO"};
    Path guessing when no icons found normally: ${params.try_path_guessing ? "YES" : "NO"};
    Using external APIs as fallback: ${params.use_external_apis ? "YES" : "NO"};
  `);
}

function send_status(status, type, url, result) {
  switch(status) {
    case "success": console.log(`Icon found through ${type}, redirecting to: ${result}`); break;
    case "error": console.log("Scraper couldn't find any icon: " + url); break;
    default: console.log("Fuction not supported")
  }
  console.log("===============================================================================")
  return result
}

function compare_request_params(array) {
  const full_config = {...array}

  for (let key in default_settings) {
    if (array[key] !== null && array[key] !== undefined) {
      full_config[key] = ["1","true"].includes(String(array[key]).toLocaleLowerCase())
    } else {
      full_config[key] = default_settings[key]
    }
  }
  
  return full_config
}



function getScore(sizes, type) {
  if (sizes === 'any' || type === 'image/svg+xml') return 9999;
  const match = sizes?.match(/(\d+)x(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Retorna a URL do ícone de maior resolução de um site, ou null se falhar/não existir.
 *
 * @param {string} targetUrl - URL do site.
 * @param {number} [timeout=8000] - Tempo limite em ms.
 * @returns {Promise<string|null>}
 */

export async function getBestIcon(targetUrl, params = {}, timeout = 8000) {
  if (!targetUrl || typeof targetUrl !== 'string')
    return send_status("error", null, targetUrl, null);

  const cfg = compare_request_params(params);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const normalizedUrl = /^https?:\/\//i.test(targetUrl)
    ? targetUrl
    : `https://${targetUrl}`;

  let baseUrl = normalizedUrl;

  print_request_details(normalizedUrl, cfg);

  try {
    // Tentativa de scraping convencional
    try {
      const response = await fetch(normalizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: controller.signal
      });

      // Atualiza a URL caso tenha ocorrido redirecionamento
      if (response.url) baseUrl = response.url;

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        let bestIcon = { url: null, score: -1 };

        $(SELECTORS.join(', ')).each((_, el) => {
          const href = $(el).attr('href')?.trim();
          if (!href) return;

          try {
            const absoluteUrl = new URL(href, baseUrl).href;
            const score = getScore(
              $(el).attr('sizes'),
              $(el).attr('type')
            );

            if (score > bestIcon.score) {
              bestIcon = { url: absoluteUrl, score };
            }
          } catch {
            // Ignora URLs inválidas e continua procurando
          }
        });

        if (bestIcon.url) {
          return send_status(
            "success",
            "normal scraping",
            normalizedUrl,
            bestIcon.url
          );
        }
      }

    } catch (e) {
      console.warn(`Normal scraping failed: ${e.message}`);
    }

    if (cfg.reject_search_downed_domains)
      return send_status(
        "error",
        null,
        normalizedUrl,
        new Error("Host down, fetching canceled due to 'Search rejection for donwned hosts' option")
      );

    // Fallback 1: Path guessing
    if (cfg.try_path_guessing) {
      for (const path of ICON_PATHS) {
        try {
          const fallbackUrl = new URL(path, baseUrl).href;

          const headRes = await fetch(fallbackUrl, {
            method: 'GET',
            signal: controller.signal
          });

          if (headRes.ok) {
            return send_status(
              "success",
              "path guessing",
              normalizedUrl,
              fallbackUrl
            );
          }
        } catch (e) {
          console.warn(`Path guessing failed (${ICON_PATHS.indexOf(path) + 1}): ${e.message}`);
        }
      }
    }

    // Fallback 2: External APIs
    if (cfg.use_external_apis) {
      for (const api of icon_scraper_apis) {
        try {
          const fallbackUrl = api.replace("<domain>", new URL(baseUrl).hostname);

          const headRes = await fetch(fallbackUrl, {
            method: 'HEAD',
            signal: controller.signal
          });

          if (headRes.ok) {
            return send_status(
              "success",
              "external api",
              normalizedUrl,
              fallbackUrl
            );
          }
        } catch (e) {
          console.warn(`External API failed (${icon_scraper_apis.indexOf(api) + 1}): ${e.message}`);
        }
      }
    }

    return send_status("error", null, normalizedUrl, new Error("Enable to fetch icons from host (offline?) and the domain is invalid for the external APIs"));
  } finally {
    clearTimeout(timer);
  }
}


export default getBestIcon;