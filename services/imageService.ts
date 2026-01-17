
/**
 * 통합 이미지 생성 서비스
 * - 선택한 모델에 따라 Gemini 또는 Flux로 라우팅
 * - Flux는 참조 이미지 미지원 → 선택한 스타일 프롬프트를 추가
 */

import { CONFIG, ImageModelId, FLUX_STYLE_CATEGORIES, FluxStyleId } from '../config';
import { generateImageForScene as generateWithGemini } from './geminiService';
import { generateImageWithFlux } from './falService';
import { ScriptScene } from '../types';

/**
 * 현재 선택된 이미지 모델 가져오기
 */
export function getSelectedImageModel(): ImageModelId {
  const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.IMAGE_MODEL);
  return (saved as ImageModelId) || CONFIG.DEFAULT_IMAGE_MODEL;
}

/**
 * 현재 선택된 Flux 스타일 가져오기
 */
export function getSelectedFluxStyle(): FluxStyleId {
  const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.FLUX_STYLE);
  return (saved as FluxStyleId) || 'ghibli';
}

/**
 * 캐릭터 프롬프트 가져오기
 */
function getCharacterPrompt(): string {
  return localStorage.getItem(CONFIG.STORAGE_KEYS.FLUX_CHARACTER) || CONFIG.DEFAULT_CHARACTER_PROMPT;
}

/**
 * 커스텀 스타일 프롬프트 가져오기
 */
function getCustomStylePrompt(): string {
  return localStorage.getItem(CONFIG.STORAGE_KEYS.FLUX_CUSTOM_STYLE) || '';
}

/**
 * 선택된 Flux 화풍의 프롬프트 가져오기
 */
function getFluxStylePrompt(styleId: FluxStyleId): string | null {
  // 커스텀 스타일인 경우
  if (styleId === 'custom') {
    const customPrompt = getCustomStylePrompt();
    if (customPrompt.trim()) {
      return customPrompt;
    }
    // 커스텀이지만 비어있으면 null 반환 (캐릭터만 사용)
    return null;
  }

  // 프리셋 스타일 찾기
  for (const category of FLUX_STYLE_CATEGORIES) {
    const style = category.styles.find(s => s.id === styleId);
    if (style) {
      return style.prompt;
    }
  }

  return null;
}

/**
 * Flux용 프롬프트 생성
 * - 캐릭터 프롬프트 + 화풍 프롬프트 + 씬 프롬프트
 */
function createFluxPrompt(originalPrompt: string): string {
  const styleId = getSelectedFluxStyle();
  const characterPrompt = getCharacterPrompt();
  const stylePrompt = getFluxStylePrompt(styleId);

  console.log(`[Image Service] Flux - 캐릭터: ${characterPrompt.slice(0, 30)}...`);
  console.log(`[Image Service] Flux - 화풍: ${styleId}${stylePrompt ? '' : ' (없음)'}`);

  // 프롬프트 조합: 캐릭터 + 화풍 + 씬
  const parts: string[] = [];

  if (characterPrompt.trim()) {
    parts.push(characterPrompt.trim());
  }

  if (stylePrompt) {
    parts.push(`Style: ${stylePrompt.trim()}`);
  }

  parts.push(`Scene: ${originalPrompt}`);

  return parts.join(' ');
}

/**
 * 통합 이미지 생성 함수
 * - 선택된 모델에 따라 적절한 서비스 호출
 *
 * @param scene - 씬 데이터 (나레이션, 비주얼 프롬프트 등)
 * @param referenceImages - 참조 이미지 배열 (base64)
 * @returns base64 인코딩된 이미지 또는 null
 */
export async function generateImage(
  scene: ScriptScene,
  referenceImages: string[]
): Promise<string | null> {
  const modelId = getSelectedImageModel();
  const hasReferenceImages = referenceImages && referenceImages.length > 0;

  console.log(`[Image Service] 모델: ${modelId}, 참조 이미지: ${hasReferenceImages ? referenceImages.length + '개' : '없음'}`);

  if (modelId === 'fal-ai/flux/schnell') {
    // Flux.1 Schnell 사용
    // Flux는 참조 이미지를 지원하지 않음 → 선택한 스타일 프롬프트 추가
    const fluxPrompt = createFluxPrompt(scene.visualPrompt);
    const result = await generateImageWithFlux(fluxPrompt);
    return result;
  } else {
    // 기본: Gemini 사용 (참조 이미지 지원)
    return await generateWithGemini(scene, referenceImages);
  }
}
