import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.COMMON_SITE_URL || 'http://127.0.0.1:8765/';
const browser = await chromium.launch({headless:true});
try {
 const desktop = await browser.newPage({viewport:{width:1365,height:900}});
 const errors = [];
 desktop.on('pageerror', e => errors.push(e.message));
 await desktop.goto(base, {waitUntil:'domcontentloaded'});
 await desktop.waitForURL(/\/terminal\/?(?:index\.html)?(?:\?.*)?$/, {timeout:20000});
 await desktop.getByRole('heading',{name:/Research begins with evidence/i}).waitFor({timeout:20000});
 await desktop.goto(new URL('live/',base).href, {waitUntil:'domcontentloaded'});
 await desktop.getByRole('heading',{name:'Welcome back'}).waitFor({timeout:20000});
 assert.equal(await desktop.evaluate(() => window.COMMON_CONFIG?.communityBackendReady),true);
 assert.equal(await desktop.evaluate(() => typeof window.supabase?.createClient),'function');
 await desktop.getByRole('button',{name:'Create account'}).click();
 await desktop.getByRole('heading',{name:'Create your account'}).waitFor();
 await desktop.locator('[name=name]').fill('Prospective COMMON Member');
 await desktop.locator('[name=email]').fill('not-a-real-signup@example.org');
 await desktop.locator('[name=password]').fill('strong-testing-password');
 // Never submit: no dummy account is created in production.
 await desktop.getByRole('button',{name:'Sign in'}).click();
 await desktop.getByRole('heading',{name:'Welcome back'}).waitFor();
 await desktop.getByRole('button',{name:'Forgot your password?'}).click();
 await desktop.getByRole('heading',{name:'Recover access'}).waitFor();
 assert.deepEqual(errors,[],'Desktop browser errors: '+errors.join('; '));

 const mobile = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const mobileErrors=[];
 mobile.on('pageerror', e=>mobileErrors.push(e.message));
 await mobile.goto(new URL('live/',base).href,{waitUntil:'domcontentloaded'});
 await mobile.getByRole('heading',{name:'Welcome back'}).waitFor({timeout:20000});
 const width=await mobile.evaluate(()=>document.documentElement.scrollWidth);
 assert.ok(width <= 392,'Mobile horizontal overflow: '+width+'px');
 assert.deepEqual(mobileErrors,[],'Mobile browser errors: '+mobileErrors.join('; '));
 console.log('COMMON live frontend smoke passed: public terminal landing, connected auth shell, login, signup, reset, mobile');
} finally { await browser.close(); }
