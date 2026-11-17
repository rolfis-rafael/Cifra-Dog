/* Verificação isolada: usa um perfil novo, sem acessar os dados do navegador do usuário. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output/interface');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const target = path.resolve(root, '.' + pathname);
    if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const file = path.extname(target) ? target : path.join(target, 'index.html');
    fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404).end(); return; }
        res.writeHead(200, { 'Content-Type': (types[path.extname(file)] || 'application/octet-stream') + (['.js', '.css', '.html', '.json'].includes(path.extname(file)) ? '; charset=utf-8' : ''), 'Cache-Control': 'no-cache' });
        res.end(data);
    });
});
(async () => {
    await new Promise(ok => server.listen(0, '127.0.0.1', ok));
    const base = 'http://127.0.0.1:' + server.address().port;
    const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
    const page = await context.newPage();
    const errors = [], checks = [], screenshots = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
    async function route(hash, selector = '#tela > *') {
        await page.goto(base + '/' + hash);
        await page.waitForFunction(() => window.App && document.querySelector('#tela')?.children.length > 0);
        await page.locator(selector).first().waitFor();
        await page.waitForTimeout(160);
    }
    async function shot(name) {
        await page.screenshot({ path: path.join(output, name + '.png') }); screenshots.push(name);
    }
    async function fits(label) {
        const sizes = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
        assert(sizes.content <= sizes.viewport + 1, label + ' overflow: ' + JSON.stringify(sizes));
        checks.push(label);
    }
    try {
        await route('#/');
        if (!await page.evaluate(async () => (await DB.listarMusicas()).some(m => m.cifra?.trim()))) {
            await page.evaluate(() => DB.salvarMusica({ titulo: 'Caderno de ensaio', artista: 'Cifra-Dog', genero: 'rock', tom: 'G', cifra: '[Verso]\nG       D\nUm acorde de cada vez\nEm      C\nA música vem com você', curtida: true }));
            await route('#/');
        }
        await shot('inicio-desktop');
        const musicId = await page.evaluate(async () => (await DB.listarMusicas()).find(m => m.cifra?.trim()).id);
        const repId = await page.evaluate(async () => (await DB.listarRepertorios())[0].id);
        const routes = [ ['inicio', '#/'], ['crie', '#/criar'], ['discografia', '#/biblioteca'], ['pesquisar', '#/buscar'], ['show', '#/show'], ['cifra', '#/cifra/' + musicId], ['repertorio', '#/repertorio/' + repId], ['configuracoes', '#/config'], ['curtidas', '#/curtidas'] ];
        for (const width of [390, 1366]) {
            await page.setViewportSize({ width, height: width < 900 ? 844 : 1000 });
            for (const [name, hash] of routes) {
                await route(hash);
                await fits(name + ' ' + width);
                await shot(name + (width < 900 ? '-mobile' : '-desktop'));
            }
        }
        for (const width of [320, 768, 1920]) {
            await page.setViewportSize({ width, height: 1000 });
            for (const [name, hash] of routes) { await route(hash); await fits(name + ' ' + width); }
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await route('#/');
        const nav = await page.locator('#nav > a[data-rota]').evaluateAll(xs => xs.map(x => ({ route: x.dataset.rota, x: x.getBoundingClientRect().x, width: x.getBoundingClientRect().width })));
        assert.equal(nav[2].route, 'inicio');
        assert(Math.abs(nav[2].x + nav[2].width / 2 - 195) < 1);
        assert.equal(await page.locator('#nav [aria-current="page"]').getAttribute('data-rota'), 'inicio');
        checks.push('Início centralizado e aba atual acessível');
        await route('#/criar', '#c-titulo');
        await page.locator('#c-titulo').fill('Teste da interface');
        await page.locator('#c-artista').fill('Verificação isolada');
        await page.locator('#c-cifra').fill('[Verso]\nG          D\nUma música para testar\nEm         C\nA cifra no palco');
        await page.locator('[data-aba="previa"]').click();
        await page.locator('#c-previa:not([hidden]) .ac').first().waitFor();
        await page.locator('[data-aba="escrever"]').click();
        await page.locator('#f-cifra button[type="submit"]').click();
        await page.waitForURL(/#\/cifra\//);
        await page.locator('#cifra-info .tom-topo').waitFor();
        const keyBefore = await page.locator('.tom-topo .tom-atual').innerText();
        await page.locator('[data-d="tom+"]').click();
        assert.notEqual(await page.locator('.tom-topo .tom-atual').innerText(), keyBefore);
        await page.locator('#bt-curtir').click();
        await page.waitForFunction(async () => (await DB.listarMusicas()).find(m => m.titulo === 'Teste da interface')?.curtida);
        const created = await page.evaluate(async () => (await DB.listarMusicas()).find(m => m.titulo === 'Teste da interface'));
        assert(created.curtida); assert(created.semitons);
        for (let i = 0; i < 5; i++) await page.locator('[data-d="fonte+"]').click();
        await fits('Cifra com letra ampliada');
        await page.locator('[data-d="ajustes"]').click();
        await page.locator('#sheet-fundo:not([hidden])').waitFor();
        await shot('ajustes-mobile');
        await page.keyboard.press('Escape');
        assert(await page.locator('#sheet-fundo').isHidden());
        checks.push('Criar, prévia, salvar, transpor, curtir, ampliar letra e ajustes');
        await route('#/buscar?q=Teste');
        await page.locator('#resultado .linha').first().waitFor();
        assert((await page.locator('#resultado').innerText()).includes('Teste da interface'));
        await route('#/biblioteca');
        const downloadPromise = page.waitForEvent('download');
        await page.locator('[data-exportar]').click();
        const download = await downloadPromise;
        const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
        assert(backup.musicas.some(m => m.titulo === 'Teste da interface'));
        checks.push('Busca e exportação de backup com a cifra criada');
        await page.locator('[data-novo-rep]').first().click();
        await page.locator('#perg-in').fill('Ensaio da taverna');
        await page.locator('#f-perg button').click();
        await page.waitForURL(/#\/repertorio\//);
        await page.locator('#r-add').click();
        await page.locator('#am-filtro').fill('Teste da interface');
        await page.locator('#am-lista [data-m]').first().click();
        await page.locator('#am-ok').click();
        await page.locator('#r-lista .linha').first().waitFor();
        await page.locator('#r-play').click();
        await page.locator('.faixa-rep.show').waitFor();
        assert((await page.locator('.faixa-rep').innerText()).includes('Ensaio da taverna'));
        await page.locator('[data-d="palco"]').count().then(async count => { if (count) await page.locator('[data-d="palco"]').click(); });
        checks.push('Criar repertório, adicionar música e entrar no show');
        await route('#/');
        await page.evaluate(async () => { const registration = await navigator.serviceWorker.ready; if (!registration.active) throw new Error('SW inativo'); });
        await page.reload();
        await page.waitForFunction(() => !!navigator.serviceWorker.controller && window.App && document.querySelector('#tela')?.children.length > 0);
        await context.setOffline(true);
        await page.reload();
        await page.locator('.home-welcome').waitFor();
        await page.locator('#nav [data-rota="biblioteca"]').click();
        await page.locator('.page-intro').waitFor();
        await fits('Navegação offline');
        await context.setOffline(false);
        await page.goto(base + '/v2/#/');
        await page.locator('.home-welcome').waitFor();
        assert.equal(await page.locator('link[href="css/taverna.css"]').count(), 1);
        const sharedSong = await page.evaluate(async () => (await DB.listarMusicas()).find(m => m.titulo === 'Teste da interface'));
        assert(sharedSong); assert(sharedSong.curtida);
        checks.push('v2 atualizada com a mesma interface e banco preservado');
        await page.evaluate(() => navigator.serviceWorker.ready);
        await page.reload();
        await page.waitForFunction(() => !!navigator.serviceWorker.controller && window.App);
        await context.setOffline(true);
        await page.reload();
        await page.locator('.home-welcome').waitFor();
        await context.setOffline(false);
        checks.push('Offline na raiz e em /v2/');
        await page.setViewportSize({ width: 1800, height: 1040 });
        await page.goto(base + '/output/interface/preview.html');
        await page.locator('.screens img').last().waitFor();
        await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
        await page.screenshot({ path: path.join(output, 'visao-geral.png') });
        assert.deepEqual(errors, []);
        fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify({ checks, errors, screenshots, date: new Date().toISOString() }, null, 2));
        console.log(JSON.stringify({ passed: checks.length, errors, screenshots: screenshots.length }));
    } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
