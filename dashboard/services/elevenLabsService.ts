
import { CONFIG, ElevenLabsModelId } from "../config";
import { SubtitleData, SubtitleWord, MeaningChunk } from "../types";
import { splitSubtitleByMeaning } from "./geminiService";

/**
 * ElevenLabs API Service
 * 타임스탬프 포함 버전 - 자막 데이터 동시 생성
 */

const OUTPUT_FORMAT = "mp3_44100_128";

/**
 * 저장된 ElevenLabs 모델 ID 가져오기
 */
export const getElevenLabsModelId = (): ElevenLabsModelId => {
  const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.ELEVENLABS_MODEL);
  return (saved as ElevenLabsModelId) || CONFIG.DEFAULT_ELEVENLABS_MODEL;
};

/**
 * ElevenLabs 모델 ID 저장
 */
export const setElevenLabsModelId = (modelId: ElevenLabsModelId): void => {
  localStorage.setItem(CONFIG.STORAGE_KEYS.ELEVENLABS_MODEL, modelId);
};

export interface ElevenLabsResult {
  audioData: string | null;
  subtitleData: SubtitleData | null;
  estimatedDuration: number | null;  // 추정 오디오 길이 (초)
}

/**
 * 문자 단위 타임스탬프를 단어 단위로 변환
 */
function convertToWords(
  characters: string[],
  startTimes: number[],
  endTimes: number[]
): SubtitleWord[] {
  const words: SubtitleWord[] = [];
  let currentWord = '';
  let wordStart = 0;
  let wordEnd = 0;

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];

    if (char === ' ' || char === '\n' || char === '\t') {
      // 공백을 만나면 현재 단어 저장
      if (currentWord.length > 0) {
        words.push({
          word: currentWord,
          start: wordStart,
          end: wordEnd
        });
        currentWord = '';
      }
    } else {
      // 새 단어 시작
      if (currentWord.length === 0) {
        wordStart = startTimes[i];
      }
      currentWord += char;
      wordEnd = endTimes[i];
    }
  }

  // 마지막 단어 저장
  if (currentWord.length > 0) {
    words.push({
      word: currentWord,
      start: wordStart,
      end: wordEnd
    });
  }

  return words;
}

/**
 * AI 의미 단위 분리 + 단어 타이밍 매핑
 * - Gemini AI로 의미 단위 분리
 * - 분리된 청크와 ElevenLabs 단어 타이밍을 매핑
 * - 각 청크의 시작/끝 시간 계산
 */
async function createMeaningChunks(
  fullText: string,
  words: SubtitleWord[]
): Promise<MeaningChunk[]> {
  // AI 기반 의미 단위 분리
  const textChunks = await splitSubtitleByMeaning(fullText, 20);

  if (textChunks.length === 0 || words.length === 0) {
    return [];
  }

  const meaningChunks: MeaningChunk[] = [];

  // 문자 기반 매핑: 각 청크의 non-space 문자 수로 단어 경계 결정
  // AI 청크와 ElevenLabs 단어 간 단어 수 불일치에 강건
  let wordIndex = 0;
  let charInWordConsumed = 0;

  for (const chunkText of textChunks) {
    const chunkChars = chunkText.replace(/\s+/g, '').length;
    if (chunkChars === 0) continue;

    const startWordIndex = wordIndex;
    let charsRemaining = chunkChars;

    while (charsRemaining > 0 && wordIndex < words.length) {
      const wordLen = words[wordIndex].word.length;
      const availableInWord = wordLen - charInWordConsumed;

      if (charsRemaining >= availableInWord) {
        charsRemaining -= availableInWord;
        charInWordConsumed = 0;
        wordIndex++;
      } else {
        charInWordConsumed += charsRemaining;
        charsRemaining = 0;
      }
    }

    if (startWordIndex < words.length) {
      const endWordIndex = Math.min(
        charInWordConsumed > 0 ? wordIndex : Math.max(startWordIndex, wordIndex - 1),
        words.length - 1
      );

      meaningChunks.push({
        text: chunkText,
        startTime: words[startWordIndex].start,
        endTime: words[Math.max(startWordIndex, endWordIndex)].end
      });
    }
  }

  // 남은 단어가 있으면 마지막 청크의 endTime을 연장
  if (meaningChunks.length > 0 && wordIndex < words.length) {
    meaningChunks[meaningChunks.length - 1].endTime = words[words.length - 1].end;
  }

  // 청크 간 간격 제거: endTime을 다음 청크의 startTime까지 연장
  for (let i = 0; i < meaningChunks.length - 1; i++) {
    meaningChunks[i].endTime = meaningChunks[i + 1].startTime;
  }

  return meaningChunks;
}

export const generateAudioWithElevenLabs = async (
  text: string,
  providedApiKey?: string,
  providedVoiceId?: string,
  providedModelId?: ElevenLabsModelId
): Promise<ElevenLabsResult> => {

  const savedApiKey = (typeof localStorage !== 'undefined' ? localStorage.getItem(CONFIG.STORAGE_KEYS.ELEVENLABS_API_KEY) : null) || (typeof process !== 'undefined' ? (process as any).env?.ELEVENLABS_API_KEY : null);
  const savedVoiceId = (typeof localStorage !== 'undefined' ? localStorage.getItem(CONFIG.STORAGE_KEYS.ELEVENLABS_VOICE_ID) : null) || (typeof process !== 'undefined' ? (process as any).env?.ELEVENLABS_VOICE_ID : null);

  const finalKey = providedApiKey || savedApiKey;
  const finalVoiceId = providedVoiceId || savedVoiceId || CONFIG.DEFAULT_VOICE_ID;
  const finalModelId = providedModelId || getElevenLabsModelId();

  if (!finalKey || finalKey.length < 10) {
    console.warn("ElevenLabs API Key가 설정되지 않았습니다.");
    return { audioData: null, subtitleData: null, estimatedDuration: null };
  }

  try {
    // 타임스탬프 포함 엔드포인트 사용
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}/with-timestamps`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': finalKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: finalModelId,
        output_format: OUTPUT_FORMAT,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      }),
    });

    if (!response.ok) {
      const errorDetail = await response.text();
      console.error("ElevenLabs API Error:", errorDetail);
      return { audioData: null, subtitleData: null, estimatedDuration: null };
    }

    const jsonResponse = await response.json();

    // 오디오 데이터 (이미 base64로 옴)
    const audioBase64 = jsonResponse.audio_base64;

    // 타임스탬프 데이터 파싱
    let subtitleData: SubtitleData | null = null;
    let estimatedDuration: number | null = null;

    if (jsonResponse.alignment) {
      const { characters, character_start_times_seconds, character_end_times_seconds } = jsonResponse.alignment;

      const words = convertToWords(
        characters,
        character_start_times_seconds,
        character_end_times_seconds
      );

      subtitleData = {
        words,
        fullText: text
      };

      // 마지막 문자의 끝 시간 + 버퍼로 오디오 길이 추정
      // (오디오 끝에 약간의 무음이 있을 수 있으므로 0.3초 버퍼 추가)
      if (character_end_times_seconds && character_end_times_seconds.length > 0) {
        const lastCharEnd = character_end_times_seconds[character_end_times_seconds.length - 1];
        estimatedDuration = lastCharEnd + 0.3;
      }

      console.log(`[ElevenLabs] 모델: ${finalModelId}, 자막 데이터 생성 완료: ${words.length}개 단어, 추정 길이: ${estimatedDuration?.toFixed(2)}초`);

      // AI 의미 단위 분리 및 타이밍 매핑
      try {
        const meaningChunks = await createMeaningChunks(text, words);
        if (meaningChunks.length > 0) {
          subtitleData.meaningChunks = meaningChunks;
          console.log(`[ElevenLabs] AI 의미 단위 분리 완료: ${meaningChunks.length}개 청크`);
        }
      } catch (e) {
        console.warn('[ElevenLabs] AI 자막 분리 실패, 단어 기반 방식 사용:', e);
      }
    }

    return {
      audioData: audioBase64,
      subtitleData,
      estimatedDuration
    };

  } catch (error) {
    console.error("ElevenLabs Generation Failed:", error);
    return { audioData: null, subtitleData: null, estimatedDuration: null };
  }
};

/**
 * ElevenLabs Voice 정보 타입
 */
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels?: {
    accent?: string;
    age?: string;
    gender?: string;
    description?: string;
    use_case?: string;
  };
  preview_url?: string;
}

/**
 * ElevenLabs에서 사용 가능한 음성 목록 가져오기
 */
export const fetchElevenLabsVoices = async (apiKey?: string): Promise<ElevenLabsVoice[]> => {
  // 환경변수 우선, 그 다음 localStorage
  const envKey = typeof process !== 'undefined' ? (process as any).env?.ELEVENLABS_API_KEY : null;
  const finalKey = apiKey || envKey || localStorage.getItem(CONFIG.STORAGE_KEYS.ELEVENLABS_API_KEY);

  if (!finalKey || finalKey.length < 10) {
    console.warn("ElevenLabs API Key가 설정되지 않았습니다.");
    return [];
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': finalKey,
      },
    });

    if (!response.ok) {
      const errorDetail = await response.text();
      console.error("ElevenLabs Voices API Error:", errorDetail);
      return [];
    }

    const data = await response.json();
    const voices: ElevenLabsVoice[] = data.voices || [];

    console.log(`[ElevenLabs] ${voices.length}개 음성 로드됨`);
    return voices;

  } catch (error) {
    console.error("ElevenLabs Voices Fetch Failed:", error);
    return [];
  }
};
