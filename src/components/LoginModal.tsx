import React, { useState } from 'react';
import { 
  X, 
  User, 
  ShieldCheck, 
  UserCheck, 
  Activity, 
  Lock, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { GradeLevel, UserProfile, UserRole } from '../types';
import { StorageService } from '../services/storageService';

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
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [isSportsRep, setIsSportsRep] = useState<boolean>(false);
  const [teacherPassword, setTeacherPassword] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (role === 'TEACHER') {
      if (teacherPassword !== '4161') {
        setErrorMessage('체육교사 접근 비밀번호가 일치하지 않습니다.');
        return;
      }
      const teacherProfile: UserProfile = {
        grade: 1,
        classNum: 1,
        studentNum: 0,
        name: name.trim() || '체육교사',
        role: 'TEACHER'
      };
      StorageService.saveCurrentUser(teacherProfile);
      onLoginSuccess(teacherProfile);
      onClose();
      return;
    }

    if (!name.trim()) {
      setErrorMessage('이름을 입력해주세요.');
      return;
    }

    let finalRole: UserRole = role;
    if (isSportsRep) {
      finalRole = 'SPORTS_REP';
      StorageService.setSportsRepresentative(grade, classNum, name.trim());
    }

    const userProfile: UserProfile = {
      grade,
      classNum,
      studentNum,
      name: name.trim(),
      role: finalRole,
      isSportsRep
    };

    StorageService.saveCurrentUser(userProfile);
    onLoginSuccess(userProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#12192B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0A0F1D] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E2FF00]/10 border border-[#E2FF00]/30 flex items-center justify-center text-[#E2FF00]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">리그전 사용자 로그인</h2>
              <p className="text-xs text-white/50">학년, 반, 번호, 이름 및 권한을 선택하세요</p>
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
          
          {/* Role Selector Grid */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2 font-mono uppercase tracking-wider">
              USER ROLE SELECT
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setRole('STUDENT'); setIsSportsRep(false); }}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold text-left transition ${
                  role === 'STUDENT' && !isSportsRep
                    ? 'bg-[#E2FF00] border-[#E2FF00] text-black shadow-[0_0_10px_rgba(226,255,0,0.3)]'
                    : 'bg-[#0A0F1D] border-white/10 text-white/70 hover:border-white/20'
                }`}
              >
                <User className={`w-4 h-4 ${role === 'STUDENT' && !isSportsRep ? 'text-black' : 'text-[#E2FF00]'}`} />
                <div>
                  <div>일반 학생</div>
                  <div className={`text-[10px] font-normal ${role === 'STUDENT' && !isSportsRep ? 'text-black/70' : 'text-white/40'}`}>조회 및 소감문 작성</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setRole('SPORTS_REP'); setIsSportsRep(true); }}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold text-left transition ${
                  isSportsRep
                    ? 'bg-[#E2FF00] border-[#E2FF00] text-black shadow-[0_0_10px_rgba(226,255,0,0.3)]'
                    : 'bg-[#0A0F1D] border-white/10 text-white/70 hover:border-white/20'
                }`}
              >
                <UserCheck className={`w-4 h-4 ${isSportsRep ? 'text-black' : 'text-[#E2FF00]'}`} />
                <div>
                  <div>체육부장 / 반장</div>
                  <div className={`text-[10px] font-normal ${isSportsRep ? 'text-black/70' : 'text-white/40'}`}>출전 선수 명단 작성</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setRole('STUDENT_COUNCIL'); setIsSportsRep(false); }}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold text-left transition ${
                  role === 'STUDENT_COUNCIL'
                    ? 'bg-[#E2FF00] border-[#E2FF00] text-black shadow-[0_0_10px_rgba(226,255,0,0.3)]'
                    : 'bg-[#0A0F1D] border-white/10 text-white/70 hover:border-white/20'
                }`}
              >
                <Activity className={`w-4 h-4 ${role === 'STUDENT_COUNCIL' ? 'text-black' : 'text-[#E2FF00]'}`} />
                <div>
                  <div>학생자치회</div>
                  <div className={`text-[10px] font-normal ${role === 'STUDENT_COUNCIL' ? 'text-black/70' : 'text-white/40'}`}>경기 승패/점수 입력</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setRole('TEACHER'); setIsSportsRep(false); }}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold text-left transition ${
                  role === 'TEACHER'
                    ? 'bg-[#E2FF00] border-[#E2FF00] text-black shadow-[0_0_10px_rgba(226,255,0,0.3)]'
                    : 'bg-[#0A0F1D] border-white/10 text-white/70 hover:border-white/20'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 ${role === 'TEACHER' ? 'text-black' : 'text-[#E2FF00]'}`} />
                <div>
                  <div>체육교사</div>
                  <div className={`text-[10px] font-normal ${role === 'TEACHER' ? 'text-black/70' : 'text-white/40'}`}>전체 관리·생기부 세특</div>
                </div>
              </button>
            </div>
          </div>

          {/* Teacher Password Input when Teacher selected */}
          {role === 'TEACHER' && (
            <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-[#E2FF00]/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#E2FF00] flex items-center gap-1.5 font-mono">
                  <Lock className="w-3.5 h-3.5" /> TEACHER PASSCODE
                </label>
              </div>
              <input
                type="password"
                id="teacher-password-input"
                value={teacherPassword}
                onChange={(e) => setTeacherPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full px-3.5 py-2 rounded-lg bg-[#12192B] border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-[#E2FF00] text-sm font-mono"
              />
            </div>
          )}

          {/* Student details (Grade, Class, Number, Name) */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Grade dropdown (1, 2) */}
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                학년
              </label>
              <select
                id="grade-select"
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value) as GradeLevel)}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0F1D] border border-white/10 text-white font-medium focus:outline-none focus:border-[#E2FF00] text-sm"
              >
                <option value={1}>1학년</option>
                <option value={2}>2학년</option>
              </select>
            </div>

            {/* Class dropdown (1, 2) */}
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                반
              </label>
              <select
                id="class-select"
                value={classNum}
                onChange={(e) => setClassNum(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0F1D] border border-white/10 text-white font-medium focus:outline-none focus:border-[#E2FF00] text-sm"
              >
                <option value={1}>1반</option>
                <option value={2}>2반</option>
              </select>
            </div>

            {/* Number dropdown (1 ~ 21) */}
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 font-mono">
                번호 (1~21)
              </label>
              <select
                id="student-num-select"
                value={studentNum}
                onChange={(e) => setStudentNum(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0F1D] border border-white/10 text-white font-medium focus:outline-none focus:border-[#E2FF00] text-sm font-mono"
              >
                {Array.from({ length: 21 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}번
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Name Text Input */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">
              이름 (직접 입력)
            </label>
            <input
              type="text"
              id="student-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 김민준, 박태양, 홍길동"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0F1D] border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-[#E2FF00] text-sm font-medium"
            />
          </div>

          {/* Class Sports Representative designation checkbox */}
          <div className="pt-1">
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#0A0F1D] border border-white/10 cursor-pointer hover:border-white/20 transition">
              <input
                type="checkbox"
                id="sports-rep-checkbox"
                checked={isSportsRep}
                onChange={(e) => {
                  setIsSportsRep(e.target.checked);
                  if (e.target.checked) setRole('SPORTS_REP');
                  else if (role === 'SPORTS_REP') setRole('STUDENT');
                }}
                className="w-4 h-4 rounded text-[#E2FF00] focus:ring-0 bg-[#12192B] border-white/20 accent-[#E2FF00]"
              />
              <div>
                <div className="text-xs font-bold text-white">
                  해당 학급({grade}학년 {classNum}반)의 <span className="text-[#E2FF00] font-bold">체육부장 / 반장</span>입니다
                </div>
                <div className="text-[11px] text-white/40">
                  체크 시 라운드별 출전 선수 명단을 작성 및 제출할 수 있습니다.
                </div>
              </div>
            </label>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl text-xs font-bold text-white/70 bg-white/5 hover:bg-white/10 transition"
            >
              취소
            </button>
            <button
              type="submit"
              id="login-submit-btn"
              className="w-2/3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-black bg-[#E2FF00] hover:opacity-90 shadow-[0_0_12px_rgba(226,255,0,0.3)] transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>로그인 완료</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
