import React from 'react';
import { 
  X, 
  Award, 
  Trophy, 
  CheckCircle, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  User, 
  Users, 
  Calendar, 
  Activity, 
  Edit3, 
  ArrowRight,
  Flame,
  BadgeCheck
} from 'lucide-react';
import { SubMatch, TieMatch, UserProfile, MatchCategory, isCouncilRole, isCaptainRole, isAdminRole } from '../types';
import { StorageService } from '../services/storageService';
import { CATEGORIES } from '../data/initialData';

interface MatchResultDetailModalProps {
  isOpen: boolean;
  tieMatchId: string | null;
  subMatchId: string | null;
  currentUser: UserProfile | null;
  onClose: () => void;
  onOpenEdit?: (tieMatchId: string, subMatchId: string) => void;
  onOpenLiveScore?: (tieMatchId: string, subMatchId: string) => void;
}

export const MatchResultDetailModal: React.FC<MatchResultDetailModalProps> = ({
  isOpen,
  tieMatchId,
  subMatchId,
  currentUser,
  onClose,
  onOpenEdit,
  onOpenLiveScore
}) => {
  if (!isOpen || !tieMatchId || !subMatchId) return null;

  const matches = StorageService.getMatches();
  const tie = matches.find(m => m.id === tieMatchId);
  if (!tie) return null;

  const subMatch = tie.subMatches.find(s => s.id === subMatchId);
  if (!subMatch) return null;

  const categoryInfo = CATEGORIES.find(c => c.id === subMatch.category);
  const teamAGrade = tie.teamAGrade || tie.grade || 1;
  const teamBGrade = tie.teamBGrade || tie.grade || 1;

  const hasScore = subMatch.sets && subMatch.sets.length > 0;
  const scoreA = hasScore ? (subMatch.sets[0].scoreA || 0) : 0;
  const scoreB = hasScore ? (subMatch.sets[0].scoreB || 0) : 0;
  const isAWin = subMatch.winnerTeam === 'A' || (hasScore && scoreA > scoreB);
  const isBWin = subMatch.winnerTeam === 'B' || (hasScore && scoreB > scoreA);
  const isCompleted = subMatch.status === 'COMPLETED' || (scoreA >= 15 || scoreB >= 15);

  const canEdit = isCouncilRole(currentUser?.role) || isAdminRole(currentUser?.role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#12192B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0A0F1D] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E2FF00]/10 border border-[#E2FF00]/30 flex items-center justify-center text-[#E2FF00]">
              <Trophy className="w-5 h-5 text-[#E2FF00]" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#E2FF00]">
                <span>제{tie.roundId}라운드</span>
                <span>•</span>
                <span>{tie.date}</span>
                <span>•</span>
                <span>{subMatch.court}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                공식 경기 결과 조회 및 보고서
                {isCompleted && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-normal flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" /> 공식 인증 완료
                  </span>
                )}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {/* Category & Status Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0A0F1D] border border-white/10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-[#E2FF00] text-black font-mono">
                {categoryInfo?.name || subMatch.category}
              </span>
              <span className="text-xs text-white/60 font-mono">
                단판 15점 승부제
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-white/40">진행 상태:</span>
              {isCompleted ? (
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> 경기 종료 (최종 확정)
                </span>
              ) : subMatch.status === 'IN_PROGRESS' ? (
                <span className="font-bold text-[#E2FF00] animate-pulse flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" /> 실시간 진행 중
                </span>
              ) : (
                <span className="text-white/60">경기 예정 (출전 준비)</span>
              )}
            </div>
          </div>

          {/* Scoreboard Clash Box */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-stretch">
            
            {/* Team A */}
            <div className={`md:col-span-3 p-5 rounded-2xl border text-center transition-all ${
              isAWin 
                ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                : 'bg-[#0A0F1D] border-white/10'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white/60 font-mono">TEAM A</span>
                {isAWin && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono">
                    WINNER 승리
                  </span>
                )}
              </div>

              <h3 className="text-lg font-bold text-white tracking-tight">
                {teamAGrade}학년 {tie.teamAClass}반
              </h3>

              <div className="mt-3 py-2 px-3 rounded-xl bg-white/5 text-xs text-white/80 min-h-[44px] flex items-center justify-center font-medium">
                {subMatch.teamAPlayers && subMatch.teamAPlayers.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {subMatch.teamAPlayers.map((p, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 text-white font-mono text-xs">
                        <User className="w-3 h-3 text-[#E2FF00]" />
                        {p.name} {p.studentNum ? `(${p.studentNum}번)` : ''}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-white/40">출전 선수 미등록</span>
                )}
              </div>

              {/* Big Score */}
              <div className="mt-4 py-3 bg-[#12192B] rounded-xl border border-white/10">
                <span className={`text-4xl sm:text-5xl font-extrabold font-mono tabular-nums ${isAWin ? 'text-[#E2FF00]' : 'text-white/80'}`}>
                  {scoreA}
                </span>
                <div className="text-[10px] text-white/40 font-mono mt-0.5">득점 (15점제)</div>
              </div>
            </div>

            {/* Middle VS / Result */}
            <div className="md:col-span-1 flex flex-col items-center justify-center py-2">
              <span className="text-white/30 text-xs font-mono font-bold">VS</span>
              <div className="w-px h-8 bg-white/10 my-1 hidden md:block" />
              <div className="text-center font-mono">
                <span className="text-xs text-[#E2FF00] font-bold">1세트</span>
                <span className="block text-[10px] text-white/40">단판제</span>
              </div>
            </div>

            {/* Team B */}
            <div className={`md:col-span-3 p-5 rounded-2xl border text-center transition-all ${
              isBWin 
                ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                : 'bg-[#0A0F1D] border-white/10'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white/60 font-mono">TEAM B</span>
                {isBWin && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono">
                    WINNER 승리
                  </span>
                )}
              </div>

              <h3 className="text-lg font-bold text-white tracking-tight">
                {teamBGrade}학년 {tie.teamBClass}반
              </h3>

              <div className="mt-3 py-2 px-3 rounded-xl bg-white/5 text-xs text-white/80 min-h-[44px] flex items-center justify-center font-medium">
                {subMatch.teamBPlayers && subMatch.teamBPlayers.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {subMatch.teamBPlayers.map((p, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 text-white font-mono text-xs">
                        <User className="w-3 h-3 text-[#E2FF00]" />
                        {p.name} {p.studentNum ? `(${p.studentNum}번)` : ''}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-white/40">출전 선수 미등록</span>
                )}
              </div>

              {/* Big Score */}
              <div className="mt-4 py-3 bg-[#12192B] rounded-xl border border-white/10">
                <span className={`text-4xl sm:text-5xl font-extrabold font-mono tabular-nums ${isBWin ? 'text-[#E2FF00]' : 'text-white/80'}`}>
                  {scoreB}
                </span>
                <div className="text-[10px] text-white/40 font-mono mt-0.5">득점 (15점제)</div>
              </div>
            </div>

          </div>

          {/* Official Certification Record Info Grid */}
          <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-3">
            <h4 className="text-xs font-bold text-white/70 font-mono uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#E2FF00]" />
              공식 경기 인증 정보 (심판진·기록자)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              
              {/* Referee (심판진) */}
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="text-[11px] font-medium text-white/50 block mb-1">
                  ⚖️ 공식 심판 (Referee)
                </span>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span className="text-[#E2FF00] font-mono">
                    {subMatch.referee || '학생 심판진 배정'}
                  </span>
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">경기 공정 판정 및 심판 확인</div>
              </div>

              {/* Recorder (기록원 / 학생자치회) */}
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="text-[11px] font-medium text-white/50 block mb-1">
                  ✍️ 경기 기록원 (Recorded By)
                </span>
                <div className="text-sm font-bold text-white">
                  {subMatch.recordedBy || '학생자치회 경기운영부'}
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">스코어 집계 및 공식 입력</div>
              </div>

            </div>
          </div>

          {/* Quick Notice for General Students & Referees */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">전교생 및 심판진 실시간 조회 지원:</span> 본 경기 결과는 학생자치회가 입력하고 체육교사가 승인한 공식 리그 경기 결과이며, 일반 학생과 심판진 누구나 실시간으로 열람 가능합니다.
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#0A0F1D] border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            {onOpenLiveScore && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLiveScore(tie.id, subMatch.id);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#E2FF00] bg-[#E2FF00]/10 hover:bg-[#E2FF00]/20 border border-[#E2FF00]/30 transition flex items-center gap-1.5 font-mono"
              >
                <Activity className="w-4 h-4" />
                <span>라이브 스코어보드 보기</span>
              </button>
            )}

            {canEdit && onOpenEdit && (
              <button
                onClick={() => {
                  onClose();
                  onOpenEdit(tie.id, subMatch.id);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/15 border border-white/20 transition flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4 text-[#E2FF00]" />
                <span>경기 결과 수정 (권한자)</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-black bg-[#E2FF00] hover:opacity-90 transition font-mono"
          >
            확인 및 닫기
          </button>

        </div>

      </div>
    </div>
  );
};
