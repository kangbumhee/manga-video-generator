// FAL.ai Image-to-Video Service (멀티모델)
// Seedance Lite / PixVerse v4 / PixVerse v5.6 선택 가능

import { CONFIG, VIDEO_MODELS, VideoModelId } from '../config';

const FAL_API_BASE = 'https://queue.fal.run';

export function getFalApiKey(): string | null {
  const key = localStorage.getItem(CONFIG.STORAGE_KEYS.FAL_API_KEY) || '';
  if (!key) {
    console.warn('[Video Gen] FAL.ai API 키가 설정되지 않았습니다. 설정 탭에서 입력해주세요.');
    return null;
  }
  return key;
}

export function setFalApiKey(key: string): void {
  localStorage.setItem(CONFIG.STORAGE_KEYS.FAL_API_KEY, key);
}

/** 선택된 영상 모델 ID (FAL 엔드포인트) */
function getVideoModelId(): string {
  const id = (typeof localStorage !== 'undefined' ? localStorage.getItem(CONFIG.STORAGE_KEYS.VIDEO_MODEL) : null) || 'seedance-lite';
  const model = VIDEO_MODELS[id as VideoModelId];
  return model?.id ?? VIDEO_MODELS['seedance-lite'].id;
}

interface VideoRequest {
  image_url: string;
  prompt?: string;
  duration?: number;
  resolution?: string;
  negative_prompt?: string;
}

// base64 이미지를 임시 URL로 변환 (FAL.ai file upload)
async function uploadImageToFal(base64Data: string): Promise<string> {
  const apiKey = getFalApiKey();
  if (!apiKey) throw new Error('[Video Gen] FAL.ai API 키가 없습니다');

  const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = atob(base64Clean);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'image/png' });

  const response = await fetch('https://fal.run/fal-ai/file-upload', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'image/png',
    },
    body: blob,
  });

  if (!response.ok) {
    console.warn('[Video Gen] 파일 업로드 실패, data URL 사용');
    return `data:image/png;base64,${base64Clean}`;
  }

  const result = await response.json();
  return result.url || result.file_url;
}

// 영상 생성 요청 (큐 방식)
async function submitVideoGeneration(modelId: string, params: VideoRequest): Promise<string> {
  const apiKey = getFalApiKey();
  if (!apiKey) throw new Error('[Video Gen] FAL.ai API 키가 없습니다');

  const body: Record<string, unknown> = {
    image_url: params.image_url,
    prompt: params.prompt || 'gentle subtle cartoon animation, slight character movement',
    duration: params.duration ?? 5,
    resolution: params.resolution || '720p',
  };
  if (params.negative_prompt) body.negative_prompt = params.negative_prompt;

  const response = await fetch(`${FAL_API_BASE}/${modelId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`[Video Gen] 요청 실패: ${response.status} - ${error}`);
  }

  const result = await response.json();

  if (result.video?.url) {
    return result.video.url;
  }

  const requestId = result.request_id;
  if (!requestId) {
    throw new Error('[Video Gen] request_id가 없습니다');
  }

  console.log(`[Video Gen] 큐 등록됨: ${requestId}`);
  return await pollForResult(modelId, requestId);
}

// 결과 폴링 (최대 5분)
async function pollForResult(modelId: string, requestId: string): Promise<string> {
  const apiKey = getFalApiKey();
  if (!apiKey) throw new Error('[Video Gen] FAL.ai API 키가 없습니다');

  const maxAttempts = 60;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    const statusResponse = await fetch(
      `${FAL_API_BASE}/${modelId}/requests/${requestId}/status`,
      { headers: { 'Authorization': `Key ${apiKey}` } }
    );

    if (!statusResponse.ok) continue;

    const status = await statusResponse.json();
    console.log(`[Video Gen] 상태: ${status.status} (${i + 1}/${maxAttempts})`);

    if (status.status === 'COMPLETED') {
      const resultResponse = await fetch(
        `${FAL_API_BASE}/${modelId}/requests/${requestId}`,
        { headers: { 'Authorization': `Key ${apiKey}` } }
      );
      const result = await resultResponse.json();
      if (result.video?.url) return result.video.url;
      throw new Error('[Video Gen] 완료되었으나 video URL 없음');
    }

    if (status.status === 'FAILED') {
      throw new Error(`[Video Gen] 생성 실패: ${status.error || '알 수 없는 오류'}`);
    }
  }

  throw new Error('[Video Gen] 타임아웃: 5분 초과');
}

// 영상 URL을 base64 data URL로 변환
async function videoUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// === 메인 내보내기 함수 ===

export async function generateVideoFromImage(
  imageBase64: string,
  motionPrompt?: string,
  onProgress?: (msg: string) => void
): Promise<string | null> {
  const apiKey = getFalApiKey();
  if (!apiKey) return null;

  const modelId = getVideoModelId();
  console.log(`[Video Gen] 모델: ${modelId}`);

  try {
    onProgress?.('[Video Gen] 이미지 업로드 중...');
    const imageUrl = await uploadImageToFal(imageBase64);
    console.log('[Video Gen] 이미지 업로드 완료');

    onProgress?.('[Video Gen] 영상 생성 요청 중... (1~3분 소요)');
    const videoUrl = await submitVideoGeneration(modelId, {
      image_url: imageUrl,
      prompt: motionPrompt || 'gentle subtle cartoon animation, slight character movement',
      duration: 5,
      resolution: '720p',
    });
    console.log('[Video Gen] 영상 생성 완료:', videoUrl);

    onProgress?.('[Video Gen] 영상 다운로드 중...');
    const videoDataUrl = await videoUrlToBase64(videoUrl);

    return videoDataUrl;
  } catch (error: any) {
    console.error(`[Video Gen] 영상 생성 실패: ${error.message}`);
    return null;
  }
}

export async function generateVideoFromImageUrl(
  imageUrl: string,
  motionPrompt?: string,
  onProgress?: (msg: string) => void
): Promise<string | null> {
  const apiKey = getFalApiKey();
  if (!apiKey) return null;

  const modelId = getVideoModelId();

  try {
    onProgress?.('[Video Gen] 영상 생성 요청 중... (1~3분 소요)');
    const videoUrl = await submitVideoGeneration(modelId, {
      image_url: imageUrl,
      prompt: motionPrompt || 'gentle subtle cartoon animation, slight character movement',
      duration: 5,
      resolution: '720p',
    });

    onProgress?.('[Video Gen] 영상 다운로드 중...');
    return await videoUrlToBase64(videoUrl);
  } catch (error: any) {
    console.error(`[Video Gen] 영상 생성 실패: ${error.message}`);
    return null;
  }
}

// 호환성을 위한 fetch 함수 (URL → base64)
export async function fetchVideoAsBase64(videoUrl: string): Promise<string | null> {
  try {
    const dataUrl = await videoUrlToBase64(videoUrl);
    return (dataUrl && dataUrl.includes(',')) ? dataUrl.split(',')[1] : null;
  } catch {
    return null;
  }
}
