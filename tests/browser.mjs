import { chromium } from 'playwright';

export function launchBrowser() {
  const proxy = process.env.COMMON_BROWSER_PROXY;
  const proxyCertificate = process.env.COMMON_BROWSER_PROXY_SPKI;
  return chromium.launch(proxy ? {
    args: [`--proxy-server=${proxy}`, '--proxy-bypass-list=127.0.0.1;localhost',
      ...(proxyCertificate ? [`--ignore-certificate-errors-spki-list=${proxyCertificate}`] : [])]
  } : {});
}
