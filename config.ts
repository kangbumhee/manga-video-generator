
/**
 * TubeGen AI 전역 설정 파일
 * 보안을 위해 민감한 API 키는 이곳에 직접 입력하지 마세요.
 * 앱 내의 [설정] 메뉴를 통해 입력하면 브라우저에 안전하게 보관됩니다.
 */

// 이미지 생성 모델 목록
export const IMAGE_MODELS = [
  {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    pricePerImage: 0.0315,  // $0.0315/image (추정)
    description: '고품질, 프롬프트 이해력 우수',
    speed: '보통'
  },
  {
    id: 'fal-ai/flux/schnell',
    name: 'Flux.1 Schnell',
    provider: 'fal.ai',
    pricePerImage: 0.003,   // $0.003/image
    description: '초고속, 저렴한 가격',
    speed: '매우 빠름'
  },
] as const;

export type ImageModelId = typeof IMAGE_MODELS[number]['id'];

// Flux 스타일 카테고리
export const FLUX_STYLE_CATEGORIES = [
  {
    id: 'animation',
    name: '애니메이션',
    styles: [
      { id: 'ghibli', name: '지브리', prompt: 'Studio Ghibli style, soft watercolor aesthetic, Hayao Miyazaki inspired, gentle lighting, whimsical atmosphere' },
      { id: 'modern-anime', name: '모던 애니메', prompt: 'modern anime style, vibrant colors, detailed expressive eyes, dynamic composition, clean cel shading' },
      { id: 'chibi', name: '치비', prompt: 'chibi style, cute super-deformed characters, oversized head, tiny body, adorable expressions, kawaii' },
      { id: 'webtoon', name: '웹툰', prompt: 'Korean webtoon style, clean digital lines, manhwa aesthetic, soft shading, romantic atmosphere' },
      { id: '90s-anime', name: '90년대 애니메', prompt: '90s retro anime style, classic cel animation look, nostalgic colors, VHS aesthetic' },
      { id: 'disney', name: '디즈니', prompt: 'Disney animation style, expressive characters, smooth curves, family friendly, magical atmosphere' },
      { id: 'pixar', name: '픽사 3D', prompt: 'Pixar 3D animation style, CGI rendered, soft ambient lighting, detailed textures, heartwarming' },
    ]
  },
  {
    id: 'illustration',
    name: '일러스트',
    styles: [
      { id: 'minimalist', name: '미니멀리스트', prompt: 'minimalist illustration, simple geometric shapes, flat design, limited color palette, clean negative space' },
      { id: 'line-art', name: '라인아트', prompt: 'clean line art illustration, black and white, precise outlines, no fill, elegant strokes' },
      { id: 'watercolor', name: '수채화', prompt: 'watercolor illustration style, soft edges, paint bleeding effects, artistic texture, gentle colors' },
      { id: 'flat-design', name: '플랫 디자인', prompt: 'flat design vector illustration, bold solid colors, no gradients, modern UI style, geometric shapes' },
      { id: 'isometric', name: '아이소메트릭', prompt: 'isometric illustration, 30-degree angle, 3D perspective without vanishing point, geometric precision' },
      { id: 'pixel-art', name: '픽셀아트', prompt: '16-bit pixel art style, retro video game aesthetic, limited palette, crisp pixels, nostalgic' },
      { id: 'storybook', name: '동화책', prompt: 'children storybook illustration, whimsical hand-drawn style, soft colors, magical and dreamy atmosphere' },
    ]
  }
] as const;

export type FluxStyleId = typeof FLUX_STYLE_CATEGORIES[number]['styles'][number]['id'] | 'custom';

// 가격 정보 (USD)
export const PRICING = {
  // 환율 (USD → KRW)
  USD_TO_KRW: 1450,

  // 이미지 생성
  IMAGE: {
    'gemini-2.5-flash-image': 0.0315,  // $0.0315/image
    'fal-ai/flux/schnell': 0.003,       // $0.003/image
  },
  // TTS (ElevenLabs) - 글자당 가격
  TTS: {
    perCharacter: 0.00003,  // 약 $0.03/1000자 (추정)
  },
  // 영상 생성 (PixVerse)
  VIDEO: {
    perVideo: 0.15,  // $0.15/video (5초)
  }
} as const;

// USD를 KRW로 변환
export function toKRW(usd: number): number {
  return Math.round(usd * PRICING.USD_TO_KRW);
}

// KRW 포맷 (예: 1,234원)
export function formatKRW(usd: number): string {
  const krw = toKRW(usd);
  return krw.toLocaleString('ko-KR') + '원';
}

// ElevenLabs 자막(타임스탬프) 지원 모델 목록
export const ELEVENLABS_MODELS = [
  { id: 'eleven_multilingual_v2', name: 'Multilingual v2', description: '다국어 29개, 고품질 (기본값)', supportsTimestamp: true },
  { id: 'eleven_v3', name: 'Eleven v3', description: '최신 모델, 70개 언어, 고표현력', supportsTimestamp: true },
  { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5', description: '빠른 속도, 32개 언어', supportsTimestamp: true },
  { id: 'eleven_flash_v2_5', name: 'Flash v2.5', description: '초고속 ~75ms, 32개 언어', supportsTimestamp: true },
  { id: 'eleven_turbo_v2', name: 'Turbo v2', description: '빠른 속도, 영어 최적화', supportsTimestamp: true },
  { id: 'eleven_monolingual_v1', name: 'Monolingual v1', description: '영어 전용 (레거시)', supportsTimestamp: false },
] as const;

export type ElevenLabsModelId = typeof ELEVENLABS_MODELS[number]['id'];

export const CONFIG = {
  // 기본 설정값들 (키 제외)
  DEFAULT_VOICE_ID: "qilwn0AtH88Ij5OirLPw",
  DEFAULT_ELEVENLABS_MODEL: "eleven_multilingual_v2" as ElevenLabsModelId,
  DEFAULT_IMAGE_MODEL: "gemini-2.5-flash-image" as ImageModelId,
  VIDEO_WIDTH: 1280,
  VIDEO_HEIGHT: 720,

  // 로컬 스토리지 키 이름 (내부 관리용)
  STORAGE_KEYS: {
    ELEVENLABS_API_KEY: 'tubegen_el_key',
    ELEVENLABS_VOICE_ID: 'tubegen_el_voice',
    ELEVENLABS_MODEL: 'tubegen_el_model',
    FAL_API_KEY: 'tubegen_fal_key',
    IMAGE_MODEL: 'tubegen_image_model',
    FLUX_STYLE: 'tubegen_flux_style',
    FLUX_CUSTOM_STYLE: 'tubegen_flux_custom_style',
    FLUX_CHARACTER: 'tubegen_flux_character',
    PROJECTS: 'tubegen_projects'
  },

  // 기본 캐릭터 프롬프트 (Flux용)
  DEFAULT_CHARACTER_PROMPT: `Simple stick figure character with clear expressive eyes and subtle mouth. Minimalist black line art on clean background. The character shows gentle, understated emotions - not exaggerated. A relatable companion figure that middle-aged viewers can connect with. Calm and thoughtful presence, like a quiet friend watching alongside.`,

  // 애니메이션 설정
  ANIMATION: {
    ENABLED_SCENES: 10,      // 앞 N개 씬을 애니메이션으로 변환
    VIDEO_DURATION: 5        // 생성 영상 길이 (초) - PixVerse v5.5
  }
};
