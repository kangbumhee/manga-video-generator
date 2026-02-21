/**
 * APIYI Sora 2 이미지→영상 변환 서비스
 * - FAL.ai 대체
 * - APIYI 통합 키 사용
 */

import { CONFIG } from '../config';

const APIYI_BASE_URL = 'https://api.apiyi.com/v1';

export function getVideoApiKey(): string | null {
  return (typeof localStorage !== 'undefined' ? localStorage.getItem(CONFIG.STORAGE_KEYS.APIYI_API_KEY) : null)
    || (typeof localStorage !== 'undefined' ? localStorage.getItem(CONFIG.STORAGE_KEYS.FAL_API_KEY) : null)
    || (typeof process !== 'undefined' ? (process as any).env?.APIYI_API_KEY : null)
    || (typeof process !== 'undefined' ? (process as any).env?.FAL_API_KEY : null)
    || null;
}

async function uploadImageToApiyi(imageBase64: string, apiKey: string): Promise<string> {
  const binaryString = atob(imageBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'image/png' });
  const formData = new FormData();
  formData.append('file', blob, 'reference_image.png');
  formData.append('purpose', 'user_data');

  const response = await fetch(`${APIYI_BASE_URL}/files`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) throw new Error(`파일 업로드 실패: ${response.status}`);
  const data = await response.json();
  return data.id;
}

async function createVideoTask(fileId: string, motionPrompt: string, apiKey: string, duration: number = 4): Promise<string> {
  const response = await fetch(`${APIYI_BASE_URL}/videos/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'sora-2',
      input: { prompt: motionPrompt, image_url: fileId },
      size: '1280x720',
      seconds: duration,
    }),
  });

  if (!response.ok) throw new Error(`영상 생성 요청 실패: ${response.status}`);
  const data = await response.json();
  return data.id;
}

async function pollVideoStatus(taskId: string, apiKey: string, maxWaitMs: number = 300000, intervalMs: number = 5000): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(`${APIYI_BASE_URL}/videos/${taskId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!response.ok) throw new Error(`상태 확인 실패: ${response.status}`);

    const data = await response.json();
    if (data.status === 'completed' || data.status === 'succeeded') {
      const videoUrl = data.video_url || data.output?.video_url || data.data?.[0]?.url || data.result?.url;
      if (videoUrl) return videoUrl;
      throw new Error('영상 URL을 찾을 수 없습니다');
    }
    if (data.status === 'failed' || data.status === 'error') {
      throw new Error(`영상 생성 실패: ${data.error || '알 수 없는 오류'}`);
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error('영상 생성 시간 초과 (5분)');
}

export async function generateVideoFromImage(imageBase64: string, motionPrompt: string, apiKey?: string): Promise<string | null> {
  const key = apiKey || getVideoApiKey();
  if (!key) return null;
  try {
    const fileId = await uploadImageToApiyi(imageBase64, key);
    const taskId = await createVideoTask(fileId, motionPrompt, key, 4);
    return await pollVideoStatus(taskId, key);
  } catch (error: any) {
    console.error('[Video Gen]', error.message);
    return null;
  }
}

export function getFalApiKey(): string | null { return getVideoApiKey(); }
export function setFalApiKey(key: string): void { localStorage.setItem(CONFIG.STORAGE_KEYS.FAL_API_KEY, key); }

export async function fetchVideoAsBase64(videoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

export async function batchGenerateVideos(
  assets: Array<{ imageData: string; visualPrompt: string }>,
  apiKey?: string,
  onProgress?: (index: number, total: number) => void
): Promise<(string | null)[]> {
  const results: (string | null)[] = [];
  const key = apiKey || getVideoApiKey();
  for (let i = 0; i < assets.length; i++) {
    onProgress?.(i + 1, assets.length);
    results.push(await generateVideoFromImage(assets[i].imageData, assets[i].visualPrompt, key));
    if (i < assets.length - 1) await new Promise(r => setTimeout(r, 1000));
  }
  return results;
}
