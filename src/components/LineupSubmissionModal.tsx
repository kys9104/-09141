import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck,
  Users,
  Award
} from 'lucide-react';
import { 
  GradeLevel, 
  TieMatch, 
  MatchCategory, 
  Player, 
  UserProfile,
  isCaptainRole,
  isCouncilRole,
  isAdminRole
} from '../types';
import { CATEGORIES, LEAGUE_ROUNDS } from '../data/initialData';
import { StorageService } from '../services/storageService';
import { FirebaseService } from '../services/firebaseService';
import { GASService } from '../services/gasService';

interface LineupSubmissionModalProps {
  isOpen: boolean;
  tieMatchId: string | null;
  roundId: number;
  currentUser: UserProfile | null;
  onClose: () => void;
  onSaved: () => void;
}

export const LineupSubmissionModal: React.FC<LineupSubmissionModalProps> = ({
  isOpen,
  tieMatchId,
  roundId,
  currentUser,
  onClose,
  onSaved
}) => {
  const matches = StorageService.getMatches();
  const tie = matches.find(m => m.id === tieMatchId);

  const defaultSide: 'A' | 'B' = 'A';
  const [selectedSide, setSelectedSide] = useState<'A' | 'B'>(defaultSide);

  const currentGrade: GradeLevel = selectedSide === 'A' 
    ? (tie?.teamAGrade || tie?.grade || 1) 
    : (tie?.teamBGrade || tie?.grade || 1);
  const currentClass: number = selectedSide === 'A' 
    ? (tie?.teamAClass || 1) 
    : (tie?.teamBClass || 2);

  // Lineup state for the 5 categories
  const [msPlayer, setMsPlayer] = useState<string>('');
  const [wsPlayer, setWsPlayer] = useState<string>('');
  const [mdPlayer1, setMdPlayer1] = useState<string>('');
  const [mdPlayer2, setMdPlayer2] = useState<string>('');
  const [wdPlayer1, setWdPlayer1] = useState<string>('');
  const [wdPlayer2, setWdPlayer2] = useState<string>('');
  const [xdPlayerM, setXdPlayerM] = useState<string>('');
  const [xdPlayerF, setXdPlayerF] = useState<string>('');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const roundInfo = LEAGUE_ROUNDS.find(r => r.id === roundId) || LEAGUE_ROUNDS[0];
  const allStudents = StorageService.getStudents(currentGrade, currentClass);

  // Helper to format student label
  const getStudentLabel = (s: Player) => {
    if (s.name === `${s.studentNum}번 학생` || s.name === `${s.studentNum}번`) {
      return `${s.studentNum}번 학생`;
    }
    return `${s.studentNum}번 ${s.name}`;
  };

  // Pre-load existing lineup if available
  useEffect(() => {
    if (!isOpen || !tie) return;

    // Determine initial side based on current user's grade and class if matches
    if (currentUser) {
      const isUserTeamB = (tie.teamBGrade || tie.grade) === currentUser.grade && tie.teamBClass === currentUser.classNum;
      if (isUserTeamB) {
        setSelectedSide('B');
      }
    }
  }, [isOpen, tieMatchId]);

  useEffect(() => {
    if (!isOpen || !tie) return;

    // Load players for the selected side
    tie.subMatches.forEach(sm => {
      const players = selectedSide === 'A' ? sm.teamAPlayers : sm.teamBPlayers;
      if (sm.category === 'MEN_SINGLES') setMsPlayer(players[0]?.name || '');
      if (sm.category === 'WOMEN_SINGLES') setWsPlayer(players[0]?.name || '');
      if (sm.category === 'MEN_DOUBLES') {
        setMdPlayer1(players[0]?.name || '');
        setMdPlayer2(players[1]?.name || '');
      }
      if (sm.category === 'WOMEN_DOUBLES') {
        setWdPlayer1(players[0]?.name || '');
        setWdPlayer2(players[1]?.name || '');
      }
      if (sm.category === 'MIXED_DOUBLES') {
        setXdPlayerM(players[0]?.name || '');
        setXdPlayerF(players[1]?.name || '');
      }
    });
  }, [selectedSide, tieMatchId, isOpen]);

  if (!isOpen || !tie) return null;

  const teamAGrade = tie.teamAGrade || tie.grade || 1;
  const teamBGrade = tie.teamBGrade || tie.grade || 1;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Permission check: Captain, Council, Teacher
    const canEdit = isCaptainRole(currentUser?.role) || isCouncilRole(currentUser?.role) || isAdminRole(currentUser?.role);
    if (!canEdit) {
      setMessage({
        type: 'error',
        text: '출전명단 작성 및 수정 권한이 없습니다. (반장/체육부장, 학생자치회 또는 체육교사만 가능)'
      });
      return;
    }

    const freshMatches = StorageService.getMatches();
    const tieIndex = freshMatches.findIndex(m => m.id === tieMatchId);
    if (tieIndex === -1) {
      setMessage({ type: 'error', text: '해당 매치를 찾을 수 없습니다.' });
      return;
    }

    const currentTie = freshMatches[tieIndex];
    const isTeamA = selectedSide === 'A';

    // Helper to find player object
    const findP = (name: string, defaultGender: 'M' | 'F'): Player => {
      const found = allStudents.find(s => s.name === name);
      if (found) return found;
      const numMatch = name.match(/(\d+)번/);
      const num = numMatch ? parseInt(numMatch[1], 10) : 1;
      return {
        grade: currentGrade,
        classNum: currentClass,
        studentNum: num,
        name: name || `${num}번 학생`,
        gender: defaultGender
      };
    };

    // Update SubMatches
    currentTie.subMatches.forEach(sm => {
      if (sm.category === 'MEN_SINGLES' && msPlayer) {
        const pList = [findP(msPlayer, 'M')];
        if (isTeamA) sm.teamAPlayers = pList; else sm.teamBPlayers = pList;
      }
      if (sm.category === 'WOMEN_SINGLES' && wsPlayer) {
        const pList = [findP(wsPlayer, 'F')];
        if (isTeamA) sm.teamAPlayers = pList; else sm.teamBPlayers = pList;
      }
      if (sm.category === 'MEN_DOUBLES' && mdPlayer1 && mdPlayer2) {
        const pList = [findP(mdPlayer1, 'M'), findP(mdPlayer2, 'M')];
        if (isTeamA) sm.teamAPlayers = pList; else sm.teamBPlayers = pList;
      }
      if (sm.category === 'WOMEN_DOUBLES' && wdPlayer1 && wdPlayer2) {
        const pList = [findP(wdPlayer1, 'F'), findP(wdPlayer2, 'F')];
        if (isTeamA) sm.teamAPlayers = pList; else sm.teamBPlayers = pList;
      }
      if (sm.category === 'MIXED_DOUBLES' && xdPlayerM && xdPlayerF) {
        const pList = [findP(xdPlayerM, 'M'), findP(xdPlayerF, 'F')];
        if (isTeamA) sm.teamAPlayers = pList; else sm.teamBPlayers = pList;
      }
    });

    currentTie.status = 'READY_TO_PLAY';
    freshMatches[tieIndex] = currentTie;
    StorageService.saveMatches(freshMatches);

    const submitterInfo = currentUser
      ? `${currentUser.name} (${currentUser.grade ? `${currentUser.grade}학년 ${currentUser.classNum}반 ` : ''}${currentUser.role === 'council' ? '학생자치회' : currentUser.role === 'captain' ? '체육부장/반장' : currentUser.role})`
      : '체육부장/학생자치회';

    // 1. Sync match to Firebase Firestore
    await FirebaseService.saveMatch(currentTie, submitterInfo);

    // 2. Save individual rosters for each category to Firebase & local storage
    const categoriesToSave: Array<{ category: MatchCategory; players: Player[] }> = [
      ...(msPlayer ? [{ category: 'MEN_SINGLES' as MatchCategory, players: [findP(msPlayer, 'M')] }] : []),
      ...(wsPlayer ? [{ category: 'WOMEN_SINGLES' as MatchCategory, players: [findP(wsPlayer, 'F')] }] : []),
      ...(mdPlayer1 && mdPlayer2 ? [{ category: 'MEN_DOUBLES' as MatchCategory, players: [findP(mdPlayer1, 'M'), findP(mdPlayer2, 'M')] }] : []),
      ...(wdPlayer1 && wdPlayer2 ? [{ category: 'WOMEN_DOUBLES' as MatchCategory, players: [findP(wdPlayer1, 'F'), findP(wdPlayer2, 'F')] }] : []),
      ...(xdPlayerM && xdPlayerF ? [{ category: 'MIXED_DOUBLES' as MatchCategory, players: [findP(xdPlayerM, 'M'), findP(xdPlayerF, 'F')] }] : [])
    ];

    await Promise.all(categoriesToSave.map(item => {
      const rosterId = `roster_r${roundId}_${currentGrade}-${currentClass}_${item.category}`;
      StorageService.saveRoster({
        id: rosterId,
        roundId,
        grade: currentGrade,
        classNum: currentClass,
        category: item.category,
        players: item.players,
        submittedBy: submitterInfo,
        submittedAt: new Date().toISOString(),
        isLocked: false
      });

      return FirebaseService.saveRoster({
        id: rosterId,
        roundId,
        grade: currentGrade,
        classNum: currentClass,
        category: item.category,
        players: item.players,
        submittedBy: submitterInfo
      });
    }));

    // Send async webhook to Google Apps Script
    GASService.sendToGAS('MATCH_RESULT', currentTie).catch(console.error);

    setMessage({ type: 'success', text: `${currentGrade}학년 ${currentClass}반 출전 명단이 Firestore 및 로컬에 정상 저장 및 등록되었습니다!` });
    setTimeout(() => {
      onSaved();
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#12192B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0A0F1D] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E2FF00]/10 border border-[#E2FF00]/30 flex items-center justify-center text-[#E2FF00]">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                제{roundId}라운드 출전 선수 명단 작성
              </h2>
              <div className="flex items-center gap-2 text-xs text-white/50 mt-0.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-[#E2FF00]" />
                <span>제출 마감: <strong className="text-[#E2FF00]">{roundInfo.deadlineDate} (경기 1일전)</strong></span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Side (Team A / Team B) Selector Toggle */}
          <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs font-semibold text-white/70">
              출전 대상 학급 선택:
            </div>

            <div className="flex items-center bg-[#12192B] p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setSelectedSide('A')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                  selectedSide === 'A'
                    ? 'bg-[#E2FF00] text-black shadow-[0_0_10px_rgba(226,255,0,0.3)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {teamAGrade}학년 {tie.teamAClass}반 ({teamAGrade}-{tie.teamAClass})
              </button>
              <button
                type="button"
                onClick={() => setSelectedSide('B')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                  selectedSide === 'B'
                    ? 'bg-[#E2FF00] text-black shadow-[0_0_10px_rgba(226,255,0,0.3)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {teamBGrade}학년 {tie.teamBClass}반 ({teamBGrade}-{tie.teamBClass})
              </button>
            </div>
          </div>

          <div className="px-1 text-xs text-white/50">
            현재 <strong className="text-[#E2FF00]">{currentGrade}학년 {currentClass}반</strong> 학생 명단(1~21번)에서 종목별 선수를 지정합니다. (단판 15점 경기)
          </div>

          {/* 5 Categories Inputs */}
          <div className="space-y-4">
            
            {/* 1. Men's Singles (1 Player) */}
            <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E2FF00] flex items-center gap-1.5">
                  🏸 1. 남자 단식 (1명)
                </span>
                <span className="text-[11px] text-white/40 font-mono">단판 15점</span>
              </div>
              <select
                value={msPlayer}
                onChange={(e) => setMsPlayer(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-[#E2FF00]"
              >
                <option value="">-- 출전 선수 선택 (1~21번) --</option>
                {allStudents.map(s => (
                  <option key={s.studentNum} value={s.name}>
                    {getStudentLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Women's Singles (1 Player) */}
            <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E2FF00] flex items-center gap-1.5">
                  🏸 2. 여자 단식 (1명)
                </span>
                <span className="text-[11px] text-white/40 font-mono">단판 15점</span>
              </div>
              <select
                value={wsPlayer}
                onChange={(e) => setWsPlayer(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-[#E2FF00]"
              >
                <option value="">-- 출전 선수 선택 (1~21번) --</option>
                {allStudents.map(s => (
                  <option key={s.studentNum} value={s.name}>
                    {getStudentLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Men's Doubles (2 Players) */}
            <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E2FF00] flex items-center gap-1.5">
                  🏸 3. 남자 복식 (2명 1조)
                </span>
                <span className="text-[11px] text-white/40 font-mono">단판 15점</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={mdPlayer1}
                  onChange={(e) => setMdPlayer1(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-[#E2FF00]"
                >
                  <option value="">선수 1 선택 (1~21번)</option>
                  {allStudents.map(s => (
                    <option key={s.studentNum} value={s.name}>
                      {getStudentLabel(s)}
                    </option>
                  ))}
                </select>
                <select
                  value={mdPlayer2}
                  onChange={(e) => setMdPlayer2(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-[#E2FF00]"
                >
                  <option value="">선수 2 선택 (1~21번)</option>
                  {allStudents.map(s => (
                    <option key={s.studentNum} value={s.name}>
                      {getStudentLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Women's Doubles (2 Players) */}
            <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E2FF00] flex items-center gap-1.5">
                  🏸 4. 여자 복식 (2명 1조)
                </span>
                <span className="text-[11px] text-white/40 font-mono">단판 15점</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={wdPlayer1}
                  onChange={(e) => setWdPlayer1(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-[#E2FF00]"
                >
                  <option value="">선수 1 선택 (1~21번)</option>
                  {allStudents.map(s => (
                    <option key={s.studentNum} value={s.name}>
                      {getStudentLabel(s)}
                    </option>
                  ))}
                </select>
                <select
                  value={wdPlayer2}
                  onChange={(e) => setWdPlayer2(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-[#E2FF00]"
                >
                  <option value="">선수 2 선택 (1~21번)</option>
                  {allStudents.map(s => (
                    <option key={s.studentNum} value={s.name}>
                      {getStudentLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5. Mixed Doubles (2 Players) */}
            <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E2FF00] flex items-center gap-1.5">
                  🏸 5. 혼합 복식 (2명 1조)
                </span>
                <span className="text-[11px] text-white/40 font-mono">단판 15점</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={xdPlayerM}
                  onChange={(e) => setXdPlayerM(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-[#E2FF00]"
                >
                  <option value="">선수 1 선택 (1~21번)</option>
                  {allStudents.map(s => (
                    <option key={s.studentNum} value={s.name}>
                      {getStudentLabel(s)}
                    </option>
                  ))}
                </select>
                <select
                  value={xdPlayerF}
                  onChange={(e) => setXdPlayerF(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-[#E2FF00]"
                >
                  <option value="">선수 2 선택 (1~21번)</option>
                  {allStudents.map(s => (
                    <option key={s.studentNum} value={s.name}>
                      {getStudentLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Alert Message */}
          {message && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 font-mono ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 rounded-xl text-xs font-bold text-white/70 bg-white/5 hover:bg-white/10 transition"
            >
              닫기
            </button>
            <button
              type="submit"
              className="w-2/3 py-3 rounded-xl text-xs sm:text-sm font-bold text-black bg-[#E2FF00] hover:opacity-90 shadow-[0_0_12px_rgba(226,255,0,0.3)] transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-black" />
              <span>{currentGrade}학년 {currentClass}반 명단 등록 완료</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
