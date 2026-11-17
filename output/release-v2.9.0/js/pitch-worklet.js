/* Transposição em tempo real com duas linhas de atraso cruzadas.
   Memória fixa, estéreo, sem FFT, bibliotecas ou decodificação do arquivo inteiro. */
class CifraPitch extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [{ name: 'semitons', defaultValue: 0, minValue: -12, maxValue: 12, automationRate: 'k-rate' }];
    }
    constructor() {
        super();
        this.size = 16384;
        this.mask = this.size - 1;
        this.buffers = [new Float32Array(this.size), new Float32Array(this.size)];
        this.window = 4096;
        this.weights = new Float32Array(2048);
        for (let i = 0; i < 2048; i++) this.weights[i] = Math.sin(Math.PI * i / 2048) ** 2;
        this.write = 0; this.phase = 0; this.ratio = 1; this.wet = 0;
    }
    process(inputs, outputs, parameters) {
        const input = inputs[0], output = outputs[0];
        if (!output?.length) return true;
        const semitons = parameters.semitons[0];
        const target = 2 ** (semitons / 12), wetTarget = Math.abs(semitons) < 0.001 ? 0 : 1;
        const frames = output[0].length;
        const left = input?.[0], right = input?.[1] || left;
        for (let i = 0; i < frames; i++) {
            this.ratio += (target - this.ratio) * 0.002;
            this.wet += (wetTarget - this.wet) * 0.002;
            this.phase += (1 - this.ratio) / this.window;
            if (this.phase < 0) this.phase += 1;
            else if (this.phase >= 1) this.phase -= 1;
            const p1 = this.phase, p2 = p1 < 0.5 ? p1 + 0.5 : p1 - 0.5;
            const w1 = this.weights[(p1 * 2048) | 0], w2 = 1 - w1;
            let r1 = this.write - 128 - p1 * this.window;
            let r2 = this.write - 128 - p2 * this.window;
            if (r1 < 0) r1 += this.size;
            if (r2 < 0) r2 += this.size;
            const a = r1 | 0, b = r2 | 0, f1 = r1 - a, f2 = r2 - b;
            for (let ch = 0; ch < output.length; ch++) {
                const buffer = this.buffers[Math.min(ch, 1)];
                const dry = (ch ? right : left)?.[i] || 0;
                buffer[this.write] = dry;
                const head1 = buffer[a] + (buffer[(a + 1) & this.mask] - buffer[a]) * f1;
                const head2 = buffer[b] + (buffer[(b + 1) & this.mask] - buffer[b]) * f2;
                output[ch][i] = dry * (1 - this.wet) + (head1 * w1 + head2 * w2) * this.wet;
            }
            this.write = (this.write + 1) & this.mask;
        }
        return true;
    }
}
registerProcessor('cifra-pitch', CifraPitch);
