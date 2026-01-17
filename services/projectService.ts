
/**
 * 프로젝트 저장/로드 서비스
 * - 생성된 스토리보드를 localStorage에 저장
 * - 갤러리에서 과거 프로젝트 조회 가능
 */

import { CONFIG } from '../config';
import { SavedProject, GeneratedAsset, CostBreakdown } from '../types';
import { getSelectedImageModel, getSelectedFluxStyle } from './imageService';

/**
 * 이미지 축소 (썸네일 생성용)
 */
function createThumbnail(base64Image: string, maxWidth: number = 200): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * ratio;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
      } else {
        resolve(base64Image.slice(0, 1000)); // fallback
      }
    };
    img.onerror = () => resolve('');
    img.src = `data:image/png;base64,${base64Image}`;
  });
}

/**
 * 현재 설정값 가져오기
 */
function getCurrentSettings() {
  const elevenLabsModel = localStorage.getItem(CONFIG.STORAGE_KEYS.ELEVENLABS_MODEL) || CONFIG.DEFAULT_ELEVENLABS_MODEL;

  return {
    imageModel: getSelectedImageModel(),
    fluxStyle: getSelectedFluxStyle(),
    fluxCharacter: localStorage.getItem(CONFIG.STORAGE_KEYS.FLUX_CHARACTER) || CONFIG.DEFAULT_CHARACTER_PROMPT,
    elevenLabsModel
  };
}

/**
 * 프로젝트 저장
 */
export async function saveProject(
  topic: string,
  assets: GeneratedAsset[],
  customName?: string,
  cost?: CostBreakdown
): Promise<SavedProject> {
  const id = `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();

  // 첫 번째 이미지로 썸네일 생성
  let thumbnail: string | null = null;
  const firstImageAsset = assets.find(a => a.imageData);
  if (firstImageAsset?.imageData) {
    thumbnail = await createThumbnail(firstImageAsset.imageData);
  }

  // 전체 에셋 저장 (이미지, 오디오, 자막 등 포함)
  const project: SavedProject = {
    id,
    name: customName || `${topic.slice(0, 30)}${topic.length > 30 ? '...' : ''}`,
    createdAt: now,
    topic,
    settings: getCurrentSettings(),
    assets: assets.map(asset => ({ ...asset })), // 깊은 복사
    thumbnail,
    cost
  };

  // 기존 프로젝트 목록 가져오기
  const existing = getSavedProjects();
  existing.unshift(project); // 최신을 앞에

  // 저장 (최대 30개까지 - 에셋 용량이 크므로)
  const toSave = existing.slice(0, 30);

  try {
    localStorage.setItem(CONFIG.STORAGE_KEYS.PROJECTS, JSON.stringify(toSave));
  } catch (e: any) {
    // 용량 초과 시 오래된 프로젝트 삭제 후 재시도
    console.warn('[Project] 저장 용량 초과, 오래된 프로젝트 정리 중...');
    const reduced = toSave.slice(0, 15);
    localStorage.setItem(CONFIG.STORAGE_KEYS.PROJECTS, JSON.stringify(reduced));
  }

  console.log(`[Project] 프로젝트 저장 완료: ${project.name} (${assets.length}씬)`);
  return project;
}

/**
 * 저장된 프로젝트 목록 가져오기
 */
export function getSavedProjects(): SavedProject[] {
  try {
    const data = localStorage.getItem(CONFIG.STORAGE_KEYS.PROJECTS);
    if (!data) return [];
    return JSON.parse(data) as SavedProject[];
  } catch (e) {
    console.error('[Project] 프로젝트 목록 로드 실패:', e);
    return [];
  }
}

/**
 * 특정 프로젝트 가져오기
 */
export function getProjectById(id: string): SavedProject | null {
  const projects = getSavedProjects();
  return projects.find(p => p.id === id) || null;
}

/**
 * 프로젝트 삭제
 */
export function deleteProject(id: string): boolean {
  const projects = getSavedProjects();
  const filtered = projects.filter(p => p.id !== id);

  if (filtered.length === projects.length) {
    return false; // 삭제할 프로젝트 없음
  }

  localStorage.setItem(CONFIG.STORAGE_KEYS.PROJECTS, JSON.stringify(filtered));
  console.log(`[Project] 프로젝트 삭제: ${id}`);
  return true;
}

/**
 * 프로젝트 이름 변경
 */
export function renameProject(id: string, newName: string): boolean {
  const projects = getSavedProjects();
  const project = projects.find(p => p.id === id);

  if (!project) return false;

  project.name = newName;
  localStorage.setItem(CONFIG.STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  console.log(`[Project] 프로젝트 이름 변경: ${newName}`);
  return true;
}

/**
 * 저장 용량 계산 (대략적)
 */
export function getStorageUsage(): { used: number; available: number; percentage: number } {
  const projectsData = localStorage.getItem(CONFIG.STORAGE_KEYS.PROJECTS) || '';
  const usedBytes = new Blob([projectsData]).size;
  const estimatedMax = 5 * 1024 * 1024; // 약 5MB 추정

  return {
    used: usedBytes,
    available: estimatedMax,
    percentage: Math.round((usedBytes / estimatedMax) * 100)
  };
}

/**
 * 오래된 프로젝트 정리 (용량 확보)
 */
export function cleanupOldProjects(keepCount: number = 20): number {
  const projects = getSavedProjects();
  if (projects.length <= keepCount) return 0;

  const toKeep = projects.slice(0, keepCount);
  const removed = projects.length - keepCount;

  localStorage.setItem(CONFIG.STORAGE_KEYS.PROJECTS, JSON.stringify(toKeep));
  console.log(`[Project] ${removed}개 오래된 프로젝트 정리됨`);
  return removed;
}
