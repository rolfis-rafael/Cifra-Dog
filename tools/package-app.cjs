/* Monta uma distribuição apenas com os arquivos usados em execução. */
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const app = path.join(root, 'v2');
(async () => {
    const sw = await fs.readFile(path.join(app, 'sw.js'), 'utf8');
    const version = sw.match(/const VERSAO = PREFIXO \+ '([\d.]+)'/)[1];
    const literal = sw.match(/const ARQUIVOS = (\[[\s\S]*?\n\]);/)[1];
    const assets = vm.runInNewContext(literal).filter(f => f !== './').map(f => f.replace(/^\.\//, ''));
    const downloads = (await fs.readdir(path.join(app, 'repertorios'), { withFileTypes: true }))
        .filter(item => item.isFile() && item.name.endsWith('.json'))
        .map(item => 'repertorios/' + item.name);
    const files = [...new Set(['sw.js', ...assets, ...downloads])];
    const destination = path.join(root, 'output', 'release-v' + version);
    let bytes = 0;
    for (const file of files) {
        const source = path.join(app, file), target = path.join(destination, file);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.copyFile(source, target);
        bytes += (await fs.stat(source)).size;
    }
    console.log(JSON.stringify({ files: files.length, bytes, directory: destination }));
})().catch(e => { console.error(e); process.exitCode = 1; });
