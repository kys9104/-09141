import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  UserCheck, 
  Activity, 
  Lock, 
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Users
} from 'lucide-react';
import { GradeLevel, UserProfile, UserRole } from '../types';
import { StorageService, AssignedRoleRecord } from '../services/storageService';
import { FirebaseService } from '../services/firebaseService';
import { OFFICIAL_STUDENTS_ROSTER } from '../data/initialData';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [grade, setGrade] = useState<GradeLevel>(1);
  const [classNum, setClassNum] = useState<number>(1);
  const [studentNum, setStudentNum] = useState<number>(1);
  const [name, setName] = useState<string>('곽승준');
  // 4 Roles: captain (반장/체육부장), council (학생자치회), admin (체육교사), student (일반 학생)
  const [role, setRole] = useState<UserRole>('student');
  const [teacherPassword, setTeacherPassword] = useState<string>('');
  const [studentCouncilPassword, setStudentCouncilPassword] = useState<string>('');
  const [showCouncilPassword, setShowCouncilPassword] = useState<boolean>(false);
  const [showTeacherPassword, setShowTeacherPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [assignedRoles, setAssignedRoles] = useState<AssignedRoleRecord[]>(() => StorageService.getAssignedRoles());
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Sync assigned roles from both local storage and Firestore when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage('');
    const local = StorageService.getAssignedRoles();
    setAssignedRoles(local);

    FirebaseService.getAssignedRoles().then(live => {
      if (live && live.length > 0) {
        setAssignedRoles(live.map(l => ({
          id: l.id,
          grade: l.grade,
          classNum: l.classNum,
          studentNum: l.studentNum,
          name: l.name,
          role: l.role,
          assignedAt: l.assignedAt,
          assignedBy: l.assignedBy
        })));
      }
    }).catch(console.warn);
  }, [isOpen]);

  const currentClassKey = `${grade}-${classNum}`;
  const classRoster = OFFICIAL_STUDENTS_ROSTER[currentClassKey] || [];

  // Designated lists
  const designatedCaptains = assignedRoles.filter(r => r.role === 'captain');
  const designatedCouncil = assignedRoles.filter(r => r.role === 'council');

  // Check if currently selected student is designated for the selected role
  const isCurrentlyDesignatedCaptain = assignedRoles.some(
    r => Number(r.grade) === Number(grade) && 
         Number(r.classNum) === Number(classNum) && 
         Number(r.studentNum) === Number(studentNum) && 
         r.role === 'captain'
  );

  const isCurrentlyDesignatedCouncil = assignedRoles.some(
    r => Number(r.grade) === Number(grade) && 
         Number(r.classNum) === Number(classNum) && 
         Number(r.studentNum) === Number(studentNum) && 
         r.role === 'council'
  );

  // Auto-sync name when grade/class/studentNum changes
  useEffect(() => {
    if (role === 'admin' || role === 'TEACHER') {
      setName('체육교사');
    } else {
      const match = classRoster.find(s => s.num === studentNum);
      if (match) {
        setName(match.name);
      } else if (classRoster.length > 0) {
        setStudentNum(classRoster[0].num);
        setName(classRoster[0].name);
      }
    }
  }, [grade, classNum, studentNum, role]);

  // When clicking on a designated member quick-button
  const handleQuickSelect = (designated: AssignedRoleRecord) => {
    setGrade(designated.grade);
    setClassNum(designated.classNum);
    setStudentNum(designated.studentNum);
    setName(designated.name);
    setRole(designated.role);
    setErrorMessage('');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsVerifying(true);

    try {
      // 1. 체육교사 (Admin)
      if (role === 'admin' || role === 'TEACHER') {
        if (teacherPassword !== '4161') {
          setErrorMessage('체육교사 관리자 비밀번호가 일치하지 않습니다.');
          setIsVerifying(false);
          return;
        }
        const teacherProfile: UserProfile = {
          grade: 0 as GradeLevel,
          classNum: 0,
          studentNum: 0,
          name: '체육교사',
          role: 'admin'
        };
        StorageService.saveCurrentUser(teacherProfile);
        FirebaseService.saveUserProfile(teacherProfile).catch(() => {});
        onLoginSuccess(teacherProfile);
        onClose();
        return;
      }

      // 2. 일반 학생 (Student - Read Only)
      if (role === 'student' || role === 'STUDENT') {
        const studentGender = classRoster.find(s => s.num === studentNum)?.gender;
        const studentProfile: UserProfile = {
          grade,
          classNum,
          studentNum,
          name: name.trim() || `${studentNum}번 학생`,
          gender: studentGender,
          role: 'student'
        };
        StorageService.saveCurrentUser(studentProfile);
        onLoginSuccess(studentProfile);
        onClose();
        return;
      }

      // 3. 반장 / 체육부장 (Captain) - 체육교사가 지정한 인원만 승인!
      if (role === 'captain' || role === 'SPORTS_REP') {
        if (!name.trim()) {
          setErrorMessage('학생 성명을 선택해주세요.');
          setIsVerifying(false);
          return;
        }

        // Strict verification: Check local + Firestore
        const isLocalApproved = StorageService.isDesignatedRole(grade, classNum, studentNum, 'captain');
        let isCloudApproved = isLocalApproved;
        if (!isCloudApproved) {
          const cloudRole = await FirebaseService.checkAssignedRole(grade, classNum, studentNum, 'captain');
          isCloudApproved = (cloudRole === 'captain');
        }

        if (!isCloudApproved) {
          setErrorMessage(
            `권한 거부: ${grade}학년 ${classNum}반 ${studentNum}번 ${name} 학생은 체육교사가 지정한 [반장/체육부장] 명단에 없습니다. 사용자가 본인 권한을 직접 임의 설정할 수 없으며, 체육교사에게 권한 등록을 요청하세요.`
          );
          setIsVerifying(false);
          return;
        }

        const studentGender = classRoster.find(s => s.num === studentNum)?.gender;
        const allAssigned: ('captain' | 'council')[] = ['captain'];
        if (StorageService.isDesignatedRole(grade, classNum, studentNum, 'council')) {
          allAssigned.push('council');
        }

        const captainProfile: UserProfile = {
          grade,
          classNum,
          studentNum,
          name: name.trim(),
          gender: studentGender,
          role: 'captain',
          isSportsRep: true,
          assignedRoles: allAssigned
        };
        // Update local and firestore profile (does NOT overwrite other classes' reps)
        StorageService.setSportsRepresentative(grade, classNum, name.trim());
        StorageService.saveCurrentUser(captainProfile);
        FirebaseService.saveUserProfile(captainProfile).catch(() => {});
        onLoginSuccess(captainProfile);
        onClose();
        return;
      }

      // 4. 학생자치회 (Student Council) - 체육교사가 지정한 인원만 승인!
      if (role === 'council' || role === 'STUDENT_COUNCIL') {
        if (studentCouncilPassword !== '8650') {
          setErrorMessage('학생자치회 접근 비밀번호가 일치하지 않습니다.');
          setIsVerifying(false);
          return;
        }
        if (!name.trim()) {
          setErrorMessage('학생 성명을 선택해주세요.');
          setIsVerifying(false);
          return;
        }

        // Strict verification: Check local + Firestore
        const isLocalApproved = StorageService.isDesignatedRole(grade, classNum, studentNum, 'council');
        let isCloudApproved = isLocalApproved;
        if (!isCloudApproved) {
          const cloudRole = await FirebaseService.checkAssignedRole(grade, classNum, studentNum, 'council');
          isCloudApproved = (cloudRole === 'council');
        }

        if (!isCloudApproved) {
          setErrorMessage(
            `권한 거부: ${grade}학년 ${classNum}반 ${studentNum}번 ${name} 학생은 체육교사가 지정한 [학생자치회] 명단에 없습니다. 체육교사의 승인을 받은 자치회원만 경기 결과를 기록할 수 있습니다.`
          );
          setIsVerifying(false);
          return;
        }

        const studentGender = classRoster.find(s => s.num === studentNum)?.gender;
        const allAssigned: ('captain' | 'council')[] = ['council'];
        if (StorageService.isDesignatedRole(grade, classNum, studentNum, 'captain')) {
          allAssigned.push('captain');
        }

        const councilProfile: UserProfile = {
          grade,
          classNum,
          studentNum,
          name: name.trim(),
          gender: studentGender,
          role: 'council',
          isSportsRep: allAssigned.includes('captain'),
          assignedRoles: allAssigned
        };
        StorageService.saveCurrentUser(councilProfile);
        FirebaseService.saveUserProfile(councilProfile).catch(() => {});
        onLoginSuccess(councilProfile);
        onClose();
        return;
      }

      setErrorMessage('역할을 선택해주세요.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#12192B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0A0F1D] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E2FF00]/10 border border-[#E2FF00]/30 flex items-center justify-center text-[#E2FF00]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">리그 운영 및 사용자 로그인</h2>
              <p className="text-xs text-white/50">체육교사가 지정한 인원만 명단 및 경기결과를 기록합니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          
          {/* Role Selector Grid: 4 roles */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2 font-mono uppercase tracking-wider">
              로그인 역할 선택 (체육교사 지정 검증제)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              
              {/* 1. 반장 / 체육부장 */}
              <button
                type="button"
                onClick={() => { setRole('captain'); setErrorMessage(''); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                  role === 'captain' || role === 'SPORTS_REP'
                    ? 'bg-[#E2FF00] border-[#E2FF00] text-black shadow-[0_0_10px_rgba(226,255,0,0.3)]'
                    : 'bg-[#0A0F1D] border-white/10 text-white/70 hover:border-white/20'
                }`}
              >
                <UserCheck className={`w-5 h-5 mb-1.5 ${role === 'captain' || role === 'SPORTS_REP' ? 'text-black' : 'text-[#E2FF00]'}`} />
                <div className="text-xs font-bold leading-tight">반장/체육부장</div>
                <div className={`text-[10px] mt-0.5 ${role === 'captain' || role === 'SPORTS_REP' ? 'text-black/70 font-semibold' : 'text-white/40'}`}>
                  출전명단 작성
                </div>
              </button>

              {/* 2. 학생자치회 */}
              <button
                type="button"
                onClick={() => { setRole('council'); setErrorMessage(''); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                  role === 'council' || role === 'STUDENT_COUNCIL'
                    ? 'bg-[#E2FF00] border-[#E2FF00] text-black shadow-[0_0_10px_rgba(226,255,0,0.3)]'
                    : 'bg-[#0A0F1D] border-white/10 text-white/70 hover:border-white/20'
                }`}
              >
                <Activity className={`w-5 h-5 mb-1.5 ${role === 'council' || role === 'STUDENT_COUNCIL' ? 'text-black' : 'text-[#E2FF00]'}`} />
                <div className="text-xs font-bold leading-tight">학생자치회</div>
                <div className={`text-[10px] mt-0.5 ${role === 'council' || role === 'STUDENT_COUNCIL' ? 'text-black/70 font-semibold' : 'text-white/40'}`}>
                  결과·점수 기록
                </div>
              </button>

              {/* 3. 체육교사 */}
              <button
                type="button"
                onClick={() => { setRole('admin'); setErrorMessage(''); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                  role === 'admin' || role === 'TEACHER'
                    ? 'bg-[#E2FF00] border-[#E2FF00] text-black shadow-[0_0_10px_rgba(226,255,0,0.3)]'
                    : 'bg-[#0A0F1D] border-white/10 text-white/70 hover:border-white/20'
                }`}
              >
                <ShieldCheck className={`w-5 h-5 mb-1.5 ${role === 'admin' || role === 'TEACHER' ? 'text-black' : 'text-[#E2FF00]'}`} />
                <div className="text-xs font-bold leading-tight">체육교사</div>
                <div className={`text-[10px] mt-0.5 ${role === 'admin' || role === 'TEACHER' ? 'text-black/70 font-semibold' : 'text-white/40'}`}>
                  권한부여·총괄
                </div>
              </button>

              {/* 4. 일반 학생 */}
              <button
                type="button"
                onClick={() => { setRole('student'); setErrorMessage(''); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                  role === 'student' || role === 'STUDENT'
                    ? 'bg-[#E2FF00] border-[#E2FF00] text-black shadow-[0_0_10px_rgba(226,255,0,0.3)]'
                    : 'bg-[#0A0F1D] border-white/10 text-white/70 hover:border-white/20'
                }`}
              >
                <Eye className={`w-5 h-5 mb-1.5 ${role === 'student' || role === 'STUDENT' ? 'text-black' : 'text-[#E2FF00]'}`} />
                <div className="text-xs font-bold leading-tight">일반 학생</div>
                <div className={`text-[10px] mt-0.5 ${role === 'student' || role === 'STUDENT' ? 'text-black/70 font-semibold' : 'text-white/40'}`}>
                  조회 전용 모드
                </div>
              </button>
            </div>
          </div>

          {/* Quick Selector: Designated Members List by Teacher */}
          {role === 'captain' && designatedCaptains.length > 0 && (
            <div className="p-3 rounded-xl bg-[#0A0F1D] border border-[#E2FF00]/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#E2FF00] flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" /> 체육교사 지정 반장/체육부장 빠른 선택:
                </span>
                <span className="text-[10px] text-white/40 font-mono">총 {designatedCaptains.length}명 승인됨</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {designatedCaptains.map(c => {
                  const isSelected = grade === c.grade && classNum === c.classNum && studentNum === c.studentNum;
                  return (
                    <button
                      key={c.id || `${c.grade}-${c.classNum}-${c.studentNum}`}
                      type="button"
                      onClick={() => handleQuickSelect(c)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#E2FF00] text-black font-bold border-[#E2FF00]'
                          : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <span className="font-mono text-[11px] text-white/60">{c.grade}-{c.classNum}</span>
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {role === 'council' && designatedCouncil.length > 0 && (
            <div className="p-3 rounded-xl bg-[#0A0F1D] border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> 체육교사 지정 학생자치회 빠른 선택:
                </span>
                <span className="text-[10px] text-white/40 font-mono">총 {designatedCouncil.length}명 승인됨</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {designatedCouncil.map(c => {
                  const isSelected = grade === c.grade && classNum === c.classNum && studentNum === c.studentNum;
                  return (
                    <button
                      key={c.id || `${c.grade}-${c.classNum}-${c.studentNum}`}
                      type="button"
                      onClick={() => handleQuickSelect(c)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-purple-500 text-white font-bold border-purple-400'
                          : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <span className="font-mono text-[11px] text-white/60">{c.grade}-{c.classNum}</span>
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Role Status Badge for Selected Student */}
          {role === 'captain' && (
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              isCurrentlyDesignatedCaptain
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                {isCurrentlyDesignatedCaptain ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>
                  {isCurrentlyDesignatedCaptain
                    ? `[체육교사 승인 완료] ${grade}학년 ${classNum}반 ${name} 학생은 반장/체육부장 권한이 부여되어 있습니다.`
                    : `[미지정 학생] ${grade}학년 ${classNum}반 ${name} 학생은 반장/체육부장으로 지정되지 않아 로그인할 수 없습니다.`}
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold shrink-0 ml-2 ${
                isCurrentlyDesignatedCaptain ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {isCurrentlyDesignatedCaptain ? '승인됨' : '권한 없음'}
              </span>
            </div>
          )}

          {role === 'council' && (
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              isCurrentlyDesignatedCouncil
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                {isCurrentlyDesignatedCouncil ? (
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>
                  {isCurrentlyDesignatedCouncil
                    ? `[체육교사 승인 완료] ${grade}학년 ${classNum}반 ${name} 학생은 학생자치회 권한이 부여되어 있습니다.`
                    : `[미지정 학생] ${grade}학년 ${classNum}반 ${name} 학생은 학생자치회로 지정되지 않아 결과 입력 권한이 없습니다.`}
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold shrink-0 ml-2 ${
                isCurrentlyDesignatedCouncil ? 'bg-purple-500/20 text-purple-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {isCurrentlyDesignatedCouncil ? '승인됨' : '권한 없음'}
              </span>
            </div>
          )}

          {/* Student Council Password Input */}
          {(role === 'council' || role === 'STUDENT_COUNCIL') && (
            <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5 font-mono">
                  <Lock className="w-3.5 h-3.5" /> 학생자치회 비밀번호 입력
                </label>
              </div>
              <div className="relative">
                <input
                  type={showCouncilPassword ? "text" : "password"}
                  value={studentCouncilPassword}
                  onChange={(e) => setStudentCouncilPassword(e.target.value)}
                  placeholder="학생자치회 비밀번호 (••••)"
                  autoComplete="current-password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-lg bg-[#12192B] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-400 text-sm font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowCouncilPassword(!showCouncilPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition"
                  title={showCouncilPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                >
                  {showCouncilPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Teacher Password Input */}
          {(role === 'admin' || role === 'TEACHER') && (
            <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-[#E2FF00]/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#E2FF00] flex items-center gap-1.5 font-mono">
                  <Lock className="w-3.5 h-3.5" /> 체육교사 관리자 비밀번호
                </label>
              </div>
              <div className="relative">
                <input
                  type={showTeacherPassword ? "text" : "password"}
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  placeholder="체육교사 비밀번호 (••••)"
                  autoComplete="current-password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-lg bg-[#12192B] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#E2FF00] text-sm font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowTeacherPassword(!showTeacherPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition"
                  title={showTeacherPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                >
                  {showTeacherPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Student Selector (Grade, Class, Student Num) */}
          {role !== 'admin' && role !== 'TEACHER' && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1.5 font-mono">
                    GRADE (학년)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[1, 2].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGrade(g as GradeLevel)}
                        className={`py-2 rounded-lg text-xs font-bold border transition ${
                          grade === g
                            ? 'bg-white/10 border-white/40 text-white'
                            : 'bg-[#0A0F1D] border-white/5 text-white/50 hover:border-white/10'
                        }`}
                      >
                        {g}학년
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1.5 font-mono">
                    CLASS (반)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[1, 2].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setClassNum(c)}
                        className={`py-2 rounded-lg text-xs font-bold border transition ${
                          classNum === c
                            ? 'bg-white/10 border-white/40 text-white'
                            : 'bg-[#0A0F1D] border-white/5 text-white/50 hover:border-white/10'
                        }`}
                      >
                        {c}반
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Student Number Selector */}
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5 font-mono">
                  {role === 'captain'
                    ? '반장 / 체육부장 본인 선택'
                    : role === 'council'
                    ? '학생자치회 본인 선택'
                    : '학생 본인 선택'}
                </label>
                <select
                  value={studentNum}
                  onChange={(e) => setStudentNum(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg bg-[#0A0F1D] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#E2FF00]"
                >
                  {classRoster.map(s => {
                    const isCouncil = assignedRoles.some(r => r.grade === grade && r.classNum === classNum && r.studentNum === s.num && r.role === 'council');
                    const isCaptain = assignedRoles.some(r => r.grade === grade && r.classNum === classNum && r.studentNum === s.num && r.role === 'captain');
                    let tag = '';
                    if (isCouncil && isCaptain) tag = ' ⭐ [학생자치회 & 반장/체육부장]';
                    else if (isCouncil) tag = ' 🔹 [학생자치회]';
                    else if (isCaptain) tag = ' 🏅 [반장/체육부장]';

                    return (
                      <option key={s.num} value={s.num}>
                        {s.num}번 {s.name} ({s.gender === 'M' ? '남' : '여'}){tag}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Name Display */}
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1 font-mono">
                  성명 확인
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0F1D] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#E2FF00]"
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className={`w-full py-3.5 rounded-xl font-extrabold text-sm transition shadow-[0_0_15px_rgba(226,255,0,0.2)] mt-2 flex items-center justify-center gap-2 ${
              role === 'captain' && !isCurrentlyDesignatedCaptain
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-not-allowed'
                : role === 'council' && !isCurrentlyDesignatedCouncil
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-not-allowed'
                : 'bg-[#E2FF00] hover:bg-[#c9e600] text-black active:scale-[0.99]'
            }`}
          >
            {isVerifying ? (
              <span>체육교사 지정 권한 확인 중...</span>
            ) : role === 'captain' && !isCurrentlyDesignatedCaptain ? (
              <span>반장/체육부장 미지정 (로그인 불가)</span>
            ) : role === 'council' && !isCurrentlyDesignatedCouncil ? (
              <span>학생자치회 미지정 (로그인 불가)</span>
            ) : (
              <span>로그인 완료하기</span>
            )}
          </button>

          <p className="text-[11px] text-center text-white/40 leading-relaxed pt-1">
            * 체육교사가 지정한 인원만 출전명단 및 경기결과를 기록할 수 있으며, 일반 학생은 모든 경기 일정과 결과를 실시간으로 열람 가능합니다.
          </p>
        </form>

      </div>
    </div>
  );
};
