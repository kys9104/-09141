import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Send, 
  Calendar,
  Layers,
  Users,
  ShieldCheck,
  RefreshCw,
  Database
} from 'lucide-react';
import { 
  GradeLevel, 
  TieMatch, 
  Player, 
  UserProfile, 
  MatchCategory,
  isAdminRole,
  isCaptainRole
} from '../types';
import { CATEGORIES, LEAGUE_ROUNDS } from '../data/initialData';
import { StorageService } from '../services/storageService';
import { FirebaseService } from '../services/firebaseService';
import { GASService } from '../services/gasService';

interface RosterSubmissionViewProps {
  currentUser: UserProfile | null;
  onRosterUpdated?: () => void;
}

export const RosterSubmissionView: React.FC<RosterSubmissionViewProps> = ({
  currentUser,
  onRosterUpdated
}) => {
  // If user is a captain of a specific class, default to their grade and class
  const initialGrade: GradeLevel = currentUser && currentUser.grade ? currentUser.grade : 1;
  const initialClass: number = currentUser && currentUser.classNum ? currentUser.classNum : 1;

  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(initialGrade);
  const [selectedClass, setSelectedClass] = useState<number>(initialClass);
  const [selectedRound, setSelectedRound] = useState<number>(1);

  // Lineup state for each of the 5 categories
  const [msPlayer, setMsPlayer] = useState<string>('');
  const [wsPlayer, setWsPlayer] = useState<string>('');
  const [mdPlayer1, setMdPlayer1] = useState<string>('');
  const [mdPlayer2, setMdPlayer2] = useState<string>('');
  const [wdPlayer1, setWdPlayer1] = useState<string>('');
  const [wdPlayer2, setWdPlayer2] = useState<string>('');
  const [xdPlayerM, setXdPlayerM] = useState<string>('');
  const [xdPlayerF, setXdPlayerF] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittedRostersList, setSubmittedRostersList] = useState<any[]>([]);

  // Students available for this grade and class (excluding excluded students from official roster)
  const classStudents = StorageService.getStudents(selectedGrade, selectedClass);
  const roundInfo = LEAGUE_ROUNDS.find(r => r.id === selectedRound) || LEAGUE_ROUNDS[0];

  // Load existing match / roster data when round or class changes
  useEffect(() => {
    loadExistingRoster();
  }, [selectedGrade, selectedClass, selectedRound]);

  const loadExistingRoster = async () => {
    // 1. Try to find match in StorageService
    const matches = StorageService.getMatches();
    const tie = matches.find(m => 
      m.roundId === selectedRound && 
      ((m.teamAGrade === selectedGrade && m.teamAClass === selectedClass) || 
       (m.teamBGrade === selectedGrade && m.teamBClass === selectedClass))
    );

    if (tie) {
      const isTeamA = (tie.teamAGrade || tie.grade) === selectedGrade && tie.teamAClass === selectedClass;
      
      tie.subMatches.forEach(sm => {
        const players = isTeamA ? sm.teamAPlayers : sm.teamBPlayers;
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
    }

    // 2. Load submitted rosters from Firebase
    try {
      const firestoreRosters = await FirebaseService.getRosters();
      setSubmittedRostersList(firestoreRosters);
    } catch (e) {
      console.warn('Could not load rosters from Firebase:', e);
    }
  };

  const getStudentLabel = (s: Player) => {
    if (s.name === `${s.studentNum}번 학생` || s.name === `${s.studentNum}번`) {
      return `${s.studentNum}번 (${s.gender === 'M' ? '남' : '여'})`;
    }
    return `${s.studentNum}번 ${s.name} (${s.gender === 'M' ? '남' : '여'})`;
  };

  const findStudentObj = (name: string, defaultGender: 'M' | 'F'): Player => {
    const found = classStudents.find(s => s.name === name);
    if (found) return found;
    const numMatch = name.match(/(\d+)번/);
    const num = numMatch ? parseInt(numMatch[1], 10) : 1;
    return {
      grade: selectedGrade,
      classNum: selectedClass,
      studentNum: num,
      name: name || `${num}번 학생`,
      gender: defaultGender
    };
  };

  const handleSubmitRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    // Permission check
    const canSubmit = isCaptainRole(currentUser?.role) || isAdminRole(currentUser?.role);
    if (!canSubmit) {
      setStatusMessage({
        type: 'error',
        text: '출전명단 제출 권한이 없습니다. 해당 반의 반장/체육부장(captain) 또는 체육교사(Admin)만 가능합니다.'
      });
      return;
    }

    // Validation
    if (!msPlayer || !wsPlayer) {
      setStatusMessage({ type: 'error', text: '남자 단식 및 여자 단식 선수를 모두 지정해야 합니다.' });
      return;
    }
    if ((mdPlayer1 && !mdPlayer2) || (!mdPlayer1 && mdPlayer2)) {
      setStatusMessage({ type: 'error', text: '남자 복식은 2명의 선수를 모두 선택해야 합니다.' });
      return;
    }
    if ((wdPlayer1 && !wdPlayer2) || (!wdPlayer1 && wdPlayer2)) {
      setStatusMessage({ type: 'error', text: '여자 복식은 2명의 선수를 모두 선택해야 합니다.' });
      return;
    }
    if ((xdPlayerM && !xdPlayerF) || (!xdPlayerM && xdPlayerF)) {
      setStatusMessage({ type: 'error', text: '혼합 복식은 남학생 1명과 여학생 1명을 모두 지정해야 합니다.' });
      return;
    }

    // Check duplicate assignment in same team
    const assignedPlayers = [
      msPlayer, wsPlayer, 
      mdPlayer1, mdPlayer2, 
      wdPlayer1, wdPlayer2, 
      xdPlayerM, xdPlayerF
    ].filter(Boolean);

    // Warning if player assigned to more than 2 categories
    const counts: Record<string, number> = {};
    assignedPlayers.forEach(p => {
      counts[p] = (counts[p] || 0) + 1;
    });
    const overAssigned = Object.keys(counts).filter(k => counts[k] > 2);
    if (overAssigned.length > 0) {
      setStatusMessage({
        type: 'error',
        text: `규정 위반: 1인당 최대 2종목까지 출전 가능합니다. (${overAssigned.join(', ')} 선수가 3종목 이상 배정됨)`
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const submitterInfo = currentUser 
        ? `${currentUser.name} (${currentUser.grade}학년 ${currentUser.classNum}반 ${currentUser.role})`
        : '체육부장/반장';

      // 1. Save to Firebase 'rosters' collection for each active category
      const categoriesToSave: Array<{ category: MatchCategory; players: Player[] }> = [
        { category: 'MEN_SINGLES', players: [findStudentObj(msPlayer, 'M')] },
        { category: 'WOMEN_SINGLES', players: [findStudentObj(wsPlayer, 'F')] },
        ...(mdPlayer1 && mdPlayer2 ? [{ category: 'MEN_DOUBLES' as MatchCategory, players: [findStudentObj(mdPlayer1, 'M'), findStudentObj(mdPlayer2, 'M')] }] : []),
        ...(wdPlayer1 && wdPlayer2 ? [{ category: 'WOMEN_DOUBLES' as MatchCategory, players: [findStudentObj(wdPlayer1, 'F'), findStudentObj(wdPlayer2, 'F')] }] : []),
        ...(xdPlayerM && xdPlayerF ? [{ category: 'MIXED_DOUBLES' as MatchCategory, players: [findStudentObj(xdPlayerM, 'M'), findStudentObj(xdPlayerF, 'F')] }] : [])
      ];

      for (const item of categoriesToSave) {
        await FirebaseService.saveRoster({
          roundId: selectedRound,
          grade: selectedGrade,
          classNum: selectedClass,
          category: item.category,
          players: item.players,
          submittedBy: submitterInfo
        });
      }

      // 2. Update local match tie object & sync to Firestore matches
      const matches = StorageService.getMatches();
      const tieIndex = matches.findIndex(m => 
        m.roundId === selectedRound && 
        ((m.teamAGrade === selectedGrade && m.teamAClass === selectedClass) || 
         (m.teamBGrade === selectedGrade && m.teamBClass === selectedClass))
      );

      if (tieIndex !== -1) {
        const tie = { ...matches[tieIndex] };
        const isTeamA = (tie.teamAGrade || tie.grade) === selectedGrade && tie.teamAClass === selectedClass;

        tie.subMatches.forEach(sm => {
          if (sm.category === 'MEN_SINGLES') {
            const p = [findStudentObj(msPlayer, 'M')];
            if (isTeamA) sm.teamAPlayers = p; else sm.teamBPlayers = p;
          }
          if (sm.category === 'WOMEN_SINGLES') {
            const p = [findStudentObj(wsPlayer, 'F')];
            if (isTeamA) sm.teamAPlayers = p; else sm.teamBPlayers = p;
          }
          if (sm.category === 'MEN_DOUBLES' && mdPlayer1 && mdPlayer2) {
            const p = [findStudentObj(mdPlayer1, 'M'), findStudentObj(mdPlayer2, 'M')];
            if (isTeamA) sm.teamAPlayers = p; else sm.teamBPlayers = p;
          }
          if (sm.category === 'WOMEN_DOUBLES' && wdPlayer1 && wdPlayer2) {
            const p = [findStudentObj(wdPlayer1, 'F'), findStudentObj(wdPlayer2, 'F')];
            if (isTeamA) sm.teamAPlayers = p; else sm.teamBPlayers = p;
          }
          if (sm.category === 'MIXED_DOUBLES' && xdPlayerM && xdPlayerF) {
            const p = [findStudentObj(xdPlayerM, 'M'), findStudentObj(xdPlayerF, 'F')];
            if (isTeamA) sm.teamAPlayers = p; else sm.teamBPlayers = p;
          }
        });

        tie.status = 'READY_TO_PLAY';
        matches[tieIndex] = tie;
        StorageService.saveMatches(matches);

        // Save match to Firestore
        await FirebaseService.saveMatch(tie, submitterInfo);

        // Async sync with GAS Webhook
        GASService.sendToGAS('MATCH_RESULT', tie).catch(console.error);
      }

      setStatusMessage({
        type: 'success',
        text: `제${selectedRound}라운드 ${selectedGrade}학년 ${selectedClass}반 출전명단이 Firebase rosters 컬렉션에 성공적으로 저장되었습니다!`
      });

      // Reload submitted list
      const freshRosters = await FirebaseService.getRosters();
      setSubmittedRostersList(freshRosters);

      if (onRosterUpdated) {
        onRosterUpdated();
      }
    } catch (err: any) {
      console.error('Error submitting roster:', err);
      setStatusMessage({
        type: 'error',
        text: `출전명단 저장 중 오류가 발생했습니다: ${err.message || 'Firebase 통신 오류'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCaptain = isCaptainRole(currentUser?.role);
  const isAdmin = isAdminRole(currentUser?.role);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#12192B] border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#E2FF00]/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E2FF00]/10 border border-[#E2FF00]/30 flex items-center justify-center text-[#E2FF00] shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-[#E2FF00]/20 text-[#E2FF00] border border-[#E2FF00]/30">
                  CAPTAIN ONLY
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  FIREBASE ROSTERS
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                반장 / 체육부장 전용 출전명단 작성
              </h2>
              <p className="text-xs text-white/50 mt-1 max-w-2xl leading-relaxed">
                각 반의 반장 및 체육부장이 라운드별 대진에 출전할 5개 종목 선수를 배정하여 Firebase DB(rosters)에 직접 제출합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto bg-[#0A0F1D] p-3 rounded-xl border border-white/10 text-xs">
            <div className="flex flex-col text-right">
              <span className="text-white/40 font-mono text-[10px]">로그인 권한</span>
              <span className="font-bold text-white">
                {isAdmin ? '체육교사 (Admin)' : isCaptain ? '반장/체육부장 (Captain)' : '일반 학생 (조회만 가능)'}
              </span>
            </div>
            <div className={`w-3 h-3 rounded-full ${isCaptain || isAdmin ? 'bg-[#E2FF00]' : 'bg-white/30'} shadow-[0_0_8px_currentColor]`}></div>
          </div>
        </div>
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center gap-3 font-medium ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Submission Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Scope & Rules */}
        <div className="space-y-6 lg:col-span-1">
          {/* Target Selection Card */}
          <div className="p-6 rounded-2xl bg-[#12192B] border border-white/10 space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Layers className="w-4 h-4 text-[#E2FF00]" />
              출전 대상 학급 및 라운드
            </h3>

            {/* Grade Selection */}
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-2 font-mono">
                GRADE (학년)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGrade(g as GradeLevel)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      selectedGrade === g
                        ? 'bg-[#E2FF00] border-[#E2FF00] text-black shadow-[0_0_10px_rgba(226,255,0,0.3)]'
                        : 'bg-[#0A0F1D] border-white/10 text-white/70 hover:border-white/20'
                    }`}
                  >
                    {g}학년
                  </button>
                ))}
              </div>
            </div>

            {/* Class Selection */}
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-2 font-mono">
                CLASS (학급)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedClass(c)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      selectedClass === c
                        ? 'bg-[#E2FF00] border-[#E2FF00] text-black shadow-[0_0_10px_rgba(226,255,0,0.3)]'
                        : 'bg-[#0A0F1D] border-white/10 text-white/70 hover:border-white/20'
                    }`}
                  >
                    {c}반
                  </button>
                ))}
              </div>
            </div>

            {/* Round Selection */}
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-2 font-mono">
                LEAGUE ROUND (라운드)
              </label>
              <select
                value={selectedRound}
                onChange={(e) => setSelectedRound(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0A0F1D] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#E2FF00]"
              >
                {LEAGUE_ROUNDS.map(r => (
                  <option key={r.id} value={r.id}>
                    제{r.id}라운드 ({r.date})
                  </option>
                ))}
              </select>
            </div>

            {/* Deadline Notice */}
            <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-white/10 flex items-center gap-2 text-xs text-white/60 font-mono">
              <Clock className="w-4 h-4 text-[#E2FF00] shrink-0" />
              <div>
                <div className="text-[10px] text-white/40">제출 마감일시</div>
                <div className="text-white font-bold">{roundInfo.deadlineDate}</div>
              </div>
            </div>
          </div>

          {/* Rules Card */}
          <div className="p-6 rounded-2xl bg-[#12192B] border border-white/10 space-y-3">
            <h4 className="text-xs font-bold text-white/80 font-mono uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#E2FF00]" />
              출전 규정 가이드
            </h4>
            <ul className="text-xs text-white/60 space-y-2 list-disc list-inside leading-relaxed">
              <li>1인당 최대 <strong className="text-white">2개 종목</strong>까지 중복 출전이 허용됩니다.</li>
              <li>모든 종목은 <strong className="text-white">단판 15점 랠리포인트제</strong>로 진행됩니다.</li>
              <li>제출 완료 시 Firebase DB의 <code className="text-[#E2FF00] font-mono">rosters</code> 컬렉션에 영구 기록됩니다.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: 5 Match Categories Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmitRoster} className="p-6 rounded-2xl bg-[#12192B] border border-white/10 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="text-[#E2FF00]">{selectedGrade}학년 {selectedClass}반</span> 출전 선수 배치
                </h3>
                <p className="text-xs text-white/40 mt-0.5">
                  각 종목에 출전할 선수를 우리 반 명단(총 {classStudents.length}명)에서 지정하십시오.
                </p>
              </div>
              <button
                type="button"
                onClick={loadExistingRoster}
                title="새로고침"
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Men's Singles */}
            <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E2FF00] flex items-center gap-2">
                  🏸 1. 남자 단식 (1명)
                </span>
                <span className="text-[11px] text-white/40 font-mono">단판 15점</span>
              </div>
              <select
                value={msPlayer}
                onChange={(e) => setMsPlayer(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white text-xs focus:outline-none focus:border-[#E2FF00]"
              >
                <option value="">선수 선택 (남학생)</option>
                {classStudents.filter(s => s.gender === 'M').map(s => (
                  <option key={s.studentNum} value={s.name}>
                    {getStudentLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Women's Singles */}
            <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E2FF00] flex items-center gap-2">
                  🏸 2. 여자 단식 (1명)
                </span>
                <span className="text-[11px] text-white/40 font-mono">단판 15점</span>
              </div>
              <select
                value={wsPlayer}
                onChange={(e) => setWsPlayer(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white text-xs focus:outline-none focus:border-[#E2FF00]"
              >
                <option value="">선수 선택 (여학생)</option>
                {classStudents.filter(s => s.gender === 'F').map(s => (
                  <option key={s.studentNum} value={s.name}>
                    {getStudentLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Men's Doubles */}
            <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E2FF00] flex items-center gap-2">
                  🏸 3. 남자 복식 (2명)
                </span>
                <span className="text-[11px] text-white/40 font-mono">2인 1조</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={mdPlayer1}
                  onChange={(e) => setMdPlayer1(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white text-xs focus:outline-none focus:border-[#E2FF00]"
                >
                  <option value="">복식 선수 1 (남)</option>
                  {classStudents.filter(s => s.gender === 'M').map(s => (
                    <option key={s.studentNum} value={s.name}>
                      {getStudentLabel(s)}
                    </option>
                  ))}
                </select>

                <select
                  value={mdPlayer2}
                  onChange={(e) => setMdPlayer2(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white text-xs focus:outline-none focus:border-[#E2FF00]"
                >
                  <option value="">복식 선수 2 (남)</option>
                  {classStudents.filter(s => s.gender === 'M').map(s => (
                    <option key={s.studentNum} value={s.name}>
                      {getStudentLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Women's Doubles */}
            <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E2FF00] flex items-center gap-2">
                  🏸 4. 여자 복식 (2명)
                </span>
                <span className="text-[11px] text-white/40 font-mono">2인 1조</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={wdPlayer1}
                  onChange={(e) => setWdPlayer1(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white text-xs focus:outline-none focus:border-[#E2FF00]"
                >
                  <option value="">복식 선수 1 (여)</option>
                  {classStudents.filter(s => s.gender === 'F').map(s => (
                    <option key={s.studentNum} value={s.name}>
                      {getStudentLabel(s)}
                    </option>
                  ))}
                </select>

                <select
                  value={wdPlayer2}
                  onChange={(e) => setWdPlayer2(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white text-xs focus:outline-none focus:border-[#E2FF00]"
                >
                  <option value="">복식 선수 2 (여)</option>
                  {classStudents.filter(s => s.gender === 'F').map(s => (
                    <option key={s.studentNum} value={s.name}>
                      {getStudentLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5. Mixed Doubles */}
            <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E2FF00] flex items-center gap-2">
                  🏸 5. 혼합 복식 (남 1명, 여 1명)
                </span>
                <span className="text-[11px] text-white/40 font-mono">남녀 1조</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={xdPlayerM}
                  onChange={(e) => setXdPlayerM(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white text-xs focus:outline-none focus:border-[#E2FF00]"
                >
                  <option value="">남학생 선수</option>
                  {classStudents.filter(s => s.gender === 'M').map(s => (
                    <option key={s.studentNum} value={s.name}>
                      {getStudentLabel(s)}
                    </option>
                  ))}
                </select>

                <select
                  value={xdPlayerF}
                  onChange={(e) => setXdPlayerF(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white text-xs focus:outline-none focus:border-[#E2FF00]"
                >
                  <option value="">여학생 선수</option>
                  {classStudents.filter(s => s.gender === 'F').map(s => (
                    <option key={s.studentNum} value={s.name}>
                      {getStudentLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-xl bg-[#E2FF00] hover:bg-[#c9e600] text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(226,255,0,0.3)] transition transform active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Firebase rosters 컬렉션에 저장 중...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>출전명단 Firebase에 저장 및 제출 완료하기</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Submitted Rosters Status List from Firebase */}
      {submittedRostersList.length > 0 && (
        <div className="p-6 rounded-2xl bg-[#12192B] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-[#E2FF00]" />
              Firebase rosters 컬렉션에 등록된 출전명단 현황
            </h4>
            <span className="text-xs text-white/50 font-mono">
              총 {submittedRostersList.length}건 등록됨
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {submittedRostersList.slice(0, 6).map((r, idx) => (
              <div key={r.id || idx} className="p-3.5 rounded-xl bg-[#0A0F1D] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#E2FF00]">
                    {r.grade}학년 {r.classNum}반 [{r.category}]
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    R{r.roundId}
                  </span>
                </div>
                <div className="text-xs text-white/70 truncate">
                  선수: {(r.players || []).map((p: any) => p.name).join(', ')}
                </div>
                <div className="text-[10px] text-white/40 flex items-center justify-between">
                  <span>제출: {r.submittedBy || '체육부장'}</span>
                  <span>{r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
