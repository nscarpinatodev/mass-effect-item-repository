import puppeteer from 'puppeteer-core';
import path from 'path';
import { pathToFileURL } from 'url';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 1400, deviceScaleFactor: 1 });
const url = pathToFileURL(path.resolve('assets/journal-viewer/mockup.html')).href;
await page.goto(url, { waitUntil: 'networkidle0' });
await page.screenshot({ path: 'assets/journal-viewer/_render.png' });
await browser.close();
console.log('rendered');
