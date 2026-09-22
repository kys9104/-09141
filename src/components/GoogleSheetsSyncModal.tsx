import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  ExternalLink, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Zap,
  Info
} from 'lucide-react';
import { GASService } from '../services/gasService';
import { FirebaseService } from '../services/firebaseService';
import { StorageService } from '../services/storageService';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose
}) => {
  const [webAppUrl, setWebAppUrl] = useState<string>(() => StorageService.getGasUrl());
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    // Load initial from local first, then sync with Firebase
    const local = StorageService.getGasUrl();
    if (local) {
      setWebAppUrl(local);
    }

    const loadUrl = async () => {
      try {
        const firestoreUrl = await FirebaseService.getGasUrl();
        if (firestoreUrl && firestoreUrl.trim()) {
          setWebAppUrl(firestoreUrl.trim());
        }
      } catch (e) {
        console.warn('Firebase gasUrl load note:', e);
      }
    };
    loadUrl();
  }, [isOpen]);

  if (!isOpen) return null;

  const gasCode = GASService.getScriptCode();

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gasCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSaveUrl = async () => {
    const trimmed = webAppUrl.trim();
    if (!trimmed) {
      setTestResult({ success: false, message: 'Google Apps Script 웹 앱 URL을 입력해주세요.' });
      return;
    }

    setIsSaving(true);
    setTestResult(null);
    try {
      // 1. Immediately persist locally
      StorageService.saveGasUrl(trimmed);

      // 2. Persist to Firebase Firestore
      const res = await FirebaseService.saveGasUrl(trimmed);

      setTestResult({
        success: true,
        message: res.message || 'Google Apps Script 웹 앱 URL이 저장되었습니다! (Firebase 및 로컬 동기화 완료)'
      });
    } catch (err: any) {
      // Even if Firestore fails, local storage is preserved
      setTestResult({
        success: true,
        message: 'Google Apps Script 웹 앱 URL이 로컬에 저장되었습니다.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    const trimmed = webAppUrl.trim();
    if (!trimmed) {
      setTestResult({ success: false, message: '먼저 웹 앱 URL을 입력해주세요.' });
      return;
    }

    // Auto-save the URL so user doesn't lose it
    StorageService.saveGasUrl(trimmed);
    FirebaseService.saveGasUrl(trimmed).catch(() => {});

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await GASService.testConnection(trimmed);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `연결 테스트 실패: ${err.message || '네트워크 오류'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncAllData = async () => {
    const trimmed = webAppUrl.trim();
    if (!trimmed) {
      setTestResult({ success: false, message: '먼저 웹 앱 URL을 등록해주세요.' });
      return;
    }

    // Auto-save the URL
    StorageService.saveGasUrl(trimmed);
    FirebaseService.saveGasUrl(trimmed).catch(() => {});

    setIsSyncingAll(true);
    setTestResult(null);

    try {
      const res = await GASService.syncAll();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `전체 동기화 실패: ${err.message || '서버 응답 오류'}`
      });
    } finally {
      setIsSyncingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#12192B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0A0F1D] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Google 스프레드시트 실시간 연동 (GAS)</span>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  WEB APPS SCRIPT
                </span>
              </h2>
              <p className="text-xs text-white/50">
                Google Apps Script 웹 앱 Webhook을 통해 경기 결과가 구글 시트에 실시간 자동 기록됩니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Status Box */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 font-medium font-mono ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Web App URL Configuration */}
          <div className="p-5 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#E2FF00] font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Google Apps Script 웹 앱 Webhook URL 등록
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  경기 결과가 저장될 때마다 백그라운드로 즉시 전송되는 웹 앱 URL입니다.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <input
                type="url"
                value={webAppUrl}
                onChange={(e) => setWebAppUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveUrl(); }}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-4 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#E2FF00]"
              />
              <button
                type="button"
                onClick={handleSaveUrl}
                disabled={isSaving}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-[#E2FF00] hover:bg-[#d5f000] text-black whitespace-nowrap transition font-mono shadow-[0_0_10px_rgba(226,255,0,0.2)] disabled:opacity-50"
              >
                {isSaving ? '저장 중...' : 'URL 저장'}
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 whitespace-nowrap transition flex items-center justify-center gap-1.5 font-mono disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 text-[#E2FF00] ${isTesting ? 'animate-pulse' : ''}`} />
                <span>{isTesting ? '연결 확인 중...' : '연결 테스트 (PING)'}</span>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-white/40 font-mono">
                현재 등록 상태: {webAppUrl ? '✓ URL 등록됨' : '미등록 (아래 연동 가이드 참조)'}
              </span>
              <button
                type="button"
                onClick={handleSyncAllData}
                disabled={isSyncingAll || !webAppUrl}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                <span>현재 경기 결과 전체 시트 전송</span>
              </button>
            </div>
          </div>

          {/* Step By Step Guide */}
          <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-3">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              <span>구글 스프레드시트 3분 연동 순서</span>
            </h3>
            <ol className="space-y-2 text-xs text-white/70 list-decimal list-inside leading-relaxed">
              <li>
                <strong className="text-white">구글 스프레드시트</strong>를 새로 생성합니다.
              </li>
              <li>
                상단 메뉴에서 <strong className="text-white">[확장 프로그램] ➔ [Apps Script]</strong>를 클릭합니다.
              </li>
              <li>
                기존 코드를 모두 지우고 아래 <strong className="text-[#E2FF00]">[Code.gs 전체 복사]</strong> 버튼을 눌러 붙여넣은 뒤 저장(Ctrl+S)합니다.
              </li>
              <li>
                우측 상단 <strong className="text-white">[배포] ➔ [새 배포]</strong> 클릭 후, 유형을 <strong className="text-[#E2FF00]">[웹 앱]</strong>으로 선택합니다.
              </li>
              <li>
                액세스 권한을 반드시 <strong className="text-[#E2FF00]">[모든 사용자(Anyone)]</strong>로 설정 후 [배포]를 완료합니다.
              </li>
              <li>
                생성된 <strong className="text-white">웹 앱 URL</strong>을 복사하여 위 입력창에 넣고 [URL 저장]을 누르면 연동이 완료됩니다.
              </li>
            </ol>
          </div>

          {/* Code.gs Code Viewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/70 flex items-center gap-2 font-mono">
                <span>Code.gs 소스코드 (Google Apps Script)</span>
              </span>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E2FF00]/10 hover:bg-[#E2FF00]/20 text-[#E2FF00] border border-[#E2FF00]/30 transition flex items-center gap-1.5 font-mono"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#E2FF00]" />
                    <span>복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Code.gs 전체 복사</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative rounded-xl bg-[#0A0F1D] border border-white/10 p-4 font-mono text-[11px] text-white/70 overflow-x-auto max-h-56">
              <pre>{gasCode}</pre>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#0A0F1D] border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-white/40 font-mono">
            신안해양과학고등학교 배드민턴 리그전 전용 시스템
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white/70 bg-white/5 hover:bg-white/10 transition"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};
