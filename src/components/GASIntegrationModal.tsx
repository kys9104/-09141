import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Send, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { GASService } from '../services/gasService';
import { GASConfig } from '../types';

interface GASIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GASIntegrationModal: React.FC<GASIntegrationModalProps> = ({
  isOpen,
  onClose
}) => {
  const [config, setConfig] = useState<GASConfig>(GASService.getConfig());
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  if (!isOpen) return null;

  const gasCode = GASService.getGASScriptCode();

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gasCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveConfig = () => {
    GASService.saveConfig(config);
    setTestResult({ success: true, message: 'Google Apps Script 설정이 저장되었습니다.' });
  };

  const handleTestConnection = async () => {
    if (!config.webAppUrl || !config.webAppUrl.trim()) {
      setTestResult({ success: false, message: '배포된 웹 앱 URL을 먼저 입력해주세요.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await GASService.testConnection(config.webAppUrl.trim());
    setIsTesting(false);
    setTestResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#12192B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0A0F1D] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E2FF00]/10 border border-[#E2FF00]/30 flex items-center justify-center text-[#E2FF00]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Google Apps Script (GAS) 연동</span>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#E2FF00]/10 text-[#E2FF00] border border-[#E2FF00]/30">
                  AUTO-SYNC
                </span>
              </h2>
              <p className="text-xs text-white/50">
                경기 결과, 순위표, 학생 소감문 및 생기부 문구를 구글 시트에 실시간 자동 기록합니다.
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
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Step By Step Guide */}
          <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-3">
            <h3 className="text-xs font-bold text-[#E2FF00] font-mono uppercase tracking-wider">
              📌 구글 스프레드시트 3분 연동 순서
            </h3>
            <ol className="space-y-2 text-xs text-white/70 list-decimal list-inside leading-relaxed">
              <li>
                <strong className="text-white">구글 스프레드시트</strong>를 새로 생성합니다.
              </li>
              <li>
                상단 메뉴에서 <strong className="text-white">[확장 프로그램] ➔ [Apps Script]</strong>를 클릭합니다.
              </li>
              <li>
                기존 코드를 모두 지우고 아래 <strong className="text-[#E2FF00]">[Code.gs 전체 복사]</strong> 버튼을 눌러 붙여넣기합니다.
              </li>
              <li>
                우측 상단 <strong className="text-white">[배포] ➔ [새 배포]</strong> 클릭 후, 유형을 <strong className="text-[#E2FF00]">[웹 앱]</strong>으로 선택합니다.
              </li>
              <li>
                액세스 권한을 <strong className="text-[#E2FF00]">[모든 사용자(Anyone)]</strong>로 설정 후 [배포]를 완료합니다.
              </li>
              <li>
                생성된 <strong className="text-white">웹 앱 URL</strong>을 복사하여 아래 입력창에 넣고 [URL 저장]을 클릭합니다.
              </li>
            </ol>
          </div>

          {/* Web App URL Input & Connection Test */}
          <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-3">
            <label className="block text-xs font-semibold text-white/70 font-mono">
              배포된 Google Apps Script 웹 앱 URL (Web App URL)
            </label>
            
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="url"
                value={config.webAppUrl}
                onChange={(e) => setConfig({ ...config, webAppUrl: e.target.value })}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-4 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#E2FF00]"
              />
              <button
                type="button"
                onClick={handleSaveConfig}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-[#E2FF00] hover:opacity-90 text-black whitespace-nowrap transition font-mono"
              >
                URL 저장
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 whitespace-nowrap transition flex items-center justify-center gap-1.5 font-mono"
              >
                <Send className="w-3.5 h-3.5 text-[#E2FF00]" />
                <span>{isTesting ? '테스트 중...' : '연동 테스트'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-mono ${
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
          </div>

          {/* Code.gs Code viewer */}
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

            <div className="relative rounded-xl bg-[#0A0F1D] border border-white/10 p-4 font-mono text-[11px] text-white/70 overflow-x-auto max-h-60">
              <pre>{gasCode}</pre>
            </div>
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
