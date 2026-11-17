const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
let Processor;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/pitch-worklet.js'), 'utf8'), {
    AudioWorkletProcessor: class {}, Float32Array, Math,
    registerProcessor: (name, Class) => { assert.equal(name, 'cifra-pitch'); Processor = Class; },
});
const sr = 48000, frames = 48000, block = 128;
function peak(samples, expected) {
    const start = 22000, length = 24000;
    let best = 0, freq = 0;
    for (let f = expected - 24; f <= expected + 24; f += 0.5) {
        const coeff = 2 * Math.cos(2 * Math.PI * f / sr);
        let p1 = 0, p2 = 0;
        for (let i = start; i < start + length; i++) {
            const p = samples[i] + coeff * p1 - p2; p2 = p1; p1 = p;
        }
        const power = p1 * p1 + p2 * p2 - coeff * p1 * p2;
        if (power > best) { best = power; freq = f; }
    }
    return freq;
}
const results = [];
for (const semitons of [-12, -5, -2, 0, 1, 2, 5, 12]) {
    const p = new Processor(), result = [new Float32Array(frames), new Float32Array(frames)];
    const begin = performance.now();
    for (let pos = 0; pos < frames; pos += block) {
        const n = Math.min(block, frames - pos), input = [new Float32Array(n), new Float32Array(n)], output = [new Float32Array(n), new Float32Array(n)];
        for (let i = 0; i < n; i++) { input[0][i] = .5 * Math.sin(2 * Math.PI * 440 * (pos + i) / sr); input[1][i] = .5 * Math.sin(2 * Math.PI * 660 * (pos + i) / sr); }
        p.process([input], [output], { semitons: new Float32Array([semitons]) });
        for (let ch = 0; ch < 2; ch++) result[ch].set(output[ch], pos);
    }
    const elapsed = performance.now() - begin;
    const expected = 440 * 2 ** (semitons / 12), measured = peak(result[0], expected);
    assert(Math.abs(measured - expected) < 14, 'Afinação fora da tolerância: ' + semitons + ' ' + measured + '/' + expected);
    assert(result.every(ch => ch.every(v => Number.isFinite(v) && Math.abs(v) <= .501)), 'Saída instável');
    assert(elapsed < 1000, 'Processamento mais lento que tempo real');
    if (!semitons) for (let i = 100; i < frames; i++) assert(Math.abs(result[0][i] - .5 * Math.sin(2 * Math.PI * 440 * i / sr)) < 1e-6);
    const expectedRight = 660 * 2 ** (semitons / 12), measuredRight = peak(result[1], expectedRight);
    assert(Math.abs(measuredRight - expectedRight) < 14, 'Canal direito fora da tolerância');
    results.push({ semitons, expectedHz: +expected.toFixed(2), measuredHz: +measured.toFixed(2), rightHz: +measuredRight.toFixed(2), processMsPerSecond: +elapsed.toFixed(2), bufferBytes: p.buffers.reduce((n, b) => n + b.byteLength, 0) + p.weights.byteLength });
}
const silent = new Processor();
const out = [new Float32Array(128), new Float32Array(128)];
silent.process([[]], [out], { semitons: new Float32Array([5]) });
assert(out.every(ch => ch.every(v => v === 0)));
const outputPath = path.join(__dirname, '../output/estudio/pitch-verification.json');
fs.writeFileSync(outputPath, JSON.stringify({ results, silence: 'passed', note: 'Benchmark de DSP em Node, não representa medição em celular físico. A técnica granular pode introduzir coloração no áudio.' }, null, 2));
console.log(JSON.stringify(results));
