/**
 * APIYI Sora 2 이미지→영상 변환 서비스
 * - FAL.ai 대체
 * - APIYI 통합 키 사용
 * - Sora 2 비동기 API
 */

import { CONFIG } from '../config';

// APIYI 기본 URL
const APIYI_BASE_URL = 'https://api.apiyi.com/v1';

/**
 * APIYI API 키 가져오기
 */
export function getVideoApiKey(): string | null {
  return (typeof localStorage !== 'undefined' ? localStorage.getItem(CONFIG.STORAGE_KEYS.APIYI_API_KEY) : null)
    || (typeof localStorage !== 'undefined' ? localStorage.getItem(CONFIG.STORAGE_KEYS.FAL_API_KEY) : null)  // 폴백: 기존 FAL 키
    || (typeof process !== 'undefined' ? (process as any).env?.APIYI_API_KEY : null)
    || (typeof process !== 'undefined' ? (process as any).env?.FAL_API_KEY : null)
    || null;
}

/**
 * 이미지 파일을 APIYI에 업로드 (OpenAI Files API 호환)
 */
async function uploadImageToApiyi(imageBase64: string, apiKey: string): Promise<string> {
  const binaryString = atob(imageBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'image/png' });

  const formData = new FormData();
  formData.append('file', blob, 'reference_image.png');
  formData.append('purpose', 'user_data');

  const response = await fetch(`${APIYI_BASE_URL}/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`파일 업로드 실패: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[Video Gen] 이미지 업로드 완료:', data.id);
  return data.id;  // file_id 반환
}

/**
 * Sora 2 이미지→영상 생성 요청
 */
async function createVideoTask(
  fileId: string,
  motionPrompt: string,
  apiKey: string,
  duration: number = 4
): Promise<string> {
  const response = await fetch(`${APIYI_BASE_URL}/videos/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'sora-2',
      input: {
        prompt: motionPrompt,
        image_url: fileId,
      },
      size: '1280x720',
      seconds: duration,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`영상 생성 요청 실패: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[Video Gen] 영상 생성 작업 생성:', data.id);
  return data.id;
}

/**
 * 영상 생성 상태 폴링
 */
async function pollVideoStatus(
  taskId: string,
  apiKey: string,
  maxWaitMs: number = 300000,
  intervalMs: number = 5000
): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(`${APIYI_BASE_URL}/videos/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`상태 확인 실패: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Video Gen] 상태: ${data.status}`);

    if (data.status === 'completed' || data.status === 'succeeded') {
      const videoUrl = data.video_url
        || data.output?.video_url
        || data.data?.[0]?.url
        || data.result?.url;

      if (videoUrl) {
        console.log('[Video Gen] 영상 생성 완료:', videoUrl);
        return videoUrl;
      }
      throw new Error('영상 URL을 찾을 수 없습니다');
    }

    if (data.status === 'failed' || data.status === 'error') {
      throw new Error(`영상 생성 실패: ${data.error || '알 수 없는 오류'}`);
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('영상 생성 시간 초과 (5분)');
}

/**
 * 메인 함수: 이미지를 영상으로 변환 (APIYI Sora 2)
 */
export async function generateVideoFromImage(
  imageBase64: string,
  motionPrompt: string,
  apiKey?: string
): Promise<string | null> {
  const key = apiKey || getVideoApiKey();

  if (!key) {
    console.warn('[Video Gen] API 키가 설정되지 않았습니다.');
    return null;
  }

  try {
    console.log(`[Video Gen] Sora 2 영상 생성 시작: "${motionPrompt.slice(0, 50)}..."`);

    // 1단계: 이미지 업로드
    const fileId = await uploadImageToApiyi(imageBase64, key);

    // 2단계: 영상 생성 요청
    const taskId = await createVideoTask(fileId, motionPrompt, key, 4);

    // 3단계: 폴링으로 결과 대기
    const videoUrl = await pollVideoStatus(taskId, key);

    return videoUrl;
  } catch (error: any) {
    console.error('[Video Gen] 영상 생성 실패:', error.message);
    return null;
  }
}

/**
 * FAL API 키 가져오기 (하위 호환성)
 */
export function getFalApiKey(): string | null {
  return getVideoApiKey();
}

/**
 * FAL API 키 저장 (하위 호환성)
 */
export function setFalApiKey(key: string): void {
  localStorage.setItem(CONFIG.STORAGE_KEYS.FAL_API_KEY, key);
}

/**
 * 영상 URL에서 base64 데이터로 변환
 */
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
  } catch {
    return null;
  }
}

/**
 * 여러 이미지를 순차적으로 영상 변환
 */
export async function batchGenerateVideos(
  assets: Array<{ imageData: string; visualPrompt: string }>,
  apiKey?: string,
  onProgress?: (index: number, total: number) => void
): Promise<(string | null)[]> {
  const results: (string | null)[] = [];
  const key = apiKey || getVideoApiKey();

  for (let i = 0; i < assets.length; i++) {
    onProgress?.(i + 1, assets.length);
    const videoUrl = await generateVideoFromImage(
      assets[i].imageData,
      assets[i].visualPrompt,
      key
    );
    results.push(videoUrl);
    if (i < assets.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return results;
}
