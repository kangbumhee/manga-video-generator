
import React, { useState, useRef, useEffect } from 'react';
import { GenerationStep, ProjectSettings } from '../types';
import { CONFIG, ELEVENLABS_MODELS, ElevenLabsModelId, IMAGE_MODELS, ImageModelId, FLUX_STYLE_CATEGORIES, FluxStyleId } from '../config';
import { getElevenLabsModelId, setElevenLabsModelId, fetchElevenLabsVoices, ElevenLabsVoice } from '../services/elevenLabsService';

interface InputSectionProps {
  onGenerate: (topic: string, referenceImages: string[], sourceText: string | null) => void;
  step: GenerationStep;
}

const InputSection: React.FC<InputSectionProps> = ({ onGenerate, step }) => {
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');
  const [topic, setTopic] = useState('');
  const [manualScript, setManualScript] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  // 이미지 모델 설정
  const [imageModelId, setImageModelId] = useState<ImageModelId>('gemini-2.5-flash-image');
  const [fluxStyleId, setFluxStyleId] = useState<FluxStyleId>('ghibli');
  const [customStylePrompt, setCustomStylePrompt] = useState('');
  const [characterPrompt, setCharacterPrompt] = useState(CONFIG.DEFAULT_CHARACTER_PROMPT);
  const [showCharacterEdit, setShowCharacterEdit] = useState(false);

  // 프로젝트 관리
  const [projects, setProjects] = useState<ProjectSettings[]>([]);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // ElevenLabs 설정 상태
  const [showElevenLabsSettings, setShowElevenLabsSettings] = useState(false);
  const [elApiKey, setElApiKey] = useState('');
  const [elVoiceId, setElVoiceId] = useState('');
  const [elModelId, setElModelId] = useState<ElevenLabsModelId>('eleven_multilingual_v2');
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceDropdownRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 컴포넌트 마운트 시 저장된 설정 로드
  useEffect(() => {
    const savedApiKey = localStorage.getItem(CONFIG.STORAGE_KEYS.ELEVENLABS_API_KEY) || '';
    const savedVoiceId = localStorage.getItem(CONFIG.STORAGE_KEYS.ELEVENLABS_VOICE_ID) || '';
    const savedModelId = getElevenLabsModelId();
    const savedImageModel = localStorage.getItem(CONFIG.STORAGE_KEYS.IMAGE_MODEL) as ImageModelId || CONFIG.DEFAULT_IMAGE_MODEL;
    const savedFluxStyle = localStorage.getItem(CONFIG.STORAGE_KEYS.FLUX_STYLE) as FluxStyleId || 'ghibli';
    const savedCustomStyle = localStorage.getItem(CONFIG.STORAGE_KEYS.FLUX_CUSTOM_STYLE) || '';
    const savedCharacter = localStorage.getItem(CONFIG.STORAGE_KEYS.FLUX_CHARACTER) || CONFIG.DEFAULT_CHARACTER_PROMPT;

    setElApiKey(savedApiKey);
    setElVoiceId(savedVoiceId);
    setElModelId(savedModelId);
    setImageModelId(savedImageModel);
    setFluxStyleId(savedFluxStyle);
    setCustomStylePrompt(savedCustomStyle);
    setCharacterPrompt(savedCharacter);

    // 저장된 프로젝트 목록 로드
    const savedProjects = localStorage.getItem(CONFIG.STORAGE_KEYS.PROJECTS);
    if (savedProjects) {
      try {
        setProjects(JSON.parse(savedProjects));
      } catch (e) {
        console.error('프로젝트 로드 실패:', e);
      }
    }

    // API Key가 있으면 음성 목록 자동 로드
    if (savedApiKey) {
      loadVoices(savedApiKey);
    }
  }, []);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (voiceDropdownRef.current && !voiceDropdownRef.current.contains(event.target as Node)) {
        setShowVoiceDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 컴포넌트 언마운트 시 오디오 정리
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 음성 목록 불러오기
  const loadVoices = async (apiKey?: string) => {
    const key = apiKey || elApiKey;
    if (!key || key.length < 10) return;

    setIsLoadingVoices(true);
    try {
      const voiceList = await fetchElevenLabsVoices(key);
      setVoices(voiceList);
    } catch (e) {
      console.error('음성 목록 로드 실패:', e);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  // Voice 선택
  const selectVoice = (voice: ElevenLabsVoice) => {
    setElVoiceId(voice.voice_id);
    setShowVoiceDropdown(false);
  };

  // 음성 미리듣기
  const playVoicePreview = (e: React.MouseEvent, voice: ElevenLabsVoice) => {
    e.stopPropagation(); // 버튼 클릭 시 voice 선택 방지

    // 이미 재생 중인 음성이면 정지
    if (playingVoiceId === voice.voice_id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    // preview_url이 없으면 무시
    if (!voice.preview_url) {
      console.warn('이 음성에는 미리듣기가 없습니다:', voice.name);
      return;
    }

    // 기존 재생 중지
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // 새 오디오 재생
    const audio = new Audio(voice.preview_url);
    audioRef.current = audio;
    setPlayingVoiceId(voice.voice_id);

    audio.play().catch(err => {
      console.error('음성 재생 실패:', err);
      setPlayingVoiceId(null);
    });

    audio.onended = () => {
      setPlayingVoiceId(null);
      audioRef.current = null;
    };
  };

  // 선택된 Voice 이름 가져오기
  const getSelectedVoiceName = () => {
    if (!elVoiceId) return '기본값 사용';
    const voice = voices.find(v => v.voice_id === elVoiceId);
    return voice ? voice.name : elVoiceId.slice(0, 12) + '...';
  };

  // ElevenLabs 설정 저장
  const saveElevenLabsSettings = () => {
    if (elApiKey) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.ELEVENLABS_API_KEY, elApiKey);
    }
    if (elVoiceId) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.ELEVENLABS_VOICE_ID, elVoiceId);
    }
    setElevenLabsModelId(elModelId);
    setShowElevenLabsSettings(false);
  };

  // 이미지 모델 선택
  const selectImageModel = (modelId: ImageModelId) => {
    setImageModelId(modelId);
    localStorage.setItem(CONFIG.STORAGE_KEYS.IMAGE_MODEL, modelId);
  };

  // Flux 스타일 선택
  const selectFluxStyle = (styleId: FluxStyleId) => {
    setFluxStyleId(styleId);
    localStorage.setItem(CONFIG.STORAGE_KEYS.FLUX_STYLE, styleId);
  };

  // 커스텀 스타일 저장
  const saveCustomStyle = (prompt: string) => {
    setCustomStylePrompt(prompt);
    localStorage.setItem(CONFIG.STORAGE_KEYS.FLUX_CUSTOM_STYLE, prompt);
  };

  // 캐릭터 프롬프트 저장
  const saveCharacterPrompt = (prompt: string) => {
    setCharacterPrompt(prompt);
    localStorage.setItem(CONFIG.STORAGE_KEYS.FLUX_CHARACTER, prompt);
  };

  // 캐릭터 프롬프트 초기화
  const resetCharacterPrompt = () => {
    setCharacterPrompt(CONFIG.DEFAULT_CHARACTER_PROMPT);
    localStorage.setItem(CONFIG.STORAGE_KEYS.FLUX_CHARACTER, CONFIG.DEFAULT_CHARACTER_PROMPT);
  };

  // 프로젝트 저장
  const saveProject = () => {
    if (!newProjectName.trim()) return;

    const newProject: ProjectSettings = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      imageModel: imageModelId,
      fluxStyle: fluxStyleId,
      fluxCustomStyle: customStylePrompt,
      fluxCharacter: characterPrompt,
      elevenLabsVoiceId: elVoiceId,
      elevenLabsModel: elModelId,
    };

    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    localStorage.setItem(CONFIG.STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects));
    setNewProjectName('');
    alert(`프로젝트 "${newProject.name}" 저장 완료!`);
  };

  // 프로젝트 불러오기
  const loadProject = (project: ProjectSettings) => {
    setImageModelId(project.imageModel as ImageModelId);
    setFluxStyleId(project.fluxStyle as FluxStyleId);
    setCustomStylePrompt(project.fluxCustomStyle);
    setCharacterPrompt(project.fluxCharacter);
    setElVoiceId(project.elevenLabsVoiceId);
    setElModelId(project.elevenLabsModel as ElevenLabsModelId);

    // localStorage에도 저장
    localStorage.setItem(CONFIG.STORAGE_KEYS.IMAGE_MODEL, project.imageModel);
    localStorage.setItem(CONFIG.STORAGE_KEYS.FLUX_STYLE, project.fluxStyle);
    localStorage.setItem(CONFIG.STORAGE_KEYS.FLUX_CUSTOM_STYLE, project.fluxCustomStyle);
    localStorage.setItem(CONFIG.STORAGE_KEYS.FLUX_CHARACTER, project.fluxCharacter);
    localStorage.setItem(CONFIG.STORAGE_KEYS.ELEVENLABS_VOICE_ID, project.elevenLabsVoiceId);
    setElevenLabsModelId(project.elevenLabsModel as ElevenLabsModelId);

    setShowProjectManager(false);
    alert(`프로젝트 "${project.name}" 불러오기 완료!`);
  };

  // 프로젝트 삭제
  const deleteProject = (projectId: string) => {
    if (!confirm('이 프로젝트를 삭제하시겠습니까?')) return;

    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);
    localStorage.setItem(CONFIG.STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects));
  };

  // 프로젝트 업데이트 (덮어쓰기)
  const updateProject = (project: ProjectSettings) => {
    const updatedProject: ProjectSettings = {
      ...project,
      updatedAt: Date.now(),
      imageModel: imageModelId,
      fluxStyle: fluxStyleId,
      fluxCustomStyle: customStylePrompt,
      fluxCharacter: characterPrompt,
      elevenLabsVoiceId: elVoiceId,
      elevenLabsModel: elModelId,
    };

    const updatedProjects = projects.map(p => p.id === project.id ? updatedProject : p);
    setProjects(updatedProjects);
    localStorage.setItem(CONFIG.STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects));
    alert(`프로젝트 "${project.name}" 업데이트 완료!`);
  };

  // 선택된 Flux 스타일 정보 가져오기
  const getSelectedFluxStyle = () => {
    if (fluxStyleId === 'custom') {
      return { id: 'custom', name: '커스텀', category: '직접 입력', prompt: customStylePrompt };
    }
    for (const category of FLUX_STYLE_CATEGORIES) {
      const style = category.styles.find(s => s.id === fluxStyleId);
      if (style) return { ...style, category: category.name };
    }
    return null;
  };

  const isProcessing = step !== GenerationStep.IDLE && step !== GenerationStep.COMPLETED && step !== GenerationStep.ERROR;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    if (activeTab === 'auto') {
      if (topic.trim()) onGenerate(topic, referenceImages, null);
    } else {
      if (manualScript.trim()) onGenerate("Manual Script Input", referenceImages, manualScript);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const remainingSlots = 4 - referenceImages.length;
      const filesToProcess = (Array.from(files) as File[]).slice(0, remainingSlots);
      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => setReferenceImages(prev => [...prev, reader.result as string].slice(0, 4));
        reader.readAsDataURL(file);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => setReferenceImages(prev => prev.filter((_, i) => i !== index));

  return (
    <div className="w-full max-w-4xl mx-auto my-8 px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 text-white">
          TubeGen <span className="text-brand-500">Studio</span>
        </h1>
        <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">졸라맨 V10.0 Concept-Based Engine</p>
      </div>

      <div className="mb-4 flex flex-col gap-4">
        {/* 프로젝트 관리 */}
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setShowProjectManager(!showProjectManager)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">프로젝트 관리</h3>
                <p className="text-slate-500 text-xs">
                  {projects.length > 0 ? `${projects.length}개 저장됨` : '설정을 프로젝트로 저장'}
                </p>
              </div>
            </div>
            <svg className={`w-5 h-5 text-slate-500 transition-transform ${showProjectManager ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showProjectManager && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
              {/* 새 프로젝트 저장 */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">새 프로젝트 저장</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="프로젝트 이름 입력..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && saveProject()}
                  />
                  <button
                    type="button"
                    onClick={saveProject}
                    disabled={!newProjectName.trim()}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap"
                  >
                    저장
                  </button>
                </div>
              </div>

              {/* 저장된 프로젝트 목록 */}
              {projects.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">저장된 프로젝트</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-white truncate">{project.name}</div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(project.updatedAt).toLocaleDateString('ko-KR')} •
                            {project.imageModel === 'fal-ai/flux/schnell' ? ' Flux' : ' Gemini'}
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            type="button"
                            onClick={() => loadProject(project)}
                            className="px-2 py-1 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                          >
                            불러오기
                          </button>
                          <button
                            type="button"
                            onClick={() => updateProject(project)}
                            className="px-2 py-1 text-[10px] bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                          >
                            덮어쓰기
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProject(project.id)}
                            className="px-2 py-1 text-[10px] bg-red-600/50 hover:bg-red-500 text-white rounded-lg transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {projects.length === 0 && (
                <p className="text-center text-slate-500 text-xs py-4">
                  저장된 프로젝트가 없습니다.<br />
                  현재 설정을 프로젝트로 저장해보세요.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Global Reference Images */}
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-sm shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1 text-left">
              <h3 className="text-white font-bold text-lg mb-1">글로벌 스타일 참조</h3>
              <p className="text-slate-500 text-xs">참조 이미지를 올리면 화풍과 색감을 그대로 계승합니다.</p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              {referenceImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <div className="w-24 h-16 rounded-xl overflow-hidden border border-slate-700">
                    <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                  </div>
                  <button onClick={() => removeImage(idx)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              ))}
              {referenceImages.length < 4 && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-24 h-16 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-500 hover:border-brand-500 hover:text-brand-500 transition-all"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" multiple />
            </div>
          </div>
        </div>

        {/* 이미지 생성 모델 선택 */}
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">이미지 생성 모델</h3>
              <p className="text-slate-500 text-xs">모델별 품질과 가격 비교</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {IMAGE_MODELS.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => selectImageModel(model.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  imageModelId === model.id
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">{model.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                    {model.provider}
                  </span>
                </div>
                <div className="text-xs opacity-70 mb-2">{model.description}</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-400 font-bold">${model.pricePerImage.toFixed(4)}/장</span>
                  <span className="text-slate-500">{model.speed}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Flux 스타일 선택 (Flux 모델 선택 시에만 표시) */}
          {imageModelId === 'fal-ai/flux/schnell' && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              {/* 기본 캐릭터 설정 */}
              <div className="mb-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🧑</span>
                    <span className="text-xs font-bold text-slate-300">기본 캐릭터</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCharacterEdit(!showCharacterEdit)}
                      className="text-[10px] px-2 py-1 rounded bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white transition-colors"
                    >
                      {showCharacterEdit ? '접기' : '수정'}
                    </button>
                    {characterPrompt !== CONFIG.DEFAULT_CHARACTER_PROMPT && (
                      <button
                        type="button"
                        onClick={resetCharacterPrompt}
                        className="text-[10px] px-2 py-1 rounded bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white transition-colors"
                      >
                        초기화
                      </button>
                    )}
                  </div>
                </div>

                {!showCharacterEdit ? (
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {characterPrompt.slice(0, 100)}...
                  </p>
                ) : (
                  <div className="mt-2">
                    <textarea
                      value={characterPrompt}
                      onChange={(e) => saveCharacterPrompt(e.target.value)}
                      className="w-full h-28 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      이 캐릭터 설명이 모든 이미지에 적용됩니다. 선택한 화풍과 합쳐집니다.
                    </p>
                  </div>
                )}
              </div>

              {/* 화풍 선택 */}
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-slate-400">화풍 선택</label>
                {getSelectedFluxStyle() && (
                  <span className="text-xs text-blue-400">
                    {getSelectedFluxStyle()?.category} &gt; {getSelectedFluxStyle()?.name}
                  </span>
                )}
              </div>

              {FLUX_STYLE_CATEGORIES.map((category) => (
                <div key={category.id} className="mb-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {category.name}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {category.styles.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => selectFluxStyle(style.id as FluxStyleId)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          fluxStyleId === style.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {style.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* 커스텀 스타일 (직접 입력) */}
              <div className="mt-4 pt-3 border-t border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => selectFluxStyle('custom')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      fluxStyleId === 'custom'
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    ✏️ 커스텀 스타일
                  </button>
                  <span className="text-[10px] text-slate-500">직접 페르소나/스타일 설명 입력</span>
                </div>

                {fluxStyleId === 'custom' && (
                  <div className="mt-2">
                    <textarea
                      value={customStylePrompt}
                      onChange={(e) => saveCustomStyle(e.target.value)}
                      placeholder="예: Simple stick figure with black outlines, minimalist Korean comic style, expressive round face, thin limbs..."
                      className="w-full h-24 bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none resize-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      영어로 스타일을 상세히 설명하세요. 이 설명이 모든 이미지 프롬프트 앞에 추가됩니다.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ElevenLabs TTS 설정 */}
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setShowElevenLabsSettings(!showElevenLabsSettings)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">ElevenLabs TTS 설정</h3>
                <p className="text-slate-500 text-xs">
                  {elApiKey ? `모델: ${ELEVENLABS_MODELS.find(m => m.id === elModelId)?.name || elModelId}` : 'API Key 미설정 (Gemini 폴백)'}
                </p>
              </div>
            </div>
            <svg className={`w-5 h-5 text-slate-500 transition-transform ${showElevenLabsSettings ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showElevenLabsSettings && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
              {/* API Key */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">API Key</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={elApiKey}
                    onChange={(e) => setElApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => loadVoices()}
                    disabled={!elApiKey || elApiKey.length < 10 || isLoadingVoices}
                    className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap"
                  >
                    {isLoadingVoices ? '로딩...' : '음성 불러오기'}
                  </button>
                </div>
              </div>

              {/* Voice ID Selection */}
              <div ref={voiceDropdownRef} className="relative">
                <label className="block text-xs font-bold text-slate-400 mb-2">
                  Voice 선택 {voices.length > 0 && <span className="text-purple-400">({voices.length}개)</span>}
                </label>

                {/* 선택 버튼 */}
                <button
                  type="button"
                  onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between hover:border-slate-600 transition-colors"
                >
                  <span className={elVoiceId ? 'text-white' : 'text-slate-500'}>
                    {getSelectedVoiceName()}
                  </span>
                  <svg className={`w-4 h-4 text-slate-500 transition-transform ${showVoiceDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* 드롭다운 목록 */}
                {showVoiceDropdown && (
                  <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                    {/* 기본값 옵션 */}
                    <button
                      type="button"
                      onClick={() => { setElVoiceId(''); setShowVoiceDropdown(false); }}
                      className={`w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 ${!elVoiceId ? 'bg-purple-600/20' : ''}`}
                    >
                      <div className="font-bold text-sm text-slate-300">기본값 사용</div>
                      <div className="text-xs text-slate-500">시스템 기본 음성</div>
                    </button>

                    {voices.length === 0 ? (
                      <div className="px-4 py-6 text-center text-slate-500 text-sm">
                        {isLoadingVoices ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent animate-spin rounded-full"></div>
                            음성 목록 로딩 중...
                          </div>
                        ) : (
                          'API Key를 입력하고 "음성 불러오기" 버튼을 클릭하세요'
                        )}
                      </div>
                    ) : (
                      voices.map((voice) => (
                        <div
                          key={voice.voice_id}
                          className={`flex items-center gap-2 px-4 py-3 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-b-0 ${elVoiceId === voice.voice_id ? 'bg-purple-600/20' : ''}`}
                        >
                          {/* 미리듣기 버튼 */}
                          {voice.preview_url && (
                            <button
                              type="button"
                              onClick={(e) => playVoicePreview(e, voice)}
                              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                playingVoiceId === voice.voice_id
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                              }`}
                              title="미리듣기"
                            >
                              {playingVoiceId === voice.voice_id ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <rect x="6" y="5" width="4" height="14" rx="1" />
                                  <rect x="14" y="5" width="4" height="14" rx="1" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              )}
                            </button>
                          )}

                          {/* 음성 정보 (클릭하면 선택) */}
                          <button
                            type="button"
                            onClick={() => selectVoice(voice)}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-sm text-white">{voice.name}</div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                                {voice.category}
                              </span>
                            </div>
                            {voice.labels && (
                              <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-1">
                                {voice.labels.gender && <span>{voice.labels.gender}</span>}
                                {voice.labels.accent && <span>• {voice.labels.accent}</span>}
                                {voice.labels.age && <span>• {voice.labels.age}</span>}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-600 mt-1 font-mono">{voice.voice_id}</div>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 직접 입력 옵션 */}
                <div className="mt-2">
                  <input
                    type="text"
                    value={elVoiceId}
                    onChange={(e) => setElVoiceId(e.target.value)}
                    placeholder="또는 Voice ID 직접 입력..."
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">TTS 모델</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ELEVENLABS_MODELS.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setElModelId(model.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        elModelId === model.id
                          ? 'bg-purple-600/20 border-purple-500 text-white'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{model.name}</span>
                        {model.supportsTimestamp ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-bold">자막</span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">자막X</span>
                        )}
                      </div>
                      <div className="text-xs opacity-70 mt-1">{model.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={saveElevenLabsSettings}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
              >
                설정 저장
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs and Submit */}
      <div className="flex justify-center mb-6">
        <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 flex gap-1">
          <button type="button" onClick={() => setActiveTab('auto')} className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'auto' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>자동 트렌드</button>
          <button type="button" onClick={() => setActiveTab('manual')} className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'manual' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>수동 대본</button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        {activeTab === 'auto' ? (
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-600 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative flex items-center bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden pr-2">
              <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} disabled={isProcessing} placeholder="경제 트렌드 키워드 입력 (예: 비트코인, 금리)..." className="block w-full bg-transparent text-slate-100 py-5 px-6 focus:ring-0 focus:outline-none placeholder-slate-600 text-lg disabled:opacity-50" />
              <button type="submit" disabled={isProcessing || !topic.trim()} className="bg-brand-600 hover:bg-brand-500 text-white font-black py-3 px-8 rounded-xl transition-all disabled:opacity-50 whitespace-nowrap">{isProcessing ? '생성 중' : '시작'}</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden">
              <textarea value={manualScript} onChange={(e) => setManualScript(e.target.value)} placeholder="직접 작성한 대본을 입력하세요. AI가 시각적 연출안을 생성합니다." className="w-full h-80 bg-transparent text-slate-100 p-8 focus:ring-0 focus:outline-none placeholder-slate-600 resize-none" disabled={isProcessing} />
            </div>
            <button type="submit" disabled={isProcessing || !manualScript.trim()} className="w-full bg-slate-100 hover:bg-white text-slate-950 font-black py-5 rounded-2xl transition-all disabled:opacity-50 uppercase tracking-widest text-sm">스토리보드 생성</button>
          </div>
        )}
      </form>
    </div>
  );
};

export default InputSection;
