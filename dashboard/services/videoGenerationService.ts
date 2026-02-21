import { CONFIG } from '../config';

const SORA_MODEL = 'sora-2';
const APIYI_BASE = 'https://api.apiyi.com/v1';

export function getFalApiKey(): string | null {
  return localStorage.getItem('tubegen_apiyi_key') || localStorage.getItem(CONFIG.STORAGE_KEYS.FAL_API_KEY) || null;
}

export function setFalApiKey(key: string): void {
  localStorage.setItem('tubegen_apiyi_key', key);
}

export function getVideoApiKey(): string | null {
  return localStorage.getItem('tubegen_apiyi_key') || null;
}

// base64 이미지를 File 객체로 변환
function base64ToFile(base64: string, filename: string = 'image.png'): File {
  const raw = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteString = atob(raw);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new File([ab], filename, { type: 'image/png' });
}

// Sora 2 image-to-video 생성 (APIYI 경유)
export async function generateVideoFromImage(
  imageBase64: string,
  motionPrompt: string,
  apiKey?: string
): Promise<string | null> {
  const key = apiKey || getVideoApiKey();
  if (!key) {
    console.error('[Video Gen] API 키 없음');
    return null;
  }

  try {
    console.log(`[Video Gen] Sora 2 영상 생성 시작: "${motionPrompt.slice(0, 50)}..."`);

    // 1단계: 이미지를 File로 업로드
    const imageFile = base64ToFile(imageBase64);
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('purpose', 'vision');

    const uploadRes = await fetch(`${APIYI_BASE}/files`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}` },
      body: formData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.warn(`[Video Gen] 파일 업로드 실패 (${uploadRes.status}), data URL 방식으로 전환`);

      // 업로드 실패 시 data URL 방식으로 시도
      return await generateVideoWithDataUrl(imageBase64, motionPrompt, key);
    }

    const uploadData = await uploadRes.json() as { id?: string };
    const fileId = uploadData.id;
    console.log(`[Video Gen] 파일 업로드 완료: ${fileId}`);

    // 2단계: 영상 생성 요청
    const videoRes = await fetch(`${APIYI_BASE}/videos/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: SORA_MODEL,
        prompt: motionPrompt,
        input_reference: fileId,
        size: '1280x720',
        seconds: 5,
      }),
    });

    if (!videoRes.ok) {
      const errText = await videoRes.text();
      throw new Error(`영상 생성 요청 실패: ${videoRes.status} - ${errText}`);
    }

    const videoData = await videoRes.json() as { id?: string; video_url?: string; status?: string };
    const videoId = videoData.id;

    if (videoData.video_url) {
      console.log('[Video Gen] 즉시 완료');
      return videoData.video_url;
    }

    // 3단계: 폴링으로 완료 대기
    if (videoId) {
      return await pollVideoStatus(videoId, key);
    }

    throw new Error('영상 ID를 받지 못했습니다');
  } catch (error: any) {
    console.error(`[Video Gen] 영상 생성 실패: ${error.message}`);
    return null;
  }
}

// data URL 방식 폴백
async function generateVideoWithDataUrl(
  imageBase64: string,
  motionPrompt: string,
  apiKey: string
): Promise<string | null> {
  const raw = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  const dataUrl = `data:image/png;base64,${raw}`;

  const videoRes = await fetch(`${APIYI_BASE}/videos/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: SORA_MODEL,
      prompt: motionPrompt,
      input_reference: dataUrl,
      size: '1280x720',
      seconds: 5,
    }),
  });

  if (!videoRes.ok) {
    const errText = await videoRes.text();
    throw new Error(`영상 생성 실패: ${videoRes.status} - ${errText}`);
  }

  const videoData = await videoRes.json() as { id?: string; video_url?: string };

  if (videoData.video_url) return videoData.video_url;
  if (videoData.id) return await pollVideoStatus(videoData.id, apiKey);

  throw new Error('영상 생성 응답에서 ID/URL을 찾을 수 없습니다');
}

// 영상 생성 상태 폴링
async function pollVideoStatus(videoId: string, apiKey: string): Promise<string | null> {
  const maxAttempts = 60; // 최대 5분 (5초 * 60)

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 5000)); // 5초 대기

    const statusRes = await fetch(`${APIYI_BASE}/videos/${videoId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!statusRes.ok) {
      console.warn(`[Video Gen] 상태 확인 실패: ${statusRes.status}`);
      continue;
    }

    const statusData = await statusRes.json() as { status?: string; video_url?: string; error?: any };
    console.log(`[Video Gen] 폴링 ${i + 1}/${maxAttempts}: ${statusData.status}`);

    if (statusData.status === 'completed' && statusData.video_url) {
      console.log('[Video Gen] 영상 생성 완료!');
      return statusData.video_url;
    }

    if (statusData.status === 'failed') {
      throw new Error(`영상 생성 실패: ${JSON.stringify(statusData.error)}`);
    }
  }

  throw new Error('영상 생성 시간 초과 (5분)');
}

// 호환성을 위한 fetch 함수
export async function fetchVideoAsBase64(videoUrl: string): Promise<string | null> {
  try {
    const res = await fetch(videoUrl);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
