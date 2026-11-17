const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
    const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
    const page = await browser.newPage({ viewport: { width: 1366, height: 1000 } });
    const result = { provider: 'YouTube', simulated: false, api: false, iframe: false, ready: false };
    try {
        await page.goto('http://localhost/Cifra-Dog-main/');
        await page.waitForFunction(() => window.App && document.querySelector('#tela')?.children.length, { timeout: 12000 });
        const id = await page.evaluate(async () => (await DB.listarMusicas())[0]?.id);
        if (!id) throw new Error('Sem música disponível no perfil isolado');
        await page.goto('http://localhost/Cifra-Dog-main/#/cifra/' + id);
        await page.locator('#abrir-aprender').click();
        await page.locator('#aula-link').fill('https://www.youtube.com/watch?v=M7lc1UVf-VE');
        await page.locator('#aula-link-form button').click();
        await page.waitForFunction(() => {
            const text = document.querySelector('#aula-status')?.textContent || '';
            return text.startsWith('Dê o play') || text.startsWith('Não foi') || text.startsWith('Este vídeo') || text.startsWith('Vídeo removido') || text.startsWith('O YouTube');
        }, null, { timeout: 22000 });
        result.api = await page.evaluate(() => !!window.YT?.Player);
        result.iframe = await page.locator('#aula-youtube iframe').count() > 0;
        result.message = await page.locator('#aula-status').textContent();
        result.ready = result.message.startsWith('Dê o play');
        await page.screenshot({ path: path.resolve(__dirname, '../output/estudio/youtube-live.png') });
    } catch (e) { result.message = e.message; }
    finally { await browser.close(); }
    fs.writeFileSync(path.resolve(__dirname, '../output/estudio/youtube-live.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
})().catch(e => { console.error(e); process.exitCode = 1; });
