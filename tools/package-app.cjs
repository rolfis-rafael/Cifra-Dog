/* Monta uma distribuição apenas com os arquivos usados em execução. */
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
(async () => {
    const sw = await fs.readFile(path.join(root, 'sw.js'), 'utf8');
    const literal = sw.match(/const ARQUIVOS = (\[[\s\S]*?\n\]);/)[1];
    const files = [...new Set(['sw.js', ...vm.runInNewContext(literal).filter(f => f !== './').map(f => f.replace(/^\.\//, ''))])];
    const destination = path.join(root, 'output/release-v3.0.0');
    let bytes = 0;
    for (const file of files) {
        const source = path.join(root, file), target = path.join(destination, file);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.copyFile(source, target);
        bytes += (await fs.stat(source)).size;
    }
    const report = { directory: destination, files: files.length, bytes, manifest: files };
    await fs.writeFile(path.join(root, 'output/otimizacao/package.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ files: files.length, bytes, directory: destination }));
})().catch(e => { console.error(e); process.exitCode = 1; });
