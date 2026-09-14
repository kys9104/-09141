import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Users
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
import { LEAGUE_ROUNDS } from '../data/initialData';
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

  // Class Selection State (1-1, 1-2, 2-1, 2-2)
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(1);
  const [selectedClass, setSelectedClass] = useState<number>(1);

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
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const roundInfo = LEAGUE_ROUNDS.find(r => r.id === roundId) || LEAGUE_ROUNDS[0];

  // Initialize selected class when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setMessage(null);

    // If user has a specific class assigned, prioritize that
    if (currentUser && currentUser.grade && currentUser.classNum) {
      setSelectedGrade(currentUser.grade as GradeLevel);
      setSelectedClass(currentUser.classNum);
      return;
    }

    // Otherwise if opened with a specific tie match, choose Team A of that match
    if (tieMatchId) {
      const match = matches.find(m => m.id === tieMatchId);
      if (match) {
        setSelectedGrade((match.teamAGrade || match.grade || 1) as GradeLevel);
        setSelectedClass(match.teamAClass || 1);
        return;
      }
    }

    // Default to 1-1
    setSelectedGrade(1);
    setSelectedClass(1);
  }, [isOpen, tieMatchId]);

  // Load existing lineup whenever selectedGrade, selectedClass, or roundId changes
  useEffect(() => {
    if (!isOpen) return;

    let ms = '';
    let ws = '';
    let md1 = '';
    let md2 = '';
    let wd1 = '';
    let wd2 = '';
    let xdM = '';
    let xdF = '';

    const freshMatches = StorageService.getMatches();
    // 1. Try to load from tie match submatches
    const activeTie = freshMatches.find(m => 
      m.roundId === roundId && 
      (((m.teamAGrade || m.grade) === selectedGrade && m.teamAClass === selectedClass) || 
       ((m.teamBGrade || m.grade) === selectedGrade && m.teamBClass === selectedClass))
    );

    if (activeTie) {
      const isTeamA = (activeTie.teamAGrade || activeTie.grade) === selectedGrade && activeTie.teamAClass === selectedClass;
      activeTie.subMatches.forEach(sm => {
        const players = isTeamA ? sm.teamAPlayers : sm.teamBPlayers;
        if (sm.category === 'MEN_SINGLES' && players && players[0]) ms = players[0].name;
        if (sm.category === 'WOMEN_SINGLES' && players && players[0]) ws = players[0].name;
        if (sm.category === 'MEN_DOUBLES' && players) {
          if (players[0]) md1 = players[0].name;
          if (players[1]) md2 = players[1].name;
        }
        if (sm.category === 'WOMEN_DOUBLES' && players) {
          if (players[0]) wd1 = players[0].name;
          if (players[1]) wd2 = players[1].name;
        }
        if (sm.category === 'MIXED_DOUBLES' && players) {
          if (players[0]) xdM = players[0].name;
          if (players[1]) xdF = players[1].name;
        }
      });
    }

    // 2. Also check StorageService.getRosters() in case saved individually
    const localRosters = StorageService.getRosters().filter(r => 
      r.roundId === roundId && r.grade === selectedGrade && r.classNum === selectedClass
    );
    localRosters.forEach(r => {
      if (r.category === 'MEN_SINGLES' && r.players && r.players[0]) ms = r.players[0].name;
      if (r.category === 'WOMEN_SINGLES' && r.players && r.players[0]) ws = r.players[0].name;
      if (r.category === 'MEN_DOUBLES' && r.players) {
        if (r.players[0]) md1 = r.players[0].name;
        if (r.players[1]) md2 = r.players[1].name;
      }
      if (r.category === 'WOMEN_DOUBLES' && r.players) {
        if (r.players[0]) wd1 = r.players[0].name;
        if (r.players[1]) wd2 = r.players[1].name;
      }
      if (r.category === 'MIXED_DOUBLES' && r.players) {
        if (r.players[0]) xdM = r.players[0].name;
        if (r.players[1]) xdF = r.players[1].name;
      }
    });

    setMsPlayer(ms);
    setWsPlayer(ws);
    setMdPlayer1(md1);
    setMdPlayer2(md2);
    setWdPlayer1(wd1);
    setWdPlayer2(wd2);
    setXdPlayerM(xdM);
    setXdPlayerF(xdF);
  }, [isOpen, selectedGrade, selectedClass, roundId, tieMatchId]);

  if (!isOpen) return null;

  const allStudents = StorageService.getStudents(selectedGrade, selectedClass);
  const maleStudents = allStudents.filter(s => s.gender === 'M');
  const femaleStudents = allStudents.filter(s => s.gender === 'F');

  // Helper to format student label
  const getStudentLabel = (s: Player) => {
    if (s.name === `${s.studentNum}번 학생` || s.name === `${s.studentNum}번`) {
      return `${s.studentNum}번 학생`;
    }
    return `${s.studentNum}번 ${s.name}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    setIsSaving(true);

    try {
      // Helper to construct player object
      const findP = (name: string, defaultGender: 'M' | 'F'): Player => {
        const found = allStudents.find(s => s.name === name);
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

      const msList = msPlayer ? [findP(msPlayer, 'M')] : [];
      const wsList = wsPlayer ? [findP(wsPlayer, 'F')] : [];
      const mdList = [mdPlayer1 ? findP(mdPlayer1, 'M') : null, mdPlayer2 ? findP(mdPlayer2, 'M') : null].filter(Boolean) as Player[];
      const wdList = [wdPlayer1 ? findP(wdPlayer1, 'F') : null, wdPlayer2 ? findP(wdPlayer2, 'F') : null].filter(Boolean) as Player[];
      const xdList = [xdPlayerM ? findP(xdPlayerM, 'M') : null, xdPlayerF ? findP(xdPlayerF, 'F') : null].filter(Boolean) as Player[];

      const submitterInfo = currentUser
        ? `${currentUser.name} (${currentUser.grade ? `${currentUser.grade}학년 ${currentUser.classNum}반 ` : ''}${currentUser.role === 'admin' ? '체육교사' : currentUser.role === 'council' ? '학생자치회' : currentUser.role === 'captain' ? '체육부장/반장' : '학생'})`
        : `${selectedGrade}학년 ${selectedClass}반 대표/체육부장`;

      // 1. Update matching TieMatch in StorageService & Firebase
      const freshMatches = StorageService.getMatches();
      const tieIndex = freshMatches.findIndex(m => 
        m.roundId === roundId && 
        (((m.teamAGrade || m.grade) === selectedGrade && m.teamAClass === selectedClass) || 
         ((m.teamBGrade || m.grade) === selectedGrade && m.teamBClass === selectedClass))
      );

      let updatedTie: TieMatch | null = null;
      if (tieIndex !== -1) {
        updatedTie = {
          ...freshMatches[tieIndex],
          subMatches: freshMatches[tieIndex].subMatches.map(sm => ({ ...sm }))
        };

        const isTeamA = (updatedTie.teamAGrade || updatedTie.grade) === selectedGrade && updatedTie.teamAClass === selectedClass;

        updatedTie.subMatches.forEach(sm => {
          if (sm.category === 'MEN_SINGLES') {
            if (isTeamA) sm.teamAPlayers = msList; else sm.teamBPlayers = msList;
          }
          if (sm.category === 'WOMEN_SINGLES') {
            if (isTeamA) sm.teamAPlayers = wsList; else sm.teamBPlayers = wsList;
          }
          if (sm.category === 'MEN_DOUBLES') {
            if (isTeamA) sm.teamAPlayers = mdList; else sm.teamBPlayers = mdList;
          }
          if (sm.category === 'WOMEN_DOUBLES') {
            if (isTeamA) sm.teamAPlayers = wdList; else sm.teamBPlayers = wdList;
          }
          if (sm.category === 'MIXED_DOUBLES') {
            if (isTeamA) sm.teamAPlayers = xdList; else sm.teamBPlayers = xdList;
          }
        });

        updatedTie.status = 'READY_TO_PLAY';
        freshMatches[tieIndex] = updatedTie;
        StorageService.saveMatches(freshMatches);

        // Sync match to Firebase Firestore
        await FirebaseService.saveMatch(updatedTie, submitterInfo);

        // Send async webhook to Google Apps Script
        GASService.sendToGAS('MATCH_RESULT', updatedTie).catch(console.error);
      }

      // 2. Save individual rosters for each category to Firebase & local storage
      const categoriesToSave: Array<{ category: MatchCategory; players: Player[] }> = [
        { category: 'MEN_SINGLES' as MatchCategory, players: msList },
        { category: 'WOMEN_SINGLES' as MatchCategory, players: wsList },
        { category: 'MEN_DOUBLES' as MatchCategory, players: mdList },
        { category: 'WOMEN_DOUBLES' as MatchCategory, players: wdList },
        { category: 'MIXED_DOUBLES' as MatchCategory, players: xdList }
      ];

      await Promise.all(categoriesToSave.map(item => {
        const rosterId = `roster_r${roundId}_${selectedGrade}-${selectedClass}_${item.category}`;
        StorageService.saveRoster({
          id: rosterId,
          roundId,
          grade: selectedGrade,
          classNum: selectedClass,
          category: item.category,
          players: item.players,
          submittedBy: submitterInfo,
          submittedAt: new Date().toISOString(),
          isLocked: false
        });

        return FirebaseService.saveRoster({
          id: rosterId,
          roundId,
          grade: selectedGrade,
          classNum: selectedClass,
          category: item.category,
          players: item.players,
          submittedBy: submitterInfo
        });
      }));

      setMessage({ 
        type: 'success', 
        text: `${selectedGrade}학년 ${selectedClass}반 출전 명단이 성공적으로 저장되었습니다!` 
      });

      setTimeout(() => {
        onSaved();
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Failed to save roster:', err);
      setMessage({
        type: 'error',
        text: '명단 저장 중 오류가 발생했습니다. 다시 시도해주세요.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const classOptions: Array<{ grade: GradeLevel; classNum: number; label: string }> = [
    { grade: 1, classNum: 1, label: '1학년 1반' },
    { grade: 1, classNum: 2, label: '1학년 2반' },
    { grade: 2, classNum: 1, label: '2학년 1반' },
    { grade: 2, classNum: 2, label: '2학년 2반' }
  ];

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
          
          {/* Class Selector (1-1, 1-2, 2-1, 2-2) */}
          <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-2.5">
            <div className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#E2FF00]" />
              <span>출전 대상 학급 선택 (클릭하여 변경):</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {classOptions.map(opt => {
                const isSelected = selectedGrade === opt.grade && selectedClass === opt.classNum;
                return (
                  <button
                    key={`${opt.grade}-${opt.classNum}`}
                    type="button"
                    onClick={() => {
                      setSelectedGrade(opt.grade);
                      setSelectedClass(opt.classNum);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      isSelected
                        ? 'bg-[#E2FF00] text-black border-[#E2FF00] shadow-[0_0_12px_rgba(226,255,0,0.35)]'
                        : 'bg-[#12192B] text-white/70 border-white/10 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-1 text-xs text-white/50 flex items-center justify-between flex-wrap gap-2">
            <span>
              현재 <strong className="text-[#E2FF00]">{selectedGrade}학년 {selectedClass}반</strong> 학생 명단 (남: <strong className="text-blue-400">{maleStudents.length}명</strong>, 여: <strong className="text-pink-400">{femaleStudents.length}명</strong>)
            </span>
            <span className="text-[11px] text-white/40">종목별 성별 규정에 따라 선수가 자동 분류됩니다.</span>
          </div>

          {/* 5 Categories Inputs */}
          <div className="space-y-4">
            
            {/* 1. Men's Singles (1 Player - Male Only) */}
            <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#E2FF00]">
                    🏸 1. 남자 단식 (1명)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    남학생 전용 ({maleStudents.length}명)
                  </span>
                </div>
                <span className="text-[11px] text-white/40 font-mono">단판 15점</span>
              </div>
              <select
                value={msPlayer}
                onChange={(e) => setMsPlayer(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-[#E2FF00]"
              >
                <option value="">-- 출전 선수 선택 (남학생) --</option>
                {maleStudents.map(s => (
                  <option key={s.studentNum} value={s.name}>
                    {getStudentLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Women's Singles (1 Player - Female Only) */}
            <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#E2FF00]">
                    🏸 2. 여자 단식 (1명)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30">
                    여학생 전용 ({femaleStudents.length}명)
                  </span>
                </div>
                <span className="text-[11px] text-white/40 font-mono">단판 15점</span>
              </div>
              <select
                value={wsPlayer}
                onChange={(e) => setWsPlayer(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-[#E2FF00]"
              >
                <option value="">-- 출전 선수 선택 (여학생) --</option>
                {femaleStudents.map(s => (
                  <option key={s.studentNum} value={s.name}>
                    {getStudentLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Men's Doubles (2 Players - Male Only) */}
            <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#E2FF00]">
                    🏸 3. 남자 복식 (2명 1조)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    남학생 전용
                  </span>
                </div>
                <span className="text-[11px] text-white/40 font-mono">단판 15점</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={mdPlayer1}
                  onChange={(e) => setMdPlayer1(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-[#E2FF00]"
                >
                  <option value="">복식 선수 1 (남학생)</option>
                  {maleStudents.map(s => (
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
                  <option value="">복식 선수 2 (남학생)</option>
                  {maleStudents.map(s => (
                    <option key={s.studentNum} value={s.name}>
                      {getStudentLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Women's Doubles (2 Players - Female Only) */}
            <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#E2FF00]">
                    🏸 4. 여자 복식 (2명 1조)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30">
                    여학생 전용
                  </span>
                </div>
                <span className="text-[11px] text-white/40 font-mono">단판 15점</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={wdPlayer1}
                  onChange={(e) => setWdPlayer1(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-[#E2FF00]"
                >
                  <option value="">복식 선수 1 (여학생)</option>
                  {femaleStudents.map(s => (
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
                  <option value="">복식 선수 2 (여학생)</option>
                  {femaleStudents.map(s => (
                    <option key={s.studentNum} value={s.name}>
                      {getStudentLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5. Mixed Doubles (2 Players - 1 Male + 1 Female) */}
            <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#E2FF00]">
                    🏸 5. 혼합 복식 (2명 1조)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E2FF00]/20 text-[#E2FF00] border border-[#E2FF00]/30 font-mono">
                    남학생 1명 + 여학생 1명
                  </span>
                </div>
                <span className="text-[11px] text-white/40 font-mono">단판 15점</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-blue-400 mb-1 font-semibold">
                    선수 1 (남학생)
                  </label>
                  <select
                    value={xdPlayerM}
                    onChange={(e) => setXdPlayerM(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-[#E2FF00]"
                  >
                    <option value="">남학생 선택</option>
                    {maleStudents.map(s => (
                      <option key={s.studentNum} value={s.name}>
                        {getStudentLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-pink-400 mb-1 font-semibold">
                    선수 2 (여학생)
                  </label>
                  <select
                    value={xdPlayerF}
                    onChange={(e) => setXdPlayerF(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#12192B] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-[#E2FF00]"
                  >
                    <option value="">여학생 선택</option>
                    {femaleStudents.map(s => (
                      <option key={s.studentNum} value={s.name}>
                        {getStudentLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>
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
              disabled={isSaving}
              className="w-2/3 py-3 rounded-xl text-xs sm:text-sm font-bold text-black bg-[#E2FF00] hover:opacity-90 disabled:opacity-50 shadow-[0_0_12px_rgba(226,255,0,0.3)] transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-black" />
              <span>{isSaving ? '저장 중...' : `${selectedGrade}학년 ${selectedClass}반 명단 확정 저장`}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
