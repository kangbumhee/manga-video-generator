// APIYI Sora 2 Image-to-Video Service
// 건당 $0.12 — APIYI 키 하나로 통합

const APIYI_CHAT_URL = 'https://api.apiyi.com/v1/chat/completions';

function getApiyiKey(): string {
  return localStorage.getItem('tubegen_apiyi_key') || '';
}

/** 하위 호환: 영상 생성 시 APIYI 키 사용 */
export function getFalApiKey(): string | null {
  const key = getApiyiKey();
  if (!key) {
    console.warn('[Video Gen] APIYI API 키가 설정되지 않았습니다. 영상 변환에 APIYI 키가 필요합니다.');
    return null;
  }
  return key;
}

export function setFalApiKey(key: string): void {
  localStorage.setItem('tubegen_apiyi_key', key);
}

export async function generateVideoFromImage(
  imageBase64: string,
  motionPrompt?: string,
  onProgress?: (msg: string) => void
): Promise<string | null> {
  const apiKey = getApiyiKey();
  if (!apiKey) return null;

  const videoModel = localStorage.getItem('tubegen_video_model') || 'sora_video2-landscape';

  try {
    onProgress?.('[Sora 2] 영상 생성 요청 중... (2~4분 소요)');

    const imageUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`;

    const response = await fetch(APIYI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: videoModel,
        stream: false,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              {
                type: 'text',
                text: motionPrompt || 'gentle subtle animation of this cartoon image, slight character movement, maintain art style',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`[Sora 2] 요청 실패: ${response.status} - ${error}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';

    const urlMatch = content.match(/https?:\/\/[^\s\)]+\.mp4[^\s\)]*/);
    if (!urlMatch) {
      throw new Error('[Sora 2] 영상 URL을 찾을 수 없습니다: ' + content.substring(0, 200));
    }

    const videoUrl = urlMatch[0];
    onProgress?.('[Sora 2] 영상 다운로드 중...');

    const videoResponse = await fetch(videoUrl);
    const blob = await videoResponse.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return dataUrl;
  } catch (error: any) {
    console.error(`[Sora 2] 영상 생성 실패: ${error.message}`);
    return null;
  }
}

export async function generateVideoFromImageUrl(
  imageUrl: string,
  motionPrompt?: string,
  onProgress?: (msg: string) => void
): Promise<string | null> {
  const apiKey = getApiyiKey();
  if (!apiKey) return null;

  const videoModel = localStorage.getItem('tubegen_video_model') || 'sora_video2-landscape';

  try {
    onProgress?.('[Sora 2] 영상 생성 요청 중... (2~4분 소요)');

    const response = await fetch(APIYI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: videoModel,
        stream: false,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              {
                type: 'text',
                text: motionPrompt || 'gentle subtle animation of this cartoon image, slight character movement, maintain art style',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`[Sora 2] 요청 실패: ${response.status} - ${error}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    const urlMatch = content.match(/https?:\/\/[^\s\)]+\.mp4[^\s\)]*/);
    if (!urlMatch) throw new Error('[Sora 2] 영상 URL을 찾을 수 없습니다');

    onProgress?.('[Sora 2] 영상 다운로드 중...');
    const videoResponse = await fetch(urlMatch[0]);
    const blob = await videoResponse.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error: any) {
    console.error(`[Sora 2] 영상 생성 실패: ${error.message}`);
    return null;
  }
}

export async function fetchVideoAsBase64(videoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(videoUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl && dataUrl.includes(',') ? dataUrl.split(',')[1] : null);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
