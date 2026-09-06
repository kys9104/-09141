import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StandingsView } from './components/StandingsView';
import { ScheduleRoundView } from './components/ScheduleRoundView';
import { StatsMvpView } from './components/StatsMvpView';
import { RosterSubmissionView } from './components/RosterSubmissionView';
import { TeacherDashboard } from './components/TeacherDashboard';
import { LoginModal } from './components/LoginModal';
import { LineupSubmissionModal } from './components/LineupSubmissionModal';
import { MatchResultEntryModal } from './components/MatchResultEntryModal';
import { LiveScoreModal } from './components/LiveScoreModal';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';

import { UserProfile, isAdminRole, isCaptainRole } from './types';
import { StorageService } from './services/storageService';
import { FirebaseService } from './services/firebaseService';

export default function App() {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<string>('STANDINGS');

  // Selected schedule round state
  const [selectedRoundId, setSelectedRoundId] = useState<number>(1);

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

  // Sync state trigger
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Synchronize initial data with Firebase Firestore on mount
  useEffect(() => {
    const syncWithFirebase = async () => {
      try {
        const firestoreMatches = await FirebaseService.getMatches();
        if (firestoreMatches && firestoreMatches.length > 0) {
          StorageService.saveMatches(firestoreMatches);
          setRefreshKey(k => k + 1);
        }
      } catch (err) {
        console.warn('Initial Firebase sync note:', err);
      }
    };
    syncWithFirebase();
  }, []);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    if (isAdminRole(user.role)) {
      setActiveTab('TEACHER');
    } else if (isCaptainRole(user.role)) {
      setActiveTab('ROSTER_SUBMIT');
    }
  };

  const handleLogout = () => {
    StorageService.clearUserSession();
    setCurrentUser(null);
    if (activeTab === 'TEACHER' || activeTab === 'ROSTER_SUBMIT') {
      setActiveTab('STANDINGS');
    }
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
        onOpenGoogleSheets={() => setIsGASModalOpen(true)}
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
            selectedRoundId={selectedRoundId}
            onSelectRoundId={setSelectedRoundId}
            onOpenLineupModal={handleOpenLineupModal}
            onOpenResultEntryModal={handleOpenResultEntry}
            onOpenLiveScoreModal={handleOpenLiveScore}
            onResultDeleted={triggerRefresh}
          />
        )}

        {/* TAB 3: STATS & MVP */}
        {activeTab === 'STATS' && (
          <StatsMvpView key={`stats-${refreshKey}`} />
        )}

        {/* TAB 4: ROSTER SUBMISSION (Captain & Teacher Exclusive) */}
        {activeTab === 'ROSTER_SUBMIT' && (
          <RosterSubmissionView
            key={`roster-${refreshKey}`}
            currentUser={currentUser}
            onRosterUpdated={triggerRefresh}
          />
        )}

        {/* TAB 5: TEACHER DASHBOARD (Admin Only) */}
        {activeTab === 'TEACHER' && (
          <TeacherDashboard
            key={`teacher-${refreshKey}`}
            currentUser={currentUser}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onOpenGAS={() => setIsGASModalOpen(true)}
            onOpenScoreEdit={(tieMatchId) => handleOpenResultEntry(tieMatchId, '')}
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

      <GoogleSheetsSyncModal
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
          <span className="hidden sm:inline">Firebase DB & Google Sheets 연동</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#E2FF00] rounded-full animate-pulse shadow-[0_0_8px_#E2FF00]"></span>
          <span className="text-[#E2FF00] font-mono font-medium">LIVE SYSTEM READY</span>
        </div>
      </footer>

    </div>
  );
}
