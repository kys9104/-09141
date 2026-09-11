import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  Award, 
  FileEdit, 
  ShieldCheck, 
  Users,
  Activity,
  AlertCircle,
  Zap,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SubMatch, TieMatch, SetScore, MatchCategory, UserProfile, isAdminRole } from '../types';
import { StorageService } from '../services/storageService';
import { GASService } from '../services/gasService';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { FirebaseService } from '../services/firebaseService';

interface MatchResultEntryModalProps {
  isOpen: boolean;
  tieMatchId: string | null;
  subMatchId: string | null;
  currentUser: UserProfile | null;
  onClose: () => void;
  onSaved: () => void;
}

export const MatchResultEntryModal: React.FC<MatchResultEntryModalProps> = ({
  isOpen,
  tieMatchId,
  subMatchId,
  currentUser,
  onClose,
  onSaved
}) => {
  const [tie, setTie] = useState<TieMatch | null>(null);
  const [subMatch, setSubMatch] = useState<SubMatch | null>(null);

  // Single-set 15-point score state
  const [scoreA, setScoreA] = useState<number>(15);
  const [scoreB, setScoreB] = useState<number>(12);

  const [winnerTeam, setWinnerTeam] = useState<'A' | 'B'>('A');
  const [mvpPlayer, setMvpPlayer] = useState<string>('');
  const [referee, setReferee] = useState<string>(currentUser?.name || '학생자치회');

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
      setScoreA(sm.sets[0].scoreA || 15);
      setScoreB(sm.sets[0].scoreB || 12);
      if (sm.sets[0].scoreA > sm.sets[0].scoreB) {
        setWinnerTeam('A');
      } else if (sm.sets[0].scoreB > sm.sets[0].scoreA) {
        setWinnerTeam('B');
      }
    }

    if (sm.winnerTeam) setWinnerTeam(sm.winnerTeam === 'DRAW' ? 'A' : sm.winnerTeam);
    if (sm.stats) {
      setMvpPlayer(sm.stats.mvpPlayerName || '');
    }
    if (sm.referee) setReferee(sm.referee);
  }, [isOpen, tieMatchId, subMatchId]);

  if (!isOpen || !tie || !subMatch) return null;

  const teamAGrade = tie.teamAGrade || tie.grade || 1;
  const teamBGrade = tie.teamBGrade || tie.grade || 1;

  const handleScoreAChange = (val: number) => {
    setScoreA(val);
    if (val > scoreB) setWinnerTeam('A');
    else if (scoreB > val) setWinnerTeam('B');
  };

  const handleScoreBChange = (val: number) => {
    setScoreB(val);
    if (val > scoreA) setWinnerTeam('B');
    else if (scoreA > val) setWinnerTeam('A');
  };

  const isTeacher = isAdminRole(currentUser?.role);

  const handleDeleteResult = () => {
    if (!isTeacher || !tieMatchId || !subMatchId) return;
    if (window.confirm('해당 경기의 결과 및 점수를 삭제하고 경기 전 상태로 초기화하시겠습니까?\n(체육교사 전용 권한)')) {
      StorageService.deleteSubMatchResult(tieMatchId, subMatchId);
      onSaved();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const matches = StorageService.getMatches();
    const tieIdx = matches.findIndex(m => m.id === tieMatchId);
    if (tieIdx === -1) return;

    const t = matches[tieIdx];
    const smIdx = t.subMatches.findIndex(s => s.id === subMatchId);
    if (smIdx === -1) return;

    // Single-set 15 points
    const sets: SetScore[] = [
      { setNumber: 1, scoreA: Number(scoreA), scoreB: Number(scoreB) }
    ];

    t.subMatches[smIdx] = {
      ...t.subMatches[smIdx],
      sets,
      winnerTeam,
      status: 'COMPLETED',
      referee,
      recordedBy: currentUser?.name || '학생자치회',
      stats: {
        smashWinnersA: 0,
        smashWinnersB: 0,
        mvpPlayerName: mvpPlayer || (winnerTeam === 'A' ? subMatch.teamAPlayers[0]?.name : subMatch.teamBPlayers[0]?.name) || '',
        durationMinutes: 15
      }
    };

    // Calculate tie overall wins
    let tAWins = 0;
    let tBWins = 0;
    t.subMatches.forEach(sub => {
      if (sub.status === 'COMPLETED') {
        if (sub.winnerTeam === 'A') tAWins++;
        else if (sub.winnerTeam === 'B') tBWins++;
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
      const allDone = t.subMatches.every(sub => sub.status === 'COMPLETED');
      if (allDone) {
        t.status = 'COMPLETED';
      } else {
        t.status = 'IN_PROGRESS';
      }
    }

    matches[tieIdx] = t;
    StorageService.saveMatches(matches);

    // Auto-sync with Firebase, Google Sheets REST API & GAS
    FirebaseService.saveMatch(t, currentUser?.name || '학생자치회/교사').catch(console.error);

    GoogleSheetsService.appendMatchResult(t, currentUser?.name || '학생자치회/교사').catch(err => {
      console.warn('Google Sheets sync notice:', err.message);
    });
    GASService.sendToGAS('MATCH_RESULT', t).catch(console.error);

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#12192B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0A0F1D] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E2FF00]/10 border border-[#E2FF00]/30 flex items-center justify-center text-[#E2FF00]">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                학생자치회 / 교사 경기 결과 입력
              </h2>
              <p className="text-xs text-[#E2FF00] font-mono">
                {teamAGrade}학년 {tie.teamAClass}반 vs {teamBGrade}학년 {tie.teamBClass}반 • {subMatch.category} (단판 15점)
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Rule Badge */}
          <div className="p-3 rounded-xl bg-[#0A0F1D] border border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold text-[#E2FF00] flex items-center gap-1.5 font-mono">
              <Zap className="w-3.5 h-3.5" /> 단판 15점 경기 규정 적용
            </span>
            <span className="text-[11px] text-white/50 font-mono">1 SET (15 PTS)</span>
          </div>

          {/* Winner Selector */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2 font-mono uppercase tracking-wider">
              승리 학급 선택 (SELECT WINNER)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setWinnerTeam('A')}
                className={`p-3.5 rounded-xl border text-left font-bold transition ${
                  winnerTeam === 'A'
                    ? 'bg-[#E2FF00] border-[#E2FF00] text-black shadow-[0_0_12px_rgba(226,255,0,0.3)]'
                    : 'bg-[#0A0F1D] border-white/10 text-white/70 hover:border-white/20'
                }`}
              >
                <div className={`text-[10px] font-mono font-bold ${winnerTeam === 'A' ? 'text-black/70' : 'text-[#E2FF00]'}`}>A팀 승리</div>
                <div className="text-sm font-bold mt-0.5">
                  {teamAGrade}학년 {tie.teamAClass}반
                </div>
                <div className={`text-[11px] mt-1 truncate ${winnerTeam === 'A' ? 'text-black/60' : 'text-white/40'}`}>
                  {subMatch.teamAPlayers.map(p => p.name).join(', ') || '선수 미등록'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setWinnerTeam('B')}
                className={`p-3.5 rounded-xl border text-left font-bold transition ${
                  winnerTeam === 'B'
                    ? 'bg-[#E2FF00] border-[#E2FF00] text-black shadow-[0_0_12px_rgba(226,255,0,0.3)]'
                    : 'bg-[#0A0F1D] border-white/10 text-white/70 hover:border-white/20'
                }`}
              >
                <div className={`text-[10px] font-mono font-bold ${winnerTeam === 'B' ? 'text-black/70' : 'text-[#E2FF00]'}`}>B팀 승리</div>
                <div className="text-sm font-bold mt-0.5">
                  {teamBGrade}학년 {tie.teamBClass}반
                </div>
                <div className={`text-[11px] mt-1 truncate ${winnerTeam === 'B' ? 'text-black/60' : 'text-white/40'}`}>
                  {subMatch.teamBPlayers.map(p => p.name).join(', ') || '선수 미등록'}
                </div>
              </button>
            </div>
          </div>

          {/* 15-Point Single Set Score Input */}
          <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-3">
            <div className="text-xs font-bold text-white flex items-center justify-between font-mono">
              <span>단판 세트 최종 스코어 (FINAL 15-PT SCORE)</span>
              <span className="text-[11px] text-[#E2FF00] font-bold">15점 선승제</span>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <div className="flex-1 text-center">
                <div className="text-xs font-semibold text-white/60 mb-1">{teamAGrade}학년 {tie.teamAClass}반</div>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={scoreA}
                  onChange={(e) => handleScoreAChange(Number(e.target.value))}
                  className="w-full py-3 rounded-xl bg-[#12192B] border border-white/10 text-center font-black text-white text-2xl focus:outline-none focus:border-[#E2FF00] font-mono"
                />
              </div>

              <span className="text-white/30 font-black text-2xl pt-5">:</span>

              <div className="flex-1 text-center">
                <div className="text-xs font-semibold text-white/60 mb-1">{teamBGrade}학년 {tie.teamBClass}반</div>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={scoreB}
                  onChange={(e) => handleScoreBChange(Number(e.target.value))}
                  className="w-full py-3 rounded-xl bg-[#12192B] border border-white/10 text-center font-black text-white text-2xl focus:outline-none focus:border-[#E2FF00] font-mono"
                />
              </div>
            </div>
          </div>

          {/* MVP & Referee */}
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#E2FF00]" />
                  <span>경기 MVP 선수 (직접 수동 입력)</span>
                </label>
                <span className="text-[10px] text-[#E2FF00] font-mono">수동 입력 지원</span>
              </div>
              <input
                type="text"
                value={mvpPlayer}
                onChange={(e) => setMvpPlayer(e.target.value)}
                placeholder="예: 1학년 1반 김민준 또는 홍길동"
                className="w-full px-3 py-2 rounded-xl bg-[#12192B] border border-white/10 text-[#E2FF00] font-bold text-xs sm:text-sm focus:outline-none focus:border-[#E2FF00] placeholder-white/20"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-white/40">출전선수 선택:</span>
                {[...subMatch.teamAPlayers, ...subMatch.teamBPlayers].map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMvpPlayer(`${p.grade}학년 ${p.classNum}반 ${p.name}`)}
                    className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-[#E2FF00]/10 hover:text-[#E2FF00] border border-white/10 text-white/70 text-[11px] transition"
                  >
                    {p.grade}-{p.classNum} {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                기록원 / 주심 이름
              </label>
              <input
                type="text"
                value={referee}
                onChange={(e) => setReferee(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0A0F1D] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-[#E2FF00]"
              />
            </div>
          </div>

          {/* Teacher Delete Option & Action Buttons */}
          {isTeacher && subMatch.status === 'COMPLETED' && (
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <div className="text-[11px] text-rose-400/80 font-mono">
                * 체육교사 권한: 입력된 경기 결과를 삭제하고 초기화할 수 있습니다.
              </div>
              <button
                type="button"
                onClick={handleDeleteResult}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition flex items-center gap-1 font-mono"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>결과 삭제 및 초기화</span>
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 rounded-xl text-xs font-bold text-white/70 bg-white/5 hover:bg-white/10 transition"
            >
              취소
            </button>
            <button
              type="submit"
              className="w-2/3 py-3 rounded-xl text-xs sm:text-sm font-bold text-black bg-[#E2FF00] hover:opacity-90 shadow-[0_0_12px_rgba(226,255,0,0.3)] transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-black" />
              <span>경기 결과 확정 및 시트 전송</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
