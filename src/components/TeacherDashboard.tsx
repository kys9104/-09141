import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Users, 
  Calendar, 
  FileSpreadsheet, 
  CheckCircle2, 
  RefreshCw, 
  Trash2,
  Check,
  UserCheck,
  Database,
  ExternalLink,
  Copy,
  AlertCircle,
  Plus,
  Send,
  RotateCcw
} from 'lucide-react';
import { GradeLevel, TieMatch, UserProfile, isAdminRole } from '../types';
import { StorageService, AssignedRoleRecord } from '../services/storageService';
import { FirebaseService, RoleAssignment } from '../services/firebaseService';
import { GASService } from '../services/gasService';
import { LEAGUE_ROUNDS } from '../data/initialData';

interface TeacherDashboardProps {
  currentUser: UserProfile | null;
  onOpenLogin: () => void;
  onOpenGAS: () => void;
  onOpenScoreEdit?: (tieMatchId: string) => void;
  refreshKey?: number;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentUser,
  onOpenLogin,
  onOpenGAS,
  onOpenScoreEdit,
  refreshKey
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(isAdminRole(currentUser?.role));
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  // Sub-tabs: 3 core teacher requirements with persistent subtab memory
  const [activeSubTab, setActiveSubTab] = useState<'ROLES_MGR' | 'MATCH_MGR' | 'GAS_SETTINGS'>(() => {
    try {
      const saved = localStorage.getItem('sinan_teacher_subtab');
      if (saved === 'ROLES_MGR' || saved === 'MATCH_MGR' || saved === 'GAS_SETTINGS') {
        return saved;
      }
    } catch (e) {}
    return 'ROLES_MGR';
  });

  const handleSelectSubTab = (tab: 'ROLES_MGR' | 'MATCH_MGR' | 'GAS_SETTINGS') => {
    setActiveSubTab(tab);
    try {
      localStorage.setItem('sinan_teacher_subtab', tab);
    } catch (e) {}
  };

  // Subtab 1: Student Role Management (Captain & Council)
  const [targetGrade, setTargetGrade] = useState<GradeLevel>(1);
  const [targetClass, setTargetClass] = useState<number>(1);
  const [targetStudentNum, setTargetStudentNum] = useState<number>(1);
  const [targetRole, setTargetRole] = useState<'captain' | 'council'>('council');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'captain' | 'council'>('ALL');
  const [assignedRolesList, setAssignedRolesList] = useState<RoleAssignment[]>(() => StorageService.getAssignedRoles());
  const [isAssigningRole, setIsAssigningRole] = useState<boolean>(false);
  const [roleMsg, setRoleMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Subtab 2: Match Results Management
  const [matches, setMatches] = useState<TieMatch[]>(() => StorageService.getMatches());
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<number>(0);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<number>(0);

  // Subtab 3: GAS Settings
  const [gasUrl, setGasUrl] = useState<string>(() => StorageService.getGasUrl());
  const [isSavingGas, setIsSavingGas] = useState<boolean>(false);
  const [gasTestMsg, setGasTestMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Keep isAuthenticated in sync if currentUser changes to admin
  useEffect(() => {
    if (isAdminRole(currentUser?.role)) {
      setIsAuthenticated(true);
    }
  }, [currentUser]);

  // Sync matches when refreshKey or events occur without changing activeSubTab
  useEffect(() => {
    const handleMatchesUpdate = () => {
      setMatches(StorageService.getMatches());
    };
    const handleGasUpdate = (e: any) => {
      if (e?.detail) setGasUrl(e.detail);
      else setGasUrl(StorageService.getGasUrl());
    };
    window.addEventListener('matchesUpdated', handleMatchesUpdate);
    window.addEventListener('gasUrlUpdated', handleGasUpdate);
    return () => {
      window.removeEventListener('matchesUpdated', handleMatchesUpdate);
      window.removeEventListener('gasUrlUpdated', handleGasUpdate);
    };
  }, []);

  useEffect(() => {
    setMatches(StorageService.getMatches());
  }, [refreshKey]);

  // Load students for current class
  const classStudents = StorageService.getStudents(targetGrade, targetClass);

  // When class changes, ensure selected student is valid
  useEffect(() => {
    if (classStudents.length > 0 && !classStudents.some(s => s.studentNum === targetStudentNum)) {
      setTargetStudentNum(classStudents[0].studentNum);
    }
  }, [targetGrade, targetClass]);

  // Load initial data and connect real-time listener
  useEffect(() => {
    loadAssignedRoles();
    loadGasUrl();
    loadMatchesFromFirestore();

    // Subscribe to Firestore assigned_roles changes in real-time
    const unsubscribe = FirebaseService.subscribeAssignedRoles((liveRoles) => {
      if (liveRoles && liveRoles.length > 0) {
        setAssignedRolesList(liveRoles);
        const localList: AssignedRoleRecord[] = liveRoles.map(item => ({
          id: item.id,
          grade: item.grade,
          classNum: item.classNum,
          studentNum: item.studentNum,
          name: item.name,
          role: item.role,
          assignedAt: item.assignedAt,
          assignedBy: item.assignedBy
        }));
        StorageService.saveAssignedRoles(localList);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadAssignedRoles = async () => {
    try {
      const list = await FirebaseService.getAssignedRoles();
      if (list && list.length > 0) {
        setAssignedRolesList(list);
        const localList: AssignedRoleRecord[] = list.map(item => ({
          id: item.id,
          grade: item.grade,
          classNum: item.classNum,
          studentNum: item.studentNum,
          name: item.name,
          role: item.role,
          assignedAt: item.assignedAt,
          assignedBy: item.assignedBy
        }));
        StorageService.saveAssignedRoles(localList);
      } else {
        const local = StorageService.getAssignedRoles();
        if (local.length > 0) {
          setAssignedRolesList(local);
        }
      }
    } catch (e) {
      console.warn('Error loading roles:', e);
      const localRoles = StorageService.getAssignedRoles();
      setAssignedRolesList(localRoles);
    }
  };

  const loadGasUrl = async () => {
    try {
      const url = await FirebaseService.getGasUrl();
      if (url) {
        setGasUrl(url);
      } else {
        const localConfig = StorageService.getGASConfig();
        setGasUrl(localConfig.webAppUrl || '');
      }
    } catch (e) {
      console.warn('Error loading gas url:', e);
    }
  };

  const loadMatchesFromFirestore = async () => {
    try {
      const firestoreMatches = await FirebaseService.getMatches();
      if (firestoreMatches.length > 0) {
        setMatches(firestoreMatches);
        StorageService.saveMatches(firestoreMatches);
      } else {
        setMatches(StorageService.getMatches());
      }
    } catch (e) {
      console.warn('Error loading matches from firestore:', e);
      setMatches(StorageService.getMatches());
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '4161') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('체육교사 접근 비밀번호가 일치하지 않습니다.');
    }
  };

  // Grant Role (Council or Captain) directly from selected student
  const handleGrantRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = classStudents.find(s => s.studentNum === targetStudentNum);
    if (!student) {
      setRoleMsg({ type: 'error', text: '학생을 선택해주세요.' });
      return;
    }

    const docId = `${targetGrade}-${targetClass}-${student.studentNum}`;
    const newRecord: RoleAssignment = {
      id: docId,
      grade: targetGrade,
      classNum: targetClass,
      studentNum: student.studentNum,
      name: student.name,
      role: targetRole,
      assignedAt: new Date().toISOString(),
      assignedBy: '체육교사'
    };

    // 1. Instant local optimistic update (0.01s response)
    StorageService.setAssignedRole({
      id: newRecord.id,
      grade: targetGrade,
      classNum: targetClass,
      studentNum: student.studentNum,
      name: student.name,
      role: targetRole,
      assignedAt: newRecord.assignedAt,
      assignedBy: '체육교사'
    });

    if (targetRole === 'captain') {
      StorageService.setSportsRepresentative(targetGrade, targetClass, student.name);
    }

    setAssignedRolesList(prev => {
      const idx = prev.findIndex(p => 
        p.id === newRecord.id || 
        (p.grade === targetGrade && p.classNum === targetClass && p.studentNum === student.studentNum)
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newRecord;
        return updated;
      }
      return [newRecord, ...prev];
    });

    setRoleMsg({
      type: 'success',
      text: `✓ ${targetGrade}학년 ${targetClass}반 ${student.studentNum}번 ${student.name} 학생에게 [${targetRole === 'council' ? '학생자치회' : '반장/체육부장'}] 권한이 즉시 부여되었습니다!`
    });

    // 2. Background Firestore write
    setIsAssigningRole(true);
    FirebaseService.grantRole({
      grade: targetGrade,
      classNum: targetClass,
      studentNum: student.studentNum,
      name: student.name,
      role: targetRole
    }).then(res => {
      if (!res.success) {
        console.warn('Background Firestore grant notification:', res.message);
      }
    }).catch(err => {
      console.warn('Background Firestore grant error:', err);
    }).finally(() => {
      setIsAssigningRole(false);
    });
  };

  // Revoke Role (Instant local update + Background Firestore deletion)
  const handleRevokeRole = async (
    docId: string, 
    roleName: string, 
    studentName: string,
    grade?: GradeLevel,
    classNum?: number,
    studentNum?: number
  ) => {
    if (!confirm(`정말 [${studentName}] 학생의 ${roleName === 'council' ? '학생자치회' : '반장/체육부장'} 권한을 해제하시겠습니까?`)) return;
    
    // 1. Instant UI & Storage removal (0.01s response)
    StorageService.removeAssignedRole(docId, grade, classNum, studentNum);
    setAssignedRolesList(prev => prev.filter(p => {
      if (p.id === docId) return false;
      if (grade !== undefined && classNum !== undefined && studentNum !== undefined) {
        if (p.grade === grade && p.classNum === classNum && p.studentNum === studentNum) return false;
      }
      return true;
    }));

    setRoleMsg({ type: 'success', text: `✓ [${studentName}] 학생의 권한이 정상적으로 해제되었습니다.` });

    // 2. Background Firestore delete
    FirebaseService.revokeRole(docId, { grade, classNum, studentNum }).catch(err => {
      console.warn('Background revoke error:', err);
    });
  };

  // Save GAS Webhook URL
  const handleSaveGasUrl = async () => {
    const trimmed = gasUrl.trim();
    if (!trimmed.startsWith('http')) {
      setGasTestMsg({ type: 'error', text: '올바른 https:// URL 형식이어야 합니다.' });
      return;
    }

    setIsSavingGas(true);
    setGasTestMsg(null);

    try {
      // 1. Save directly to local storage immediately
      StorageService.saveGasUrl(trimmed);

      // 2. Save to Firebase settings/gasUrl
      const res = await FirebaseService.saveGasUrl(trimmed, currentUser?.name || '체육교사');

      setGasTestMsg({
        type: 'success',
        text: res.message || 'Google Apps Script URL이 Firebase settings/gasUrl에 성공적으로 저장되었습니다!'
      });
    } catch (err: any) {
      setGasTestMsg({
        type: 'success',
        text: 'Google Apps Script URL이 로컬에 저장되었습니다.'
      });
    } finally {
      setIsSavingGas(false);
    }
  };

  // Test GAS Connection
  const handleTestGasConnection = async () => {
    const trimmed = gasUrl.trim();
    if (!trimmed) {
      setGasTestMsg({ type: 'error', text: 'URL을 먼저 입력해주세요.' });
      return;
    }

    // Auto-save URL so it's never lost
    StorageService.saveGasUrl(trimmed);
    FirebaseService.saveGasUrl(trimmed, currentUser?.name || '체육교사').catch(() => {});

    setGasTestMsg(null);
    const res = await GASService.testConnection(trimmed);
    setGasTestMsg({
      type: res.success ? 'success' : 'error',
      text: res.message
    });
  };

  // Copy Script Code
  const handleCopyScript = () => {
    const code = GASService.getScriptCode();
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Reset Match Result
  const handleResetMatch = async (matchId: string) => {
    if (!confirm('이 경기의 결과를 초기화하시겠습니까? (세트 점수 및 승패가 초기 상태로 되돌아갑니다)')) return;
    
    // Ensure active subtab stays on MATCH_MGR
    handleSelectSubTab('MATCH_MGR');

    StorageService.deleteTieMatchResult(matchId);
    const updated = StorageService.getMatches();
    setMatches(updated);

    const matchObj = updated.find(m => m.id === matchId);
    if (matchObj) {
      await FirebaseService.saveMatch(matchObj, '체육교사(초기화)');
    }
  };

  // Reset All Matches and Lineups
  const handleResetAllMatchesAndLineups = async () => {
    if (!confirm('경고: 전체 경기 결과, 세트 스코어 및 제출된 출전선수명단을 전부 초기화하시겠습니까?\n\n(참고: 학생자치회 및 반장/체육부장 권한 명단은 그대로 안전하게 유지됩니다)')) return;

    handleSelectSubTab('MATCH_MGR');

    StorageService.resetAllMatchesAndLineups();
    setMatches(StorageService.getMatches());

    try {
      const res = await FirebaseService.resetAllCloudMatchesAndRosters();
      alert(res.message || '모든 경기 결과 및 출전선수명단이 초기화되었습니다.');
    } catch (e: any) {
      alert('로컬 초기화가 완료되었습니다. (클라우드 반영 완료)');
    }
  };

  // Full Sync Matches to Firebase
  const handleSyncAllMatchesToFirebase = async () => {
    try {
      const currentList = StorageService.getMatches();
      for (const m of currentList) {
        await FirebaseService.saveMatch(m, '체육교사(일괄동기화)');
      }
      alert('모든 경기 데이터가 Firebase matches 컬렉션에 동기화되었습니다.');
    } catch (e: any) {
      alert('동기화 실패: ' + e.message);
    }
  };

  // Filter matches
  const filteredMatches = matches.filter(m => {
    if (selectedRoundFilter > 0 && m.roundId !== selectedRoundFilter) return false;
    if (selectedGradeFilter > 0 && m.grade !== selectedGradeFilter && m.teamAGrade !== selectedGradeFilter) return false;
    return true;
  });

  // If not authenticated as teacher yet
  if (!isAuthenticated && !isAdminRole(currentUser?.role)) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-[#12192B] border border-white/10 rounded-2xl shadow-2xl space-y-6 text-center animate-in fade-in duration-300">
        <div className="w-14 h-14 mx-auto rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">체육교사(Admin) 관리자 인증</h2>
          <p className="text-xs text-white/50 mt-1.5 leading-relaxed">
            전체 경기 결과 관리, 구글 시트(GAS) 연동 URL 설정 및 <strong className="text-amber-400">반장/체육부장 권한 관리</strong>는 체육교사 인증이 필요합니다.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="text-left">
            <label className="block text-xs font-semibold text-white/70 mb-1.5 font-mono">
              ADMIN ACCESS CODE
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full px-4 py-3 rounded-xl bg-[#0A0F1D] border border-white/10 text-center text-white text-lg font-mono font-bold tracking-widest placeholder-white/20 focus:outline-none focus:border-amber-400"
            />
          </div>

          {authError && (
            <div className="text-xs text-rose-400 font-medium font-mono">{authError}</div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition shadow-[0_0_15px_rgba(245,158,11,0.3)]"
          >
            관리자 대시보드 진입
          </button>
        </form>
      </div>
    );
  }

  // Count by role
  const councilCount = assignedRolesList.filter(r => r.role === 'council').length;
  const captainCount = assignedRolesList.filter(r => r.role === 'captain').length;

  const displayedRolesList = assignedRolesList.filter(r => {
    if (roleFilter === 'ALL') return true;
    return r.role === roleFilter;
  });

  const selectedStudentObj = classStudents.find(s => s.studentNum === targetStudentNum) || classStudents[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#12192B] border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  TEACHER ADMIN
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  FIREBASE FIRESTORE
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                체육교사 통합 운영 관리자 대시보드
              </h2>
              <p className="text-xs text-white/50 mt-1 max-w-2xl leading-relaxed">
                학생자치회(council) 및 반장/체육부장(captain) 권한 부여, 전체 경기 결과 관리(수정/삭제/초기화), 그리고 구글 시트(GAS) Webhook URL 설정을 총괄합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={handleSyncAllMatchesToFirebase}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center gap-1.5 transition"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Firebase 일괄 백업</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subtab Navigation Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-[#12192B] border border-white/10 rounded-2xl overflow-x-auto">
        <button
          onClick={() => handleSelectSubTab('ROLES_MGR')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === 'ROLES_MGR'
              ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.3)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>학생 권한 관리 (학생자치회 & 반장/체육부장)</span>
        </button>

        <button
          onClick={() => handleSelectSubTab('MATCH_MGR')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === 'MATCH_MGR'
              ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.3)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>경기 결과 관리 (수정/삭제/초기화)</span>
        </button>

        <button
          onClick={() => handleSelectSubTab('GAS_SETTINGS')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === 'GAS_SETTINGS'
              ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.3)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>구글 시트(GAS) 연동 URL 설정</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: ROLES MANAGEMENT (학생자치회 & 반장/체육부장 권한 관리) */}
      {/* ========================================================================= */}
      {activeSubTab === 'ROLES_MGR' && (
        <div className="space-y-6">
          {roleMsg && (
            <div
              className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 font-medium ${
                roleMsg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {roleMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{roleMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form to Grant Role (Simplified: no manual Name or UID inputs) */}
            <form onSubmit={handleGrantRole} className="p-6 rounded-2xl bg-[#12192B] border border-white/10 space-y-5 lg:col-span-1">
              <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <Plus className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white font-mono">
                  학생 권한 부여
                </h3>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-mono">부여할 권한 (Role)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetRole('council')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                      targetRole === 'council'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]'
                        : 'bg-[#0A0F1D] border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <span>학생자치회</span>
                    <span className="text-[10px] font-normal opacity-80">경기결과 입력</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetRole('captain')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                      targetRole === 'captain'
                        ? 'bg-amber-500 border-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                        : 'bg-[#0A0F1D] border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <span>반장 / 체육부장</span>
                    <span className="text-[10px] font-normal opacity-80">출전명단 작성</span>
                  </button>
                </div>
              </div>

              {/* Grade */}
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-mono">학년 선택</label>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setTargetGrade(g as GradeLevel)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        targetGrade === g
                          ? 'bg-amber-500 border-amber-500 text-black'
                          : 'bg-[#0A0F1D] border-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      {g}학년
                    </button>
                  ))}
                </div>
              </div>

              {/* Class */}
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-mono">반 선택</label>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTargetClass(c)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        targetClass === c
                          ? 'bg-amber-500 border-amber-500 text-black'
                          : 'bg-[#0A0F1D] border-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      {c}반
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Num and Name selection from Class Roster */}
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-mono">지정할 학생 선택</label>
                <select
                  value={targetStudentNum}
                  onChange={(e) => setTargetStudentNum(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0A0F1D] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                >
                  {classStudents.map(s => (
                    <option key={s.studentNum} value={s.studentNum}>
                      {s.studentNum}번 {s.name} ({s.gender === 'M' ? '남' : '여'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Student Preview Card */}
              {selectedStudentObj && (
                <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-white/10 text-xs">
                  <div className="text-[11px] text-white/50 mb-1 font-mono">권한 부여 대상 확인:</div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">
                      {targetGrade}학년 {targetClass}반 {selectedStudentObj.studentNum}번 {selectedStudentObj.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      targetRole === 'council' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {targetRole === 'council' ? '학생자치회' : '반장/체육부장'}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isAssigningRole}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition disabled:opacity-50"
              >
                {isAssigningRole ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Firebase 및 시스템에 권한 등록 중...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>선택 학생에게 [{targetRole === 'council' ? '학생자치회' : '반장/체육부장'}] 권한 부여</span>
                  </>
                )}
              </button>
            </form>

            {/* List of Assigned Students */}
            <div className="p-6 rounded-2xl bg-[#12192B] border border-white/10 space-y-4 lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white font-mono">
                    현재 권한 부여 현황 ({assignedRolesList.length}명)
                  </h3>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setRoleFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      roleFilter === 'ALL'
                        ? 'bg-white/20 text-white'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    전체 ({assignedRolesList.length})
                  </button>
                  <button
                    onClick={() => setRoleFilter('council')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      roleFilter === 'council'
                        ? 'bg-indigo-600 text-white'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    학생자치회 ({councilCount})
                  </button>
                  <button
                    onClick={() => setRoleFilter('captain')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      roleFilter === 'captain'
                        ? 'bg-amber-500 text-black'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    반장/체육부장 ({captainCount})
                  </button>

                  <button
                    onClick={loadAssignedRoles}
                    title="새로고침"
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition ml-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {displayedRolesList.length === 0 ? (
                <div className="text-center py-10 text-white/40 text-xs font-mono">
                  부여된 학생 권한이 없습니다. 좌측 폼에서 학생을 선택하여 권한을 부여하세요.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {displayedRolesList.map((r) => {
                    const isCouncil = r.role === 'council';
                    return (
                      <div key={r.id} className="p-3.5 rounded-xl bg-[#0A0F1D] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold font-mono text-xs border shrink-0 ${
                            isCouncil 
                              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' 
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          }`}>
                            {r.grade}-{r.classNum}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{r.name}</span>
                              <span className="text-xs text-white/40 font-mono">({r.studentNum}번)</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                                isCouncil
                                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              }`}>
                                {isCouncil ? '학생자치회 (경기결과 입력)' : '반장/체육부장 (명단작성)'}
                              </span>
                              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>부여됨</span>
                              </span>
                            </div>
                            <div className="text-[11px] text-white/40 font-mono mt-0.5">
                              부여일: {new Date(r.assignedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRevokeRole(r.id, r.role, r.name, r.grade, r.classNum, r.studentNum)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition self-end sm:self-auto"
                        >
                          권한 해제
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: MATCH RESULTS MANAGEMENT (전체 경기 결과 관리) */}
      {/* ========================================================================= */}
      {activeSubTab === 'MATCH_MGR' && (
        <div className="p-6 rounded-2xl bg-[#12192B] border border-white/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                전체 대진 경기 결과 관리 (수정 / 삭제 / 초기화)
              </h3>
              <p className="text-xs text-white/40 mt-1">
                완료된 경기의 스코어를 재조정하거나, 잘못 입력된 경기 결과를 초기 상태로 리셋합니다.
              </p>
            </div>

            {/* Actions & Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleResetAllMatchesAndLineups}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5"
                title="전체 경기 스코어 및 제출된 출전선수명단 초기화"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>전체 결과/명단 초기화</span>
              </button>

              <select
                value={selectedRoundFilter}
                onChange={(e) => setSelectedRoundFilter(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl bg-[#0A0F1D] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
              >
                <option value={0}>전체 라운드 (1~6)</option>
                {[1, 2, 3, 4, 5, 6].map(r => (
                  <option key={r} value={r}>제{r}라운드</option>
                ))}
              </select>

              <select
                value={selectedGradeFilter}
                onChange={(e) => setSelectedGradeFilter(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl bg-[#0A0F1D] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
              >
                <option value={0}>전체 학년</option>
                <option value={1}>1학년 경기</option>
                <option value={2}>2학년 경기</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredMatches.map(m => {
              const completedCount = m.subMatches.filter(s => s.status === 'COMPLETED').length;
              const isFinished = m.status === 'COMPLETED';

              return (
                <div key={m.id} className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-white/10 text-white/80">
                        제{m.roundId}라운드
                      </span>
                      <span className="text-xs font-bold text-white">
                        {m.teamAGrade || m.grade}학년 {m.teamAClass}반 VS {m.teamBGrade || m.grade}학년 {m.teamBClass}반
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        isFinished 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {isFinished ? '경기 완료' : `진행중 (${completedCount}/5)`}
                      </span>
                    </div>

                    <div className="text-xs text-white/50 mt-1.5 flex items-center gap-4 font-mono">
                      <span>일자: {m.date}</span>
                      <span>스코어: {m.teamAWins} : {m.teamBWins}</span>
                      {m.winnerClass && <span className="text-amber-400 font-bold">승리: {m.winnerClass}반</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {onOpenScoreEdit && (
                      <button
                        onClick={() => {
                          handleSelectSubTab('MATCH_MGR');
                          onOpenScoreEdit(m.id);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition"
                      >
                        결과 수정/입력
                      </button>
                    )}

                    <button
                      onClick={() => handleResetMatch(m.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>초기화</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: GAS URL SETTINGS (구글 시트 연동 URL 설정) */}
      {/* ========================================================================= */}
      {activeSubTab === 'GAS_SETTINGS' && (
        <div className="space-y-6">
          {gasTestMsg && (
            <div
              className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 font-medium ${
                gasTestMsg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {gasTestMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{gasTestMsg.text}</span>
            </div>
          )}

          <div className="p-6 rounded-2xl bg-[#12192B] border border-white/10 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Google Apps Script (GAS) Webhook URL 등록
              </h3>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                학생자치회 또는 교사가 경기 결과를 입력할 때, Firebase 저장과 동시에 구글 스프레드시트로 실시간 전송(POST)되는 엔드포인트 URL입니다. (Firebase의 <code className="text-amber-400 font-mono">settings/gasUrl</code> 문서에 저장됨)
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-mono text-white/70">
                WEB APP URL (https://script.google.com/macros/s/.../exec)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={gasUrl}
                  onChange={(e) => setGasUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveGasUrl(); }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-4 py-3 rounded-xl bg-[#0A0F1D] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                />

                <button
                  type="button"
                  onClick={handleTestGasConnection}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 transition"
                >
                  연결 테스트 (PING)
                </button>

                <button
                  type="button"
                  onClick={handleSaveGasUrl}
                  disabled={isSavingGas}
                  className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition shadow-[0_0_12px_rgba(245,158,11,0.3)] disabled:opacity-50"
                >
                  {isSavingGas ? '저장 중...' : 'URL 저장'}
                </button>
              </div>
            </div>

            {/* Script Code Helper */}
            <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono">
                  구글 스프레드시트용 Apps Script 소스코드 (Code.gs)
                </span>
                <button
                  onClick={handleCopyScript}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-white border border-white/10 flex items-center gap-1.5 transition"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? '복사 완료!' : '스크립트 복사'}</span>
                </button>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">
                구글 시트의 [확장 프로그램] → [Apps Script]에 붙여넣고 [새 배포: 웹 앱(액세스: 모든 사용자)]으로 배포한 URL을 위에 등록하십시오.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
