/* Codificação e dimensionamento das artes existentes; preserva os PNGs originais. */
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const sharp = require(process.env.CIFRADOG_SHARP || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));
const root = path.resolve(__dirname, '..');
const assets = [
    { name: 'taverna/pub-background', quality: 82 },
    { name: 'taverna/pub-mobile', quality: 82 },
    { name: 'taverna/covers-atlas', quality: 88 },
    { name: 'taverna/materials-atlas', quality: 86 },
    { name: 'brand/genres-atlas', quality: 90 },
    { name: 'brand/dog-pub', quality: 90, width: 512 },
    { name: 'brand/logo-pub', quality: 92, width: 720 },
];
(async () => {
    const results = [];
    for (const asset of assets) {
        const source = path.join(root, 'img', asset.name + '.png');
        const destination = path.join(root, 'img', asset.name + '.webp');
        let pipeline = sharp(source);
        if (asset.width) pipeline = pipeline.resize({ width: asset.width, withoutEnlargement: true });
        const info = await pipeline.webp({ quality: asset.quality, effort: 6, alphaQuality: 100, smartSubsample: true }).toFile(destination);
        results.push({ file: asset.name, originalBytes: (await fs.stat(source)).size, optimizedBytes: info.size, width: info.width, height: info.height });
    }
    const mascot = path.join(root, 'img/brand/dog-pub.png');
    for (const size of [180, 192, 512]) {
        await sharp(mascot).resize(size, size).png({ compressionLevel: 9, palette: true, quality: 100 }).toFile(path.join(root, 'img/brand/icon-' + size + '.png'));
    }
    const originalBytes = results.reduce((n, a) => n + a.originalBytes, 0);
    const optimizedBytes = results.reduce((n, a) => n + a.optimizedBytes, 0);
    const report = { originalBytes, optimizedBytes, reductionPercent: +(100 * (1 - optimizedBytes / originalBytes)).toFixed(2), assets: results, source: 'Artes originais preservadas nos arquivos PNG; WebP usado pelo aplicativo.' };
    await fs.mkdir(path.join(root, 'output/otimizacao'), { recursive: true });
    await fs.writeFile(path.join(root, 'output/otimizacao/assets.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
})().catch(e => { console.error(e); process.exitCode = 1; });
