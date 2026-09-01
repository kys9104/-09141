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
import { SubMatch, TieMatch, SetScore, MatchCategory } from '../types';
import { StorageService } from '../services/storageService';
import { GASService } from '../services/gasService';

interface LiveScoreModalProps {
  isOpen: boolean;
  tieMatchId: string | null;
  subMatchId: string | null;
  onClose: () => void;
  onScoreUpdated: () => void;
}

export const LiveScoreModal: React.FC<LiveScoreModalProps> = ({
  isOpen,
  tieMatchId,
  subMatchId,
  onClose,
  onScoreUpdated
}) => {
  const [tie, setTie] = useState<TieMatch | null>(null);
  const [subMatch, setSubMatch] = useState<SubMatch | null>(null);

  // Live scoreboard states (Single Set 15 Points)
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [servingTeam, setServingTeam] = useState<'A' | 'B'>('A');

  // Live match rally stats
  const [smashesA, setSmashesA] = useState<number>(0);
  const [smashesB, setSmashesB] = useState<number>(0);
  const [dropsA, setDropsA] = useState<number>(0);
  const [dropsB, setDropsB] = useState<number>(0);
  const [acesA, setAcesA] = useState<number>(0);
  const [acesB, setAcesB] = useState<number>(0);
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
      setSmashesA(sm.stats.smashWinnersA || 0);
      setSmashesB(sm.stats.smashWinnersB || 0);
      setDropsA(sm.stats.dropPointsA || 0);
      setDropsB(sm.stats.dropPointsB || 0);
      setAcesA(sm.stats.serviceAcesA || 0);
      setAcesB(sm.stats.serviceAcesB || 0);
      setMvpName(sm.stats.mvpPlayerName || '');
    }
  }, [isOpen, tieMatchId, subMatchId]);

  if (!isOpen || !tie || !subMatch) return null;

  const teamAGrade = tie.teamAGrade || tie.grade || 1;
  const teamBGrade = tie.teamBGrade || tie.grade || 1;

  const addPointA = () => {
    const next = scoreA + 1;
    setScoreA(next);
    setServingTeam('A');
    checkMatchWin(next, scoreB, 'A');
  };

  const subtractPointA = () => {
    if (scoreA <= 0) return;
    setScoreA(scoreA - 1);
  };

  const addPointB = () => {
    const next = scoreB + 1;
    setScoreB(next);
    setServingTeam('B');
    checkMatchWin(scoreA, next, 'B');
  };

  const subtractPointB = () => {
    if (scoreB <= 0) return;
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

  const handleSaveAndFinalize = (isFinalMatch: boolean = false) => {
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
        smashWinnersA: smashesA,
        smashWinnersB: smashesB,
        dropPointsA: dropsA,
        dropPointsB: dropsB,
        serviceAcesA: acesA,
        serviceAcesB: acesB,
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

    // Auto-sync to Google Apps Script
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

          <button
            onClick={() => { setScoreA(0); setScoreB(0); }}
            className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white transition"
          >
            <RotateCcw className="w-3 h-3" /> 점수 초기화
          </button>
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

              {/* In-game stat counters */}
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                <button
                  onClick={() => setSmashesA(s => s + 1)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
                >
                  스매시 (+{smashesA})
                </button>
                <button
                  onClick={() => setDropsA(d => d + 1)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
                >
                  드롭 (+{dropsA})
                </button>
                <button
                  onClick={() => setAcesA(a => a + 1)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
                >
                  서브에이스 (+{acesA})
                </button>
              </div>
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

              {/* In-game stat counters */}
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                <button
                  onClick={() => setSmashesB(s => s + 1)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
                >
                  스매시 (+{smashesB})
                </button>
                <button
                  onClick={() => setDropsB(d => d + 1)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
                >
                  드롭 (+{dropsB})
                </button>
                <button
                  onClick={() => setAcesB(a => a + 1)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
                >
                  서브에이스 (+{acesB})
                </button>
              </div>
            </div>

          </div>

          {/* MVP selection row */}
          <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#E2FF00]" />
              <label className="text-xs font-semibold text-white/70">경기 MVP 선수 선정:</label>
            </div>
            <select
              value={mvpName}
              onChange={(e) => setMvpName(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl bg-[#12192B] border border-white/10 text-[#E2FF00] font-bold text-xs focus:outline-none focus:border-[#E2FF00]"
            >
              <option value="">자동 선정 또는 직접 선택</option>
              {[...subMatch.teamAPlayers, ...subMatch.teamBPlayers].map(p => (
                <option key={p.name} value={p.name}>
                  {p.grade}학년 {p.classNum}반 {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bottom Actions */}
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

        </div>

      </div>
    </div>
  );
};
