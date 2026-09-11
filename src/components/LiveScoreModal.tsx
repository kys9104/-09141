import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  CheckCircle, 
  Award, 
  Zap, 
  Flame, 
  Trophy, 
  Volume2,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SubMatch, TieMatch, SetScore, MatchCategory, UserProfile, isCouncilRole, isCaptainRole, isAdminRole } from '../types';
import { StorageService } from '../services/storageService';
import { GASService } from '../services/gasService';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { FirebaseService } from '../services/firebaseService';

interface LiveScoreModalProps {
  isOpen: boolean;
  tieMatchId: string | null;
  subMatchId: string | null;
  currentUser: UserProfile | null;
  onClose: () => void;
  onScoreUpdated: () => void;
  onOpenLogin?: () => void;
}

export const LiveScoreModal: React.FC<LiveScoreModalProps> = ({
  isOpen,
  tieMatchId,
  subMatchId,
  currentUser,
  onClose,
  onScoreUpdated,
  onOpenLogin
}) => {
  const [tie, setTie] = useState<TieMatch | null>(null);
  const [subMatch, setSubMatch] = useState<SubMatch | null>(null);

  // Live scoreboard states (Single Set 15 Points)
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [servingTeam, setServingTeam] = useState<'A' | 'B'>('A');
  const [mvpName, setMvpName] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !tieMatchId || !subMatchId) return;
    const matches = StorageService.getMatches();
    const currentTie = matches.find(m => m.id === tieMatchId);
    if (!currentTie) return;
    setTie(currentTie);

    const sm = currentTie.subMatches.find(s => s.id === subMatchId);
    if (!sm) return;
    setSubMatch(sm);

    if (sm.sets && sm.sets.length > 0) {
      setScoreA(sm.sets[0].scoreA || 0);
      setScoreB(sm.sets[0].scoreB || 0);
    } else {
      setScoreA(0);
      setScoreB(0);
    }

    if (sm.servingTeam) setServingTeam(sm.servingTeam);

    if (sm.stats) {
      setMvpName(sm.stats.mvpPlayerName || '');
    }
  }, [isOpen, tieMatchId, subMatchId]);

  if (!isOpen || !tie || !subMatch) return null;

  const teamAGrade = tie.teamAGrade || tie.grade || 1;
  const teamBGrade = tie.teamBGrade || tie.grade || 1;
  const canEditScore = isCouncilRole(currentUser?.role) || isCaptainRole(currentUser?.role) || isAdminRole(currentUser?.role);

  const addPointA = () => {
    if (!canEditScore) return;
    const next = scoreA + 1;
    setScoreA(next);
    setServingTeam('A');
    checkMatchWin(next, scoreB, 'A');
  };

  const subtractPointA = () => {
    if (!canEditScore || scoreA <= 0) return;
    setScoreA(scoreA - 1);
  };

  const addPointB = () => {
    if (!canEditScore) return;
    const next = scoreB + 1;
    setScoreB(next);
    setServingTeam('B');
    checkMatchWin(scoreA, next, 'B');
  };

  const subtractPointB = () => {
    if (!canEditScore || scoreB <= 0) return;
    setScoreB(scoreB - 1);
  };

  const checkMatchWin = (sA: number, sB: number, team: 'A' | 'B') => {
    // 15 points single-set win condition (reach 15 or 15-point rule)
    const isWinA = (sA >= 15 && sA - sB >= 2) || sA === 21;
    const isWinB = (sB >= 15 && sB - sA >= 2) || sB === 21;

    if (isWinA || isWinB) {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  };

  const handleSaveAndFinalize = async (isFinalMatch: boolean = false) => {
    if (!canEditScore) return;
    const matches = StorageService.getMatches();
    const tieIdx = matches.findIndex(m => m.id === tieMatchId);
    if (tieIdx === -1) return;

    const t = matches[tieIdx];
    const smIdx = t.subMatches.findIndex(s => s.id === subMatchId);
    if (smIdx === -1) return;

    const winner: 'A' | 'B' | undefined = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : undefined;
    const isMatchDone = isFinalMatch || (scoreA >= 15 && scoreA - scoreB >= 2) || (scoreB >= 15 && scoreB - scoreA >= 2) || scoreA === 21 || scoreB === 21;

    const updatedSM: SubMatch = {
      ...t.subMatches[smIdx],
      sets: [{ setNumber: 1, scoreA, scoreB }],
      winnerTeam: winner,
      status: isMatchDone ? 'COMPLETED' : 'IN_PROGRESS',
      currentSet: 1,
      currentScoreA: scoreA,
      currentScoreB: scoreB,
      servingTeam,
      stats: {
        smashWinnersA: 0,
        smashWinnersB: 0,
        dropPointsA: 0,
        dropPointsB: 0,
        serviceAcesA: 0,
        serviceAcesB: 0,
        mvpPlayerName: mvpName || (winner === 'A' ? subMatch.teamAPlayers[0]?.name : subMatch.teamBPlayers[0]?.name) || '',
        durationMinutes: 15
      }
    };

    t.subMatches[smIdx] = updatedSM;

    // Recalculate tie match total wins
    let tAWins = 0;
    let tBWins = 0;
    t.subMatches.forEach(sm => {
      if (sm.status === 'COMPLETED') {
        if (sm.winnerTeam === 'A') tAWins++;
        else if (sm.winnerTeam === 'B') tBWins++;
      }
    });

    t.teamAWins = tAWins;
    t.teamBWins = tBWins;
    if (tAWins >= 3) {
      t.winnerClass = t.teamAClass;
      t.status = 'COMPLETED';
    } else if (tBWins >= 3) {
      t.winnerClass = t.teamBClass;
      t.status = 'COMPLETED';
    } else {
      const allDone = t.subMatches.every(sm => sm.status === 'COMPLETED');
      t.status = allDone ? 'COMPLETED' : 'IN_PROGRESS';
    }

    matches[tieIdx] = t;
    StorageService.saveMatches(matches);

    const submitterName = currentUser?.name 
      ? `${currentUser.name} (${isCouncilRole(currentUser.role) ? '학생자치회' : isCaptainRole(currentUser.role) ? '체육부장/반장' : '체육교사'})`
      : '학생자치회/체육부장/교사';

    // Auto-sync to Firebase, Google Sheets REST API & GAS
    await FirebaseService.saveMatch(t, submitterName).catch(console.error);

    if (isMatchDone) {
      GoogleSheetsService.appendMatchResult(t, submitterName).catch(err => {
        console.warn('Google Sheets sync notice:', err.message);
      });
    }
    GASService.sendToGAS('MATCH_RESULT', t).catch(console.error);

    if (isMatchDone) {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 }
      });
    }

    onScoreUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#12192B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto">
        
        {/* Top Court Header */}
        <div className="px-6 py-4 bg-[#0A0F1D] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E2FF00]/10 border border-[#E2FF00]/30 flex items-center justify-center text-[#E2FF00]">
              <Zap className="w-5 h-5 animate-pulse text-[#E2FF00]" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#E2FF00]">
                <span>{subMatch.court}</span>
                <span>•</span>
                <span>제{tie.roundId}라운드 ({tie.date})</span>
                <span>•</span>
                <span className="font-bold">단판 15점 경기</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                실시간 라이브 스코어보드 & 집계
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Permission Notice Banner for Non-Authorized */}
        {!canEditScore ? (
          <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2 font-medium">
              <span className="font-bold">⚠️ [조회 전용]</span>
              <span>실시간 스코어 및 경기 결과 입력 권한은 <strong>학생자치회, 체육부장/반장 및 체육교사</strong>에게 부여되어 있습니다.</span>
            </div>
            {onOpenLogin && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold transition whitespace-nowrap ml-2"
              >
                권한 로그인
              </button>
            )}
          </div>
        ) : (
          <div className="px-6 py-2 bg-[#E2FF00]/10 border-b border-[#E2FF00]/20 flex items-center justify-between text-xs text-[#E2FF00] font-mono">
            <span className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-[#E2FF00]" />
              기록원 입력 권한 활성화됨 ({currentUser?.name}) [{isCouncilRole(currentUser?.role) ? '학생자치회' : isCaptainRole(currentUser?.role) ? '체육부장/반장' : '체육교사'}]
            </span>
            <span className="text-[11px] text-white/50">실시간 스코어 및 MVP 저장 가능</span>
          </div>
        )}

        {/* 15 Points Target Badge */}
        <div className="px-6 py-2 bg-[#0A0F1D]/80 border-b border-white/10 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-[#E2FF00]/20 text-[#E2FF00] font-bold border border-[#E2FF00]/30">
              TARGET: 15 PTS (단판)
            </span>
            <span className="text-white/40">
              {subMatch.category}
            </span>
          </div>

          {canEditScore && (
            <button
              onClick={() => { setScoreA(0); setScoreB(0); }}
              className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white transition"
            >
              <RotateCcw className="w-3 h-3" /> 점수 초기화
            </button>
          )}
        </div>

        {/* Main Scoreboard Display */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Giant Score Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            
            {/* Team A Score Card */}
            <div className={`p-6 rounded-2xl border transition-all ${
              servingTeam === 'A'
                ? 'bg-[#0A0F1D] border-[#E2FF00]/50 ring-1 ring-[#E2FF00]/30 shadow-[0_0_20px_rgba(226,255,0,0.08)]'
                : 'bg-[#0A0F1D] border-white/10'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-mono text-white/70">
                  TEAM A ({teamAGrade}학년 {tie.teamAClass}반)
                </span>
                {servingTeam === 'A' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#E2FF00]/10 text-[#E2FF00] border border-[#E2FF00]/30 flex items-center gap-1">
                    🏸 SERVICE
                  </span>
                )}
              </div>

              <div className="text-lg font-bold text-white truncate tracking-tight">
                {subMatch.teamAPlayers.map(p => p.name).join(', ') || '선수 미등록'}
              </div>

              {/* Giant Digit */}
              <div className="my-4 text-center py-6 bg-[#12192B] rounded-xl border border-white/10 shadow-inner">
                <span className="text-6xl sm:text-7xl font-extrabold text-white tracking-tighter tabular-nums font-mono">
                  {scoreA}
                </span>
              </div>

              {/* Buttons */}
              {canEditScore ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={addPointA}
                    className="py-3 rounded-xl text-base font-bold text-black bg-[#E2FF00] hover:opacity-90 shadow-[0_0_12px_rgba(226,255,0,0.25)] transition active:scale-95 font-mono"
                  >
                    +1 POINT
                  </button>
                  <button
                    onClick={subtractPointA}
                    className="py-3 rounded-xl text-sm font-bold text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 transition active:scale-95 font-mono"
                  >
                    -1 UNDO
                  </button>
                </div>
              ) : (
                <div className="py-2.5 rounded-xl bg-white/5 text-center text-xs text-white/40 font-mono">
                  점수 입력 권한: 학생자치회 전용
                </div>
              )}
            </div>

            {/* Team B Score Card */}
            <div className={`p-6 rounded-2xl border transition-all ${
              servingTeam === 'B'
                ? 'bg-[#0A0F1D] border-[#E2FF00]/50 ring-1 ring-[#E2FF00]/30 shadow-[0_0_20px_rgba(226,255,0,0.08)]'
                : 'bg-[#0A0F1D] border-white/10'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-mono text-white/70">
                  TEAM B ({teamBGrade}학년 {tie.teamBClass}반)
                </span>
                {servingTeam === 'B' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#E2FF00]/10 text-[#E2FF00] border border-[#E2FF00]/30 flex items-center gap-1">
                    🏸 SERVICE
                  </span>
                )}
              </div>

              <div className="text-lg font-bold text-white truncate tracking-tight">
                {subMatch.teamBPlayers.map(p => p.name).join(', ') || '선수 미등록'}
              </div>

              {/* Giant Digit */}
              <div className="my-4 text-center py-6 bg-[#12192B] rounded-xl border border-white/10 shadow-inner">
                <span className="text-6xl sm:text-7xl font-extrabold text-white tracking-tighter tabular-nums font-mono">
                  {scoreB}
                </span>
              </div>

              {/* Buttons */}
              {canEditScore ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={addPointB}
                    className="py-3 rounded-xl text-base font-bold text-black bg-[#E2FF00] hover:opacity-90 shadow-[0_0_12px_rgba(226,255,0,0.25)] transition active:scale-95 font-mono"
                  >
                    +1 POINT
                  </button>
                  <button
                    onClick={subtractPointB}
                    className="py-3 rounded-xl text-sm font-bold text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 transition active:scale-95 font-mono"
                  >
                    -1 UNDO
                  </button>
                </div>
              ) : (
                <div className="py-2.5 rounded-xl bg-white/5 text-center text-xs text-white/40 font-mono">
                  점수 입력 권한: 학생자치회 전용
                </div>
              )}
            </div>

          </div>

          {/* MVP manual input section */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#E2FF00]" />
                <label className="text-xs font-bold text-white">경기 MVP 선수 (수동 직접 입력):</label>
              </div>
              <span className="text-[11px] text-[#E2FF00] font-mono font-bold">수동 입력 지원</span>
            </div>

            <input
              type="text"
              disabled={!canEditScore}
              value={mvpName}
              onChange={(e) => setMvpName(e.target.value)}
              placeholder="MVP 선수 이름 직접 입력 (예: 1학년 1반 김민준 또는 홍길동)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-[#E2FF00] font-bold text-xs sm:text-sm focus:outline-none focus:border-[#E2FF00] placeholder-white/20 disabled:opacity-60"
            />

            {/* Quick-pick player chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-white/40 font-medium mr-1">출전선수 빠른선택:</span>
              {[...subMatch.teamAPlayers, ...subMatch.teamBPlayers].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={!canEditScore}
                  onClick={() => setMvpName(`${p.grade}학년 ${p.classNum}반 ${p.name}`)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#E2FF00]/10 hover:text-[#E2FF00] border border-white/10 text-white/70 text-[11px] transition disabled:opacity-40"
                >
                  {p.grade}-{p.classNum} {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          {canEditScore && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => handleSaveAndFinalize(false)}
                className="w-1/2 py-3 rounded-xl text-xs sm:text-sm font-bold text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 transition font-mono"
              >
                점수 임시 저장
              </button>

              <button
                onClick={() => handleSaveAndFinalize(true)}
                className="w-1/2 py-3 rounded-xl text-xs sm:text-sm font-bold text-black bg-[#E2FF00] hover:opacity-90 shadow-[0_0_12px_rgba(226,255,0,0.3)] transition flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5 text-black" />
                <span>경기 종료 및 공식 결과 인증</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
