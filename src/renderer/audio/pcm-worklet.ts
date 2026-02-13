// AudioWorkletProcessor that captures microphone audio and resamples to 16kHz mono PCM
// This file runs in the AudioWorklet scope

class PCMProcessor extends AudioWorkletProcessor {
  private buffer: Float32Array[] = [];
  private sampleCount = 0;
  // Collect ~5 seconds of audio at sampleRate before sending
  private readonly CHUNK_DURATION = 5;

  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    this.buffer.push(new Float32Array(channelData));
    this.sampleCount += channelData.length;

    // sampleRate is available in AudioWorkletGlobalScope
    const samplesNeeded = sampleRate * this.CHUNK_DURATION;
    if (this.sampleCount >= samplesNeeded) {
      this.flush();
    }

    return true;
  }

  private flush(): void {
    // Concatenate all buffered samples
    const totalSamples = this.buffer.reduce((sum, b) => sum + b.length, 0);
    const fullBuffer = new Float32Array(totalSamples);
    let offset = 0;
    for (const chunk of this.buffer) {
      fullBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    // Resample to 16kHz
    const targetRate = 16000;
    const ratio = sampleRate / targetRate;
    const targetLength = Math.floor(totalSamples / ratio);
    const resampled = new Float32Array(targetLength);

    for (let i = 0; i < targetLength; i++) {
      const srcIndex = i * ratio;
      const srcFloor = Math.floor(srcIndex);
      const frac = srcIndex - srcFloor;
      const a = fullBuffer[srcFloor] || 0;
      const b = fullBuffer[Math.min(srcFloor + 1, totalSamples - 1)] || 0;
      resampled[i] = a + frac * (b - a);
    }

    this.port.postMessage({ type: 'pcm-chunk', audio: resampled }, [resampled.buffer]);

    this.buffer = [];
    this.sampleCount = 0;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
