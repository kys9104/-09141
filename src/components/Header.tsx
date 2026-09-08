import React from 'react';
import { 
  Trophy, 
  Calendar, 
  BarChart3, 
  ShieldCheck, 
  FileSpreadsheet, 
  LogOut, 
  LogIn, 
  Zap,
  Activity,
  UserCheck,
  ClipboardList
} from 'lucide-react';
import { 
  UserProfile, 
  isAdminRole, 
  isCaptainRole, 
  isCouncilRole 
} from '../types';

interface HeaderProps {
  currentUser: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenGoogleSheets: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenLogin,
  onLogout,
  onOpenGoogleSheets
}) => {
  const isAdmin = isAdminRole(currentUser?.role);
  const isCaptain = isCaptainRole(currentUser?.role);
  const isCouncil = isCouncilRole(currentUser?.role);

  const getRoleBadge = () => {
    if (!currentUser) return null;
    if (isAdmin) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <ShieldCheck className="w-3.5 h-3.5" /> 체육교사 (Admin)
        </span>
      );
    }
    if (isCouncil) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
          <Activity className="w-3.5 h-3.5" /> 학생자치회 (Council)
        </span>
      );
    }
    if (isCaptain) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E2FF00]/20 text-[#E2FF00] border border-[#E2FF00]/30">
          <UserCheck className="w-3.5 h-3.5" /> 반장/체육부장 (Captain)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/80 border border-white/10">
        일반 학생 (Student)
      </span>
    );
  };

  // Construct dynamic nav items according to the 4-tier roles
  const navItems = [
    { id: 'STANDINGS', label: '리그 순위표', icon: Trophy },
    { id: 'SCHEDULE', label: '경기 일정 / 결과', icon: Calendar },
    { id: 'STATS', label: '학급별 종합 경기 지표', icon: BarChart3 },
    // Captain & Admin only: 출전명단 작성
    ...((isCaptain || isAdmin) ? [
      { id: 'ROSTER_SUBMIT', label: '출전명단 작성', icon: ClipboardList, highlightCaptain: true }
    ] : []),
    // Admin only or always visible with teacher badge
    { id: 'TEACHER', label: '교사 관리자 대시보드', icon: ShieldCheck, highlightAdmin: true }
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#12192B] border-b border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5 cursor-pointer select-none" onClick={() => setActiveTab('STANDINGS')}>
            <div className="w-10 h-10 bg-[#E2FF00] rounded-xl flex items-center justify-center shadow-[0_0_12px_rgba(226,255,0,0.35)] shrink-0">
              <Zap className="w-5 h-5 text-black fill-black" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                신안해양과학고 <span className="text-[#E2FF00]">배드민턴 리그</span>
              </h1>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono">
                BADMINTON LEAGUE MANAGEMENT v2.0
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Google Sheets Sync Quick Button */}
            <button
              onClick={onOpenGoogleSheets}
              id="google-sheets-sync-btn"
              title="Google 스프레드시트 실시간 연동"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">구글 시트 연동</span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-3.5 py-1.5 border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-[#E2FF00] shadow-[0_0_8px_#E2FF00] animate-pulse"></div>
                  <span className="text-xs font-semibold text-white/90 hidden md:inline">
                    {currentUser.role === 'admin' 
                      ? '체육교사' 
                      : (currentUser.grade > 0 ? `${currentUser.grade}학년 ${currentUser.classNum}반 ${currentUser.name}` : currentUser.name)}
                  </span>
                  <div className="scale-90 origin-right">{getRoleBadge()}</div>
                </div>

                <button
                  onClick={onLogout}
                  id="logout-btn"
                  title="로그아웃"
                  className="text-xs text-white/60 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                id="login-btn"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#E2FF00] hover:bg-[#d5f000] text-black shadow-[0_0_15px_rgba(226,255,0,0.25)] transition active:scale-95"
              >
                <LogIn className="w-4 h-4 text-black" />
                <span>로그인</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 scrollbar-none text-xs sm:text-sm border-t border-white/5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id.toLowerCase()}-btn`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#E2FF00]/20 text-[#E2FF00] rounded-lg border border-[#E2FF00]/40 font-bold shadow-[0_0_10px_rgba(226,255,0,0.15)]'
                    : item.highlightAdmin
                    ? 'text-amber-300 hover:bg-amber-500/10 border border-amber-500/20'
                    : item.highlightCaptain
                    ? 'text-[#E2FF00] hover:bg-[#E2FF00]/10 border border-[#E2FF00]/20 font-semibold'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${
                  isActive 
                    ? 'text-[#E2FF00]' 
                    : item.highlightAdmin 
                    ? 'text-amber-400' 
                    : item.highlightCaptain
                    ? 'text-[#E2FF00]'
                    : 'text-white/50'
                }`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
