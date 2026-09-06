import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  LogOut,
  Sparkles,
  Link,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { 
  googleSignIn, 
  googleSignOut, 
  getGoogleUser, 
  initAuth 
} from '../services/googleAuthService';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { StorageService } from '../services/storageService';
import { User } from 'firebase/auth';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose
}) => {
  const [googleUser, setGoogleUser] = useState<User | null>(getGoogleUser());
  const [spreadsheetId, setSpreadsheetId] = useState<string>(GoogleSheetsService.getStoredSpreadsheetId() || '');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(
    GoogleSheetsService.getStoredSpreadsheetId() 
      ? `https://docs.google.com/spreadsheets/d/${GoogleSheetsService.getStoredSpreadsheetId()}/edit` 
      : ''
  );

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setGoogleUser(user);
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setStatusMessage({ 
          type: 'success', 
          text: `구글 계정(${res.user.email || res.user.displayName})으로 성공적으로 연결되었습니다.` 
        });
      }
    } catch (err: any) {
      setStatusMessage({ 
        type: 'error', 
        text: `구글 로그인 실패: ${err.message || '인증이 취소되었거나 팝업이 차단되었습니다.'}` 
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setStatusMessage({ type: 'info', text: '구글 계정 연동이 해제되었습니다.' });
  };

  const handleCreateOrConnectSheet = async () => {
    if (!googleUser) {
      setStatusMessage({ type: 'error', text: '먼저 [Google 계정으로 연결하기]를 진행해주세요.' });
      return;
    }

    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const id = await GoogleSheetsService.getOrCreateSpreadsheet();
      setSpreadsheetId(id);
      const url = `https://docs.google.com/spreadsheets/d/${id}/edit`;
      setSpreadsheetUrl(url);

      // Also do an initial full sync of existing data
      const matches = StorageService.getMatches();

      let matchCount = 0;
      for (const m of matches) {
        if (m.subMatches.some(s => s.status === 'COMPLETED')) {
          await GoogleSheetsService.appendMatchResult(m, '전체동기화');
          matchCount++;
        }
      }

      setStatusMessage({
        type: 'success',
        text: `구글 스프레드시트가 연결되었습니다! (완료 경기 ${matchCount}건 구글 시트 동기화 완료)`
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `스프레드시트 연결 오류: ${err.message || '스프레드시트 생성 또는 데이터 기록 실패'}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualIdSave = () => {
    if (!spreadsheetId.trim()) return;
    GoogleSheetsService.setStoredSpreadsheetId(spreadsheetId.trim());
    setSpreadsheetUrl(`https://docs.google.com/spreadsheets/d/${spreadsheetId.trim()}/edit`);
    setStatusMessage({ type: 'success', text: '스프레드시트 ID가 저장되었습니다.' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#12192B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0A0F1D] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Google 스프레드시트 실시간 연동</span>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  OFFICIAL SHEETS API
                </span>
              </h2>
              <p className="text-xs text-white/50">
                경기 결과 입력 및 실시간 점수판 운영 시 구글 스프레드시트에 실시간 자동 기록됩니다.
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
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 font-medium ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Step 1: Google Account Connection */}
          <div className="p-5 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#E2FF00] font-mono uppercase tracking-wider">
                  STEP 1. Google 계정 인증
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  결과 및 소감문이 기록될 본인의 구글 계정으로 연동합니다.
                </p>
              </div>
              {googleUser && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 연동됨
                </span>
              )}
            </div>

            {googleUser ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-[#12192B] border border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-xs">
                    {googleUser.displayName?.charAt(0) || googleUser.email?.charAt(0) || 'G'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{googleUser.displayName || 'Google 사용자'}</div>
                    <div className="text-[11px] text-white/40 font-mono">{googleUser.email}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition flex items-center justify-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>연동 해제</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold bg-white text-black hover:bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.15)] transition flex items-center justify-center gap-2.5 active:scale-95"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>{isLoggingIn ? 'Google 계정 연결 중...' : 'Google 계정으로 연결하기'}</span>
              </button>
            )}
          </div>

          {/* Step 2: Spreadsheet Creation & Auto Sync */}
          <div className="p-5 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-4">
            <h3 className="text-xs font-bold text-[#E2FF00] font-mono uppercase tracking-wider">
              STEP 2. 배드민턴 리그 전용 스프레드시트 생성 및 자동 연동
            </h3>
            <p className="text-xs text-white/60 leading-relaxed">
              [원클릭 스프레드시트 생성 및 동기화]를 누르면 본인의 Google Drive에 <strong className="text-white">‘경기결과’</strong> 및 <strong className="text-white">‘학생소감문_기록’</strong> 시트가 자동 생성되고 모든 데이터가 실시간 동기화됩니다.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCreateOrConnectSheet}
                disabled={isSyncing || !googleUser}
                className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-[#E2FF00] hover:bg-[#d5f000] text-black shadow-[0_0_12px_rgba(226,255,0,0.25)] transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? '스프레드시트 생성 및 동기화 중...' : '원클릭 스프레드시트 생성 및 동기화'}</span>
              </button>

              {spreadsheetUrl && (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto py-3 px-4 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>내 스프레드시트 열기</span>
                </a>
              )}
            </div>

            {/* Existing Spreadsheet ID Manual Input (Optional) */}
            <div className="pt-3 border-t border-white/5 space-y-2">
              <label className="text-[11px] text-white/50 block font-mono">
                기존 Google 스프레드시트 ID 직접 연결 (선택사항)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  placeholder="예: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="flex-1 px-3.5 py-2 rounded-lg bg-[#12192B] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#E2FF00]"
                />
                <button
                  type="button"
                  onClick={handleManualIdSave}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition font-mono whitespace-nowrap"
                >
                  ID 저장
                </button>
              </div>
            </div>
          </div>

          {/* Role-based Automatic Action Info */}
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2.5">
            <h4 className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>역할별 자동 구글 시트 입력 안내</span>
            </h4>
            <ul className="text-xs text-white/70 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>
                <strong className="text-white">학생자치회 / 체육교사</strong>: 경기 일정 탭 또는 점수판에서 경기 결과를 확정 저장할 때 <span className="text-[#E2FF00] font-medium">‘경기결과’</span> 탭에 라운드, 세트스코어, 승리팀, 선수명, MVP가 실시간 행으로 추가됩니다.
              </li>
              <li>
                <strong className="text-white">일반 학생</strong>: 개인 소감 및 경기 일기 탭에서 소감문을 작성하면 <span className="text-emerald-400 font-medium">‘학생소감문_기록’</span> 탭에 학년/반/번호/성명/향상기술/소감문 전문이 자동 기록됩니다.
              </li>
            </ul>
          </div>

        </div>

        {/* Footer */}
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
