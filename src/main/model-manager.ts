import { app } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as https from 'node:https';

const MODEL_NAME = 'ggml-small.en.bin';
const MODEL_URL = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_NAME}`;

function getModelsDir(): string {
  const dir = path.join(app.getPath('userData'), 'models');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getModelPath(): string {
  return path.join(getModelsDir(), MODEL_NAME);
}

export function isModelDownloaded(): boolean {
  const modelPath = getModelPath();
  return fs.existsSync(modelPath) && fs.statSync(modelPath).size > 1_000_000;
}

export interface ModelStatus {
  downloaded: boolean;
  downloading: boolean;
  progress: number;
  modelPath: string | null;
}

let downloading = false;
let downloadProgress = 0;

export function getModelStatus(): ModelStatus {
  return {
    downloaded: isModelDownloaded(),
    downloading,
    progress: downloadProgress,
    modelPath: isModelDownloaded() ? getModelPath() : null,
  };
}

export function downloadModel(
  onProgress: (progress: number) => void
): Promise<void> {
  if (downloading) return Promise.reject(new Error('Already downloading'));
  if (isModelDownloaded()) return Promise.resolve();

  downloading = true;
  downloadProgress = 0;

  return new Promise((resolve, reject) => {
    const filePath = getModelPath();
    const file = fs.createWriteStream(filePath);

    const request = (url: string) => {
      https.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            request(redirectUrl);
            return;
          }
        }

        const totalSize = parseInt(response.headers['content-length'] || '0', 10);
        let downloaded = 0;

        response.on('data', (chunk: Buffer) => {
          downloaded += chunk.length;
          if (totalSize > 0) {
            downloadProgress = Math.round((downloaded / totalSize) * 100);
            onProgress(downloadProgress);
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          downloading = false;
          downloadProgress = 100;
          onProgress(100);
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(filePath, () => {});
        downloading = false;
        downloadProgress = 0;
        reject(err);
      });
    };

    request(MODEL_URL);
  });
}
