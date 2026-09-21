import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  UserCheck, 
  Activity, 
  Lock, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { GradeLevel, UserProfile, UserRole } from '../types';
import { StorageService } from '../services/storageService';
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
  // Default to student council login
  const [role, setRole] = useState<UserRole>('council');
  const [teacherPassword, setTeacherPassword] = useState<string>('');
  const [studentCouncilPassword, setStudentCouncilPassword] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [detectedAssignedRole, setDetectedAssignedRole] = useState<'captain' | 'council' | null>(null);

  const currentClassKey = `${grade}-${classNum}`;
  const classRoster = OFFICIAL_STUDENTS_ROSTER[currentClassKey] || [];

  // Auto-sync name and check assigned role when grade/class/studentNum changes
  useEffect(() => {
    if (role === 'admin' || role === 'TEACHER') {
      setName('체육교사');
      setDetectedAssignedRole(null);
    } else {
      const match = classRoster.find(s => s.num === studentNum);
      if (match) {
        setName(match.name);
      } else if (classRoster.length > 0) {
        setStudentNum(classRoster[0].num);
        setName(classRoster[0].name);
      }

      // Check if this student was assigned a role by the teacher (Local + Firestore)
      const assignedLocal = StorageService.findAssignedRole(grade, classNum, studentNum);
      if (assignedLocal) {
        setDetectedAssignedRole(assignedLocal.role);
        if (assignedLocal.role === 'council') {
          setRole('council');
        } else if (assignedLocal.role === 'captain') {
          setRole('captain');
        }
      } else {
        FirebaseService.checkAssignedRole(grade, classNum, studentNum).then(r => {
          if (r === 'council' || r === 'captain') {
            setDetectedAssignedRole(r);
            if (r === 'council') {
              setRole('council');
            } else if (r === 'captain') {
              setRole('captain');
            }
          } else {
            setDetectedAssignedRole(null);
          }
        });
      }
    }
  }, [grade, classNum, studentNum, role]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // 1. 체육교사 (Teacher)
    if (role === 'admin' || role === 'TEACHER') {
      if (teacherPassword !== '4161') {
        setErrorMessage('체육교사 접근 비밀번호(4161)가 일치하지 않습니다.');
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
      FirebaseService.saveUserProfile(teacherProfile);
      onLoginSuccess(teacherProfile);
      onClose();
      return;
    }

    // 2. 학생자치회 (Student Council)
    if (role === 'council' || role === 'STUDENT_COUNCIL') {
      if (studentCouncilPassword !== '8650') {
        setErrorMessage('학생자치회 접근 비밀번호(8650)가 일치하지 않습니다.');
        return;
      }
      if (!name.trim()) {
        setErrorMessage('학생 성명을 선택하거나 입력해주세요.');
        return;
      }
      const studentGender = classRoster.find(s => s.num === studentNum)?.gender;
      const councilProfile: UserProfile = {
        grade,
        classNum,
        studentNum,
        name: name.trim(),
        gender: studentGender,
        role: 'council'
      };
      StorageService.saveCurrentUser(councilProfile);
      FirebaseService.saveUserProfile(councilProfile);
      onLoginSuccess(councilProfile);
      onClose();
      return;
    }

    // 3. 반장 / 체육부장 (Captain / Sports Representative)
    if (role === 'captain' || role === 'SPORTS_REP') {
      if (!name.trim()) {
        setErrorMessage('학생 성명을 선택하거나 입력해주세요.');
        return;
      }
      StorageService.setSportsRepresentative(grade, classNum, name.trim());
      const studentGender = classRoster.find(s => s.num === studentNum)?.gender;
      const captainProfile: UserProfile = {
        grade,
        classNum,
        studentNum,
        name: name.trim(),
        gender: studentGender,
        role: 'captain',
        isSportsRep: true
      };
      StorageService.saveCurrentUser(captainProfile);
      FirebaseService.saveUserProfile(captainProfile);
      onLoginSuccess(captainProfile);
      onClose();
      return;
    }

    setErrorMessage('학생자치회, 반장/체육부장, 체육교사 역할 중 하나를 선택해주세요.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#12192B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0A0F1D] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E2FF00]/10 border border-[#E2FF00]/30 flex items-center justify-center text-[#E2FF00]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">경기 운영진 로그인</h2>
              <p className="text-xs text-white/50">학생자치회 · 반장/체육부장 · 체육교사 전용</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Role Selector Grid: Only 3 roles (Council, Captain, Teacher) */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2 font-mono uppercase tracking-wider">
              운영 권한 선택 (3개 그룹)
            </label>
            <div className="grid grid-cols-3 gap-2">
              
              {/* 1. 학생자치회 */}
              <button
                type="button"
                onClick={() => setRole('council')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                  role === 'council' || role === 'STUDENT_COUNCIL'
                    ? 'bg-[#E2FF00] border-[#E2FF00] text-black shadow-[0_0_10px_rgba(226,255,0,0.3)]'
                    : 'bg-[#0A0F1D] border-white/10 text-white/70 hover:border-white/20'
                }`}
              >
                <Activity className={`w-5 h-5 mb-1.5 ${role === 'council' || role === 'STUDENT_COUNCIL' ? 'text-black' : 'text-[#E2FF00]'}`} />
                <div className="text-xs font-bold leading-tight">학생자치회</div>
                <div className={`text-[10px] mt-0.5 ${role === 'council' || role === 'STUDENT_COUNCIL' ? 'text-black/70 font-semibold' : 'text-white/40'}`}>
                  결과·점수 입력
                </div>
              </button>

              {/* 2. 반장 / 체육부장 */}
              <button
                type="button"
                onClick={() => setRole('captain')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                  role === 'captain' || role === 'SPORTS_REP'
                    ? 'bg-[#E2FF00] border-[#E2FF00] text-black shadow-[0_0_10px_rgba(226,255,0,0.3)]'
                    : 'bg-[#0A0F1D] border-white/10 text-white/70 hover:border-white/20'
                }`}
              >
                <UserCheck className={`w-5 h-5 mb-1.5 ${role === 'captain' || role === 'SPORTS_REP' ? 'text-black' : 'text-[#E2FF00]'}`} />
                <div className="text-xs font-bold leading-tight">반장/체육부장</div>
                <div className={`text-[10px] mt-0.5 ${role === 'captain' || role === 'SPORTS_REP' ? 'text-black/70 font-semibold' : 'text-white/40'}`}>
                  명단작성·결과입력
                </div>
              </button>

              {/* 3. 체육교사 */}
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                  role === 'admin' || role === 'TEACHER'
                    ? 'bg-[#E2FF00] border-[#E2FF00] text-black shadow-[0_0_10px_rgba(226,255,0,0.3)]'
                    : 'bg-[#0A0F1D] border-white/10 text-white/70 hover:border-white/20'
                }`}
              >
                <ShieldCheck className={`w-5 h-5 mb-1.5 ${role === 'admin' || role === 'TEACHER' ? 'text-black' : 'text-[#E2FF00]'}`} />
                <div className="text-xs font-bold leading-tight">체육교사</div>
                <div className={`text-[10px] mt-0.5 ${role === 'admin' || role === 'TEACHER' ? 'text-black/70 font-semibold' : 'text-white/40'}`}>
                  총괄 관리·초기화
                </div>
              </button>
            </div>
          </div>

          {/* Assigned Role Notification Badge */}
          {detectedAssignedRole && role !== 'admin' && role !== 'TEACHER' && (
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between font-bold ${
              detectedAssignedRole === 'council'
                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-200'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>체육교사에 의해 [{detectedAssignedRole === 'council' ? '학생자치회' : '반장/체육부장'}] 권한이 승인된 학생입니다.</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                승인됨
              </span>
            </div>
          )}

          {/* Student Council Password Input */}
          {(role === 'council' || role === 'STUDENT_COUNCIL') && (
            <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-[#E2FF00]/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#E2FF00] flex items-center gap-1.5 font-mono">
                  <Lock className="w-3.5 h-3.5" /> 학생자치회 비밀번호 (8650)
                </label>
              </div>
              <input
                type="password"
                id="student-council-password-input"
                value={studentCouncilPassword}
                onChange={(e) => setStudentCouncilPassword(e.target.value)}
                placeholder="비밀번호 8650 입력"
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#12192B] border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-[#E2FF00] text-sm font-mono tracking-widest"
              />
            </div>
          )}

          {/* Teacher Password Input */}
          {(role === 'admin' || role === 'TEACHER') && (
            <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-[#E2FF00]/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#E2FF00] flex items-center gap-1.5 font-mono">
                  <Lock className="w-3.5 h-3.5" /> 체육교사 관리자 비밀번호 (4161)
                </label>
              </div>
              <input
                type="password"
                id="teacher-password-input"
                value={teacherPassword}
                onChange={(e) => setTeacherPassword(e.target.value)}
                placeholder="비밀번호 4161 입력"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#12192B] border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-[#E2FF00] text-sm font-mono tracking-widest"
              />
            </div>
          )}

          {/* Grade and Class Selectors (for captain and council) */}
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
                  {role === 'captain' ? '반장 / 체육부장 본인 선택' : '학생자치회 담당자 본인 선택'}
                </label>
                <select
                  value={studentNum}
                  onChange={(e) => setStudentNum(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0F1D] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#E2FF00]"
                >
                  {classRoster.map(s => (
                    <option key={s.num} value={s.num}>
                      {s.num}번 {s.name} ({s.gender === 'M' ? '남' : '여'})
                    </option>
                  ))}
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
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#E2FF00] hover:bg-[#c9e600] text-black font-extrabold text-sm transition shadow-[0_0_15px_rgba(226,255,0,0.2)] mt-2"
          >
            로그인하여 시작하기
          </button>

          <p className="text-[11px] text-center text-white/40 leading-relaxed pt-1">
            * 일반 학생은 로그인 없이도 경기 일정, 순위표, 대진표 및 세부 경기결과를 자유롭게 열람할 수 있습니다.
          </p>
        </form>

      </div>
    </div>
  );
};
