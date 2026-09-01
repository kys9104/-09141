import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StandingsView } from './components/StandingsView';
import { ScheduleRoundView } from './components/ScheduleRoundView';
import { StatsMvpView } from './components/StatsMvpView';
import { PersonalDiaryView } from './components/PersonalDiaryView';
import { TeacherDashboard } from './components/TeacherDashboard';
import { LoginModal } from './components/LoginModal';
import { LineupSubmissionModal } from './components/LineupSubmissionModal';
import { MatchResultEntryModal } from './components/MatchResultEntryModal';
import { LiveScoreModal } from './components/LiveScoreModal';
import { GASIntegrationModal } from './components/GASIntegrationModal';

import { UserProfile, MatchCategory } from './types';
import { StorageService } from './services/storageService';

export default function App() {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<string>('STANDINGS');

  // User auth state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(StorageService.getUserSession());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Lineup modal state
  const [lineupModalState, setLineupModalState] = useState<{
    isOpen: boolean;
    tieMatchId: string | null;
    roundId: number;
  }>({
    isOpen: false,
    tieMatchId: null,
    roundId: 1
  });

  // Result entry modal state
  const [resultEntryState, setResultEntryState] = useState<{
    isOpen: boolean;
    tieMatchId: string | null;
    subMatchId: string | null;
  }>({
    isOpen: false,
    tieMatchId: null,
    subMatchId: null
  });

  // Live Score modal state
  const [liveScoreState, setLiveScoreState] = useState<{
    isOpen: boolean;
    tieMatchId: string | null;
    subMatchId: string | null;
  }>({
    isOpen: false,
    tieMatchId: null,
    subMatchId: null
  });

  // GAS Integration modal state
  const [isGASModalOpen, setIsGASModalOpen] = useState<boolean>(false);

  // Diary quick trigger state
  const [diaryTrigger, setDiaryTrigger] = useState<{
    roundId: number;
    category: MatchCategory;
    opponentClass: number;
  } | null>(null);

  // Sync state trigger
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    // If teacher, maybe redirect to teacher tab
    if (user.role === 'TEACHER') {
      setActiveTab('TEACHER');
    }
  };

  const handleLogout = () => {
    StorageService.clearUserSession();
    setCurrentUser(null);
  };

  const handleOpenLineupModal = (tieMatchId: string, roundId: number) => {
    setLineupModalState({
      isOpen: true,
      tieMatchId,
      roundId
    });
  };

  const handleOpenResultEntry = (tieMatchId: string, subMatchId: string) => {
    setResultEntryState({
      isOpen: true,
      tieMatchId,
      subMatchId
    });
  };

  const handleOpenLiveScore = (tieMatchId: string, subMatchId: string) => {
    setLiveScoreState({
      isOpen: true,
      tieMatchId,
      subMatchId
    });
  };

  const handleOpenDiaryModal = (roundId: number, category: MatchCategory, opponentClass: number) => {
    setDiaryTrigger({ roundId, category, opponentClass });
    setActiveTab('DIARY');
  };

  const triggerRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-white flex flex-col font-sans selection:bg-[#E2FF00] selection:text-black antialiased">
      
      {/* Top Main Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onOpenGAS={() => setIsGASModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">
        
        {/* TAB 1: STANDINGS */}
        {activeTab === 'STANDINGS' && (
          <StandingsView
            key={`standings-${refreshKey}`}
            onOpenSchedule={() => setActiveTab('SCHEDULE')}
          />
        )}

        {/* TAB 2: SCHEDULE & ROUNDS */}
        {activeTab === 'SCHEDULE' && (
          <ScheduleRoundView
            key={`schedule-${refreshKey}`}
            currentUser={currentUser}
            onOpenLineupModal={handleOpenLineupModal}
            onOpenResultEntryModal={handleOpenResultEntry}
            onOpenLiveScoreModal={handleOpenLiveScore}
            onOpenDiaryModal={handleOpenDiaryModal}
            onResultDeleted={triggerRefresh}
          />
        )}

        {/* TAB 3: STATS & MVP */}
        {activeTab === 'STATS' && (
          <StatsMvpView key={`stats-${refreshKey}`} />
        )}

        {/* TAB 4: PERSONAL DIARY & REFLECTIONS */}
        {activeTab === 'DIARY' && (
          <PersonalDiaryView
            key={`diary-${refreshKey}`}
            currentUser={currentUser}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {/* TAB 5: TEACHER DASHBOARD */}
        {activeTab === 'TEACHER' && (
          <TeacherDashboard
            key={`teacher-${refreshKey}`}
            currentUser={currentUser}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onOpenGAS={() => setIsGASModalOpen(true)}
          />
        )}
      </main>

      {/* Modals Container */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <LineupSubmissionModal
        isOpen={lineupModalState.isOpen}
        tieMatchId={lineupModalState.tieMatchId}
        roundId={lineupModalState.roundId}
        currentUser={currentUser}
        onClose={() => setLineupModalState({ isOpen: false, tieMatchId: null, roundId: 1 })}
        onSaved={triggerRefresh}
      />

      <MatchResultEntryModal
        isOpen={resultEntryState.isOpen}
        tieMatchId={resultEntryState.tieMatchId}
        subMatchId={resultEntryState.subMatchId}
        currentUser={currentUser}
        onClose={() => setResultEntryState({ isOpen: false, tieMatchId: null, subMatchId: null })}
        onSaved={triggerRefresh}
      />

      <LiveScoreModal
        isOpen={liveScoreState.isOpen}
        tieMatchId={liveScoreState.tieMatchId}
        subMatchId={liveScoreState.subMatchId}
        currentUser={currentUser}
        onClose={() => setLiveScoreState({ isOpen: false, tieMatchId: null, subMatchId: null })}
        onScoreUpdated={triggerRefresh}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      <GASIntegrationModal
        isOpen={isGASModalOpen}
        onClose={() => setIsGASModalOpen(false)}
      />

      {/* Sleek Footer */}
      <footer className="h-14 bg-[#0E1424] border-t border-white/10 flex items-center justify-between px-4 sm:px-8 text-[11px] text-white/40">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white/70">신안해양과학고</span>
            <span>배드민턴 리그전 운영위원회</span>
          </div>
          <span className="hidden sm:inline text-white/20">|</span>
          <span className="hidden sm:inline">Google Sheets 연동 지원</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#E2FF00] rounded-full animate-pulse shadow-[0_0_8px_#E2FF00]"></span>
          <span className="text-[#E2FF00] font-mono font-medium">LIVE SYSTEM READY</span>
        </div>
      </footer>

    </div>
  );
}
