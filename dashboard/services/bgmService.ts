/**
 * BGM 생성 서비스 (ElevenLabs Music API)
 * - 주제에 맞는 인스트루멘탈 배경음악을 AI로 자동 생성
 * - 기존 ElevenLabs API 키 재사용
 * - force_instrumental: true → 보컬 없는 BGM만 생성
 */

import { CONFIG } from '../config';

export interface BgmResult {
  audioBase64: string | null;
  durationMs: number;
  prompt: string;
}

/**
 * 주제에 맞는 BGM 프롬프트 생성
 */
function createBgmPrompt(topic: string, mood?: string): string {
  const moodText = mood || 'calm and informative';
  return `Instrumental background music for a YouTube video about "${topic}". 
Style: ${moodText}, cinematic lo-fi, soft piano and ambient pads.
No vocals. Gentle and unobtrusive, suitable as background music under narration.
Smooth transitions, consistent energy throughout.`;
}

/**
 * 주제 키워드에서 분위기 자동 추정
 */
function detectMood(topic: string): string {
  const lower = topic.toLowerCase();

  if (lower.includes('경제') || lower.includes('금융') || lower.includes('투자'))
    return 'serious and professional, subtle tension, corporate ambient';
  if (lower.includes('기술') || lower.includes('ai') || lower.includes('테크'))
    return 'futuristic and innovative, electronic ambient, inspiring';
  if (lower.includes('건강') || lower.includes('의학') || lower.includes('헬스'))
    return 'warm and caring, gentle piano, hopeful';
  if (lower.includes('여행') || lower.includes('관광') || lower.includes('자연'))
    return 'adventurous and uplifting, acoustic guitar, bright';
  if (lower.includes('위기') || lower.includes('전쟁') || lower.includes('재난'))
    return 'tense and dramatic, dark ambient, suspenseful';
  if (lower.includes('교육') || lower.includes('학습') || lower.includes('공부'))
    return 'calm and focused, study lo-fi, relaxing';

  return 'calm and informative, cinematic ambient, gentle';
}

/**
 * ElevenLabs Music API로 BGM 생성
 * @param topic - 영상 주제
 * @param totalDurationSec - 영상 총 길이 (초)
 * @param onProgress - 진행 콜백
 */
export async function generateBgm(
  topic: string,
  totalDurationSec: number,
  onProgress?: (msg: string) => void
): Promise<BgmResult> {
  const apiKey = typeof localStorage !== 'undefined' ? localStorage.getItem(CONFIG.STORAGE_KEYS.ELEVENLABS_API_KEY) : null;

  if (!apiKey || apiKey.length < 10) {
    console.warn('[BGM] ElevenLabs API 키 없음, BGM 생성 건너뜀');
    return { audioBase64: null, durationMs: 0, prompt: '' };
  }

  // BGM 길이: 30초만 생성하고 loop로 반복 재생 (비용 절약)
  const bgmDurationMs = 30000; // 고정 30초

  const mood = detectMood(topic);
  const prompt = createBgmPrompt(topic, mood);

  console.log(`[BGM] 생성 시작: ${bgmDurationMs / 1000}초, 분위기: ${mood}`);
  onProgress?.(`🎵 배경음악 생성 중 (${Math.round(bgmDurationMs / 1000)}초)...`);

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/music/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        prompt: prompt,
        music_length_ms: bgmDurationMs,
        force_instrumental: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[BGM] API 오류:', response.status, errorText);
      return { audioBase64: null, durationMs: 0, prompt };
    }

    // 스트리밍 응답을 Blob으로 수집
    const audioBlob = await response.blob();

    // Blob → base64 변환
    const audioBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });

    console.log(`[BGM] 생성 완료: ${(audioBlob.size / 1024).toFixed(1)}KB`);
    onProgress?.(`🎵 배경음악 생성 완료`);

    return {
      audioBase64,
      durationMs: bgmDurationMs,
      prompt,
    };
  } catch (error) {
    console.error('[BGM] 생성 실패:', error);
    onProgress?.('🎵 배경음악 생성 실패 (나레이션만 사용)');
    return { audioBase64: null, durationMs: 0, prompt };
  }
}
