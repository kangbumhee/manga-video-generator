import React, { useState, useEffect } from 'react';

// 저장 키 상수
const STORAGE_KEYS = {
  APIYI_API_KEY: 'tubegen_apiyi_key',
  ELEVENLABS_API_KEY: 'tubegen_el_key',
  ELEVENLABS_VOICE_ID: 'tubegen_el_voice',
  ELEVENLABS_MODEL: 'tubegen_el_model',
  FAL_API_KEY: 'tubegen_fal_key',
};

const SettingsPage: React.FC = () => {
  const [apiyiKey, setApiyiKey] = useState('');
  const [apiyiKeyVisible, setApiyiKeyVisible] = useState(false);
  const [apiyiTestStatus, setApiyiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const [elKey, setElKey] = useState('');
  const [elKeyVisible, setElKeyVisible] = useState(false);
  const [elVoiceId, setElVoiceId] = useState('21m00Tcm4TlvDq8ikWAM');
  const [elModel, setElModel] = useState('eleven_multilingual_v2');

  const [falKey, setFalKey] = useState('');
  const [falKeyVisible, setFalKeyVisible] = useState(false);

  const [apiyiGuideOpen, setApiyiGuideOpen] = useState(false);
  const [elGuideOpen, setElGuideOpen] = useState(false);
  const [falGuideOpen, setFalGuideOpen] = useState(false);

  useEffect(() => {
    setApiyiKey(localStorage.getItem(STORAGE_KEYS.APIYI_API_KEY) || '');
    setElKey(localStorage.getItem(STORAGE_KEYS.ELEVENLABS_API_KEY) || '');
    setElVoiceId(localStorage.getItem(STORAGE_KEYS.ELEVENLABS_VOICE_ID) || '21m00Tcm4TlvDq8ikWAM');
    setElModel(localStorage.getItem(STORAGE_KEYS.ELEVENLABS_MODEL) || 'eleven_multilingual_v2');
    setFalKey(localStorage.getItem(STORAGE_KEYS.FAL_API_KEY) || '');
  }, []);

  const saveApiyiKey = (key: string) => {
    setApiyiKey(key);
    localStorage.setItem(STORAGE_KEYS.APIYI_API_KEY, key);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ [STORAGE_KEYS.APIYI_API_KEY]: key });
    }
  };

  const saveElKey = (key: string) => {
    setElKey(key);
    localStorage.setItem(STORAGE_KEYS.ELEVENLABS_API_KEY, key);
  };

  const saveElVoiceId = (id: string) => {
    setElVoiceId(id);
    localStorage.setItem(STORAGE_KEYS.ELEVENLABS_VOICE_ID, id);
  };

  const saveElModel = (model: string) => {
    setElModel(model);
    localStorage.setItem(STORAGE_KEYS.ELEVENLABS_MODEL, model);
  };

  const saveFalKey = (key: string) => {
    setFalKey(key);
    localStorage.setItem(STORAGE_KEYS.FAL_API_KEY, key);
  };

  const testApiyiConnection = async () => {
    if (!apiyiKey || apiyiKey.length < 5) {
      alert('API 키를 먼저 입력해주세요.');
      return;
    }
    setApiyiTestStatus('testing');
    try {
      const response = await fetch('https://api.apiyi.com/v1/models', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiyiKey}` },
      });
      if (response.ok) {
        setApiyiTestStatus('success');
      } else {
        setApiyiTestStatus('error');
      }
    } catch (e) {
      setApiyiTestStatus('error');
    }
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 10) return '미설정';
    return key.slice(0, 4) + '...' + key.slice(-4);
  };

  const resetAll = () => {
    if (!confirm('모든 API 키와 설정을 초기화하시겠습니까?')) return;
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    setApiyiKey(''); setElKey(''); setElVoiceId('21m00Tcm4TlvDq8ikWAM');
    setElModel('eleven_multilingual_v2'); setFalKey('');
    setApiyiTestStatus('idle');
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove(Object.values(STORAGE_KEYS));
    }
    alert('모든 설정이 초기화되었습니다.');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">API 설정</h1>
      <p className="text-slate-400 mb-8">만화 영상 생성에 필요한 API 키를 설정합니다.</p>

      {/* 카드 1: APIYI */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-1">APIYI 통합 API (추천)</h2>
        <p className="text-slate-400 text-sm mb-4">
          하나의 API 키로 Gemini, GPT, Claude, 이미지 생성, 영상 생성(Sora 2)을 모두 사용할 수 있습니다.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">APIYI API Key</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={apiyiKeyVisible ? 'text' : 'password'}
                value={apiyiKey}
                onChange={(e) => saveApiyiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => setApiyiKeyVisible(!apiyiKeyVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {apiyiKeyVisible ? '🙈' : '👁️'}
              </button>
            </div>
            <button
              onClick={testApiyiConnection}
              disabled={apiyiTestStatus === 'testing'}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm whitespace-nowrap disabled:opacity-50"
            >
              {apiyiTestStatus === 'testing' ? '테스트 중...' : '연결 테스트'}
            </button>
          </div>
          {apiyiTestStatus === 'success' && (
            <p className="text-green-400 text-sm mt-2">연결 성공! API 키가 유효합니다.</p>
          )}
          {apiyiTestStatus === 'error' && (
            <p className="text-red-400 text-sm mt-2">연결 실패. API 키를 확인해주세요.</p>
          )}
        </div>

        <button
          onClick={() => setApiyiGuideOpen(!apiyiGuideOpen)}
          className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
        >
          API 키 발급 방법 {apiyiGuideOpen ? '▲' : '▼'}
        </button>
        {apiyiGuideOpen && (
          <div className="mt-3 bg-slate-800 rounded-xl p-4 text-sm text-slate-300 space-y-2">
            <p className="font-bold text-white">APIYI API 키 발급 방법</p>
            <ol className="list-decimal list-inside space-y-1">
              <li><a href="https://api.apiyi.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">https://api.apiyi.com</a> 접속</li>
              <li>우측 상단 &quot;Register/Login&quot; 클릭</li>
              <li>이메일 또는 GitHub로 회원가입</li>
              <li>로그인 후 좌측 메뉴에서 &quot;API Keys&quot; 클릭</li>
              <li>&quot;Create New Key&quot; 버튼 클릭</li>
              <li>키 이름 입력 (예: manga-generator) → &quot;Create&quot; 클릭</li>
              <li>생성된 키를 복사하여 위 입력란에 붙여넣기</li>
            </ol>
            <div className="mt-3 p-3 bg-slate-700 rounded-lg">
              <p>💡 신규 가입 시 <strong className="text-green-400">300만 토큰 무료</strong> 제공!</p>
              <p>💡 충전은 최소 $1부터 가능</p>
              <p className="mt-2">지원 모델: GPT-5.2, Claude Opus 4.5, Gemini 3 Pro, 이미지 생성 (GPT Image 1.5, Nano Banana Pro, DALL-E 3), 영상 생성 (Sora 2) 등 200+ 모델</p>
            </div>
          </div>
        )}
      </div>

      {/* 카드 2: ElevenLabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-1">ElevenLabs TTS (음성 생성)</h2>
        <p className="text-slate-400 text-sm mb-4">고품질 AI 음성을 생성합니다. 무료 플랜으로 월 10,000자 사용 가능.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">ElevenLabs API Key</label>
            <div className="relative">
              <input
                type={elKeyVisible ? 'text' : 'password'}
                value={elKey}
                onChange={(e) => saveElKey(e.target.value)}
                placeholder="xi_..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => setElKeyVisible(!elKeyVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {elKeyVisible ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Voice ID</label>
            <input
              type="text"
              value={elVoiceId}
              onChange={(e) => saveElVoiceId(e.target.value)}
              placeholder="21m00Tcm4TlvDq8ikWAM"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-slate-500 text-xs mt-1">기본값: Rachel (여성, 나레이션에 최적화)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">TTS 모델</label>
            <select
              value={elModel}
              onChange={(e) => saveElModel(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="eleven_multilingual_v2">Multilingual v2 (추천, 다국어 29개)</option>
              <option value="eleven_v3">Eleven v3 (최신, 70개 언어)</option>
              <option value="eleven_turbo_v2_5">Turbo v2.5 (빠른 속도)</option>
              <option value="eleven_flash_v2_5">Flash v2.5 (초고속)</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setElGuideOpen(!elGuideOpen)}
          className="text-indigo-400 hover:text-indigo-300 text-sm font-medium mt-4"
        >
          API 키 발급 방법 {elGuideOpen ? '▲' : '▼'}
        </button>
        {elGuideOpen && (
          <div className="mt-3 bg-slate-800 rounded-xl p-4 text-sm text-slate-300 space-y-2">
            <p className="font-bold text-white">ElevenLabs API 키 발급 방법</p>
            <ol className="list-decimal list-inside space-y-1">
              <li><a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">https://elevenlabs.io</a> 접속</li>
              <li>&quot;Sign Up&quot; 클릭하여 회원가입</li>
              <li>로그인 후 좌측 하단 프로필 아이콘 클릭</li>
              <li>&quot;Profile + API key&quot; 선택</li>
              <li>&quot;API Key&quot; 섹션에서 눈 아이콘 클릭하여 키 확인</li>
              <li>키를 복사하여 위 입력란에 붙여넣기</li>
            </ol>
            <div className="mt-3 p-3 bg-slate-700 rounded-lg">
              <p>💡 무료 플랜: 매월 <strong className="text-green-400">10,000자 무료</strong></p>
              <p>💡 Starter 플랜: $5/월, 30,000자</p>
            </div>
          </div>
        )}
      </div>

      {/* 카드 3: FAL.ai */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-1">FAL.ai 영상 변환 (선택사항)</h2>
        <p className="text-slate-400 text-sm mb-4">이미지를 움직이는 영상으로 변환합니다. APIYI의 Sora 2를 대신 사용할 수도 있습니다.</p>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">FAL API Key</label>
          <div className="relative">
            <input
              type={falKeyVisible ? 'text' : 'password'}
              value={falKey}
              onChange={(e) => saveFalKey(e.target.value)}
              placeholder="fal_..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => setFalKeyVisible(!falKeyVisible)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {falKeyVisible ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button
          onClick={() => setFalGuideOpen(!falGuideOpen)}
          className="text-indigo-400 hover:text-indigo-300 text-sm font-medium mt-4"
        >
          API 키 발급 방법 {falGuideOpen ? '▲' : '▼'}
        </button>
        {falGuideOpen && (
          <div className="mt-3 bg-slate-800 rounded-xl p-4 text-sm text-slate-300 space-y-2">
            <p className="font-bold text-white">FAL.ai API 키 발급 방법</p>
            <ol className="list-decimal list-inside space-y-1">
              <li><a href="https://fal.ai" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">https://fal.ai</a> 접속</li>
              <li>&quot;Sign Up&quot; 클릭 → GitHub 또는 Google로 가입</li>
              <li>로그인 후 우측 상단 프로필 → &quot;Keys&quot; 클릭</li>
              <li>&quot;Create Key&quot; 클릭</li>
              <li>키를 복사하여 위 입력란에 붙여넣기</li>
            </ol>
            <div className="mt-3 p-3 bg-slate-700 rounded-lg">
              <p>💡 신규 가입 시 <strong className="text-green-400">$10 무료 크레딧</strong></p>
              <p>💡 영상 1개당 약 $0.15 (5초 기준)</p>
            </div>
          </div>
        )}
      </div>

      {/* 현재 설정 상태 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-4">현재 설정 상태</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-800">
              <th className="text-left py-2">서비스</th>
              <th className="text-left py-2">상태</th>
              <th className="text-left py-2">키</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800">
              <td className="py-3 text-slate-300">APIYI (스크립트+이미지+영상)</td>
              <td className="py-3">{apiyiKey ? <span className="text-green-400">설정됨</span> : <span className="text-red-400">미설정</span>}</td>
              <td className="py-3 text-slate-500 font-mono text-xs">{maskKey(apiyiKey)}</td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 text-slate-300">ElevenLabs (음성 TTS)</td>
              <td className="py-3">{elKey ? <span className="text-green-400">설정됨</span> : <span className="text-yellow-400">미설정 (Gemini TTS 사용)</span>}</td>
              <td className="py-3 text-slate-500 font-mono text-xs">{maskKey(elKey)}</td>
            </tr>
            <tr>
              <td className="py-3 text-slate-300">FAL.ai (영상 변환)</td>
              <td className="py-3">{falKey ? <span className="text-green-400">설정됨</span> : <span className="text-slate-500">미설정 (선택사항)</span>}</td>
              <td className="py-3 text-slate-500 font-mono text-xs">{maskKey(falKey)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-center">
        <button
          onClick={resetAll}
          className="px-6 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30 text-sm font-medium"
        >
          모든 설정 초기화
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
