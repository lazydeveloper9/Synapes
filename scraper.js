const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
    const execPathStr = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    ].find(p => fs.existsSync(p));

    if (!execPathStr) {
        console.log("Could not find Chrome or Edge.");
        process.exit(1);
    }

    const browser = await puppeteer.launch({
        executablePath: execPathStr,
        headless: "new"
    });

    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    console.log("Navigating to dashboard...");
    await page.goto('http://localhost:5173/dashboard');
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
})();
