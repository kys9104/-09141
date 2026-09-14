import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  UserCheck, 
  Award, 
  Activity, 
  CheckCircle, 
  FileEdit,
  Zap,
  ChevronRight,
  ShieldAlert,
  Trash2,
  AlertTriangle,
  RotateCcw,
  X
} from 'lucide-react';
import { 
  GradeLevel, 
  TieMatch, 
  SubMatch, 
  UserProfile,
  MatchCategory,
  isAdminRole,
  isCaptainRole,
  isCouncilRole
} from '../types';
import { LEAGUE_ROUNDS, CATEGORIES } from '../data/initialData';
import { StorageService } from '../services/storageService';
import { FirebaseService } from '../services/firebaseService';

interface ScheduleRoundViewProps {
  currentUser: UserProfile | null;
  selectedRoundId?: number;
  onSelectRoundId?: (roundId: number) => void;
  onOpenLineupModal: (tieMatchId: string, roundId: number) => void;
  onOpenResultEntryModal: (tieMatchId: string, subMatchId: string) => void;
  onOpenLiveScoreModal: (tieMatchId: string, subMatchId: string) => void;
  onResultDeleted?: () => void;
}

export const ScheduleRoundView: React.FC<ScheduleRoundViewProps> = ({
  currentUser,
  selectedRoundId: propSelectedRoundId,
  onSelectRoundId,
  onOpenLineupModal,
  onOpenResultEntryModal,
  onOpenLiveScoreModal,
  onResultDeleted
}) => {
  const [internalRoundId, setInternalRoundId] = useState<number>(1);
  const selectedRoundId = propSelectedRoundId !== undefined ? propSelectedRoundId : internalRoundId;

  const handleSelectRound = (roundId: number) => {
    if (onSelectRoundId) {
      onSelectRoundId(roundId);
    } else {
      setInternalRoundId(roundId);
    }
  };

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    type: 'SUBMATCH' | 'TIE';
    tieId: string;
    subMatchId?: string;
    title: string;
  } | null>(null);

  const matches = StorageService.getMatches();
  const currentRound = LEAGUE_ROUNDS.find(r => r.id === selectedRoundId) || LEAGUE_ROUNDS[0];

  const currentTieMatches = matches.filter(
    m => m.roundId === selectedRoundId
  );

  const isTeacher = isAdminRole(currentUser?.role);
  const isStudentCouncil = isCouncilRole(currentUser?.role);
  const isSportsRep = isCaptainRole(currentUser?.role);
  const canManageLineup = isSportsRep || isStudentCouncil || isTeacher;
  const canEnterResults = isSportsRep || isStudentCouncil || isTeacher;

  const handleDeleteExecute = () => {
    if (!isTeacher || !deleteConfirmModal) return;

    if (deleteConfirmModal.type === 'SUBMATCH' && deleteConfirmModal.subMatchId) {
      StorageService.deleteSubMatchResult(deleteConfirmModal.tieId, deleteConfirmModal.subMatchId);
    } else if (deleteConfirmModal.type === 'TIE') {
      StorageService.deleteTieMatchResult(deleteConfirmModal.tieId);
    }

    const updatedMatches = StorageService.getMatches();
    const targetMatch = updatedMatches.find(m => m.id === deleteConfirmModal.tieId);
    if (targetMatch) {
      FirebaseService.saveMatch(targetMatch, '체육교사(결과삭제)').catch(console.error);
    }

    setDeleteConfirmModal(null);
    if (onResultDeleted) {
      onResultDeleted();
    }
  };

  const getCategoryBadge = (cat: MatchCategory) => {
    switch (cat) {
      case 'MEN_SINGLES':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">남단</span>;
      case 'WOMEN_SINGLES':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30">여단</span>;
      case 'MEN_DOUBLES':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">남복</span>;
      case 'WOMEN_DOUBLES':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">여복</span>;
      case 'MIXED_DOUBLES':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E2FF00]/20 text-[#E2FF00] border border-[#E2FF00]/30 font-mono">혼복</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-[#12192B] border border-white/10 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#E2FF00] mb-1 font-mono">
            <Calendar className="w-3.5 h-3.5" />
            <span>SHINAN OCEAN SCIENCE HIGH SCHOOL • 1·2학년 통합 6라운드 일정</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            라운드별 <span className="text-[#E2FF00]">통합 경기 대진 & 일정표</span>
          </h2>
          <p className="text-xs text-white/50 mt-1">
            총 4개 코트(제1·2코트: Match 1, 제3·4코트: Match 2)에서 각 종목별 <strong className="text-[#E2FF00]">단판 15점 경기</strong>로 진행됩니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-[#E2FF00]/10 border border-[#E2FF00]/30 text-[#E2FF00] text-xs font-mono font-bold">
            4개 코트 동시 진행 • 단판 15점
          </span>
        </div>
      </div>

      {/* 6 Round Navigation Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {LEAGUE_ROUNDS.map((round) => {
          const isSelected = selectedRoundId === round.id;
          return (
            <button
              key={round.id}
              onClick={() => handleSelectRound(round.id)}
              className={`p-3.5 rounded-xl text-left border transition-all ${
                isSelected
                  ? 'bg-[#161E31] border-[#E2FF00] shadow-[0_0_15px_rgba(226,255,0,0.15)]'
                  : 'bg-[#12192B] border-white/10 hover:border-white/20 text-white/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold font-mono ${isSelected ? 'text-[#E2FF00]' : 'text-white/50'}`}>
                  ROUND 0{round.id}
                </span>
                {round.isFinished ? (
                  <span className="w-2 h-2 rounded-full bg-blue-400" title="완료" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[#E2FF00] animate-pulse" title="진행/예정" />
                )}
              </div>
              <div className={`text-xs font-bold mt-1.5 ${isSelected ? 'text-white' : 'text-white/80'}`}>
                {round.date.split(' ')[1]} {round.date.split(' ')[2]} ({round.dayOfWeek[0]})
              </div>
              <div className="text-[10px] text-white/40 mt-1 truncate font-mono">
                {round.isFinished ? 'COMPLETED' : 'UPCOMING'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Round Status Info Banner */}
      <div className="p-4 rounded-xl bg-[#12192B] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E2FF00]/15 border border-[#E2FF00]/30 flex items-center justify-center text-[#E2FF00] font-black text-lg font-mono">
            {currentRound.id}R
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>{currentRound.title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/70 font-mono border border-white/10">
                {currentRound.date}
              </span>
            </div>
            <div className="text-xs text-white/50 flex items-center gap-2 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-[#E2FF00]" />
              <span>명단 마감: <strong className="text-white/90 font-mono">{currentRound.deadlineDate}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Button for Sports Rep / Council / Teacher */}
        <div className="flex items-center gap-2">
          {canManageLineup && currentTieMatches.length > 0 && (
            <button
              onClick={() => onOpenLineupModal(currentTieMatches[0].id, currentRound.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#E2FF00] hover:bg-[#d0ea00] text-black shadow-[0_0_12px_rgba(226,255,0,0.3)] transition"
            >
              <UserCheck className="w-4 h-4 text-black" />
              <span>출전명단 작성</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-medium">
        <button
          onClick={() => setCategoryFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg border transition ${
            categoryFilter === 'ALL'
              ? 'bg-[#E2FF00] border-[#E2FF00] text-black font-bold'
              : 'bg-[#12192B] border-white/10 text-white/50 hover:text-white'
          }`}
        >
          전체 종목 (5종목)
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-3 py-1.5 rounded-lg border transition ${
              categoryFilter === cat.id
                ? 'bg-[#E2FF00] border-[#E2FF00] text-black font-bold'
                : 'bg-[#12192B] border-white/10 text-white/50 hover:text-white'
            }`}
          >
            {cat.name} ({cat.shortName})
          </button>
        ))}
      </div>

      {/* Tie Matches List */}
      <div className="space-y-6">
        {currentTieMatches.length === 0 ? (
          <div className="p-12 text-center bg-[#12192B] rounded-2xl border border-white/10 text-white/40 text-xs">
            해당 라운드에 편성된 경기가 없습니다.
          </div>
        ) : (
          currentTieMatches.map((tie, idx) => {
            const teamAGrade = tie.teamAGrade || tie.grade || 1;
            const teamBGrade = tie.teamBGrade || tie.grade || 1;
            const filteredSubMatches = categoryFilter === 'ALL'
              ? tie.subMatches
              : tie.subMatches.filter(sm => sm.category === categoryFilter);

            return (
              <div
                key={tie.id}
                className="bg-[#12192B] border border-white/10 rounded-2xl overflow-hidden shadow-lg space-y-4"
              >
                {/* Tie Match Header Banner */}
                <div className="px-6 py-4 bg-[#161E31] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="px-2.5 py-1 rounded-lg bg-[#E2FF00]/15 border border-[#E2FF00]/30 text-[#E2FF00] font-bold text-xs font-mono">
                      MATCH {idx + 1} ({idx === 0 ? '제1·2코트' : '제3·4코트'})
                    </div>
                    <h3 className="text-base font-bold text-white">
                      <span className="text-[#E2FF00]">{teamAGrade}학년 {tie.teamAClass}반</span> ({teamAGrade}-{tie.teamAClass})
                      <span className="text-white/30 font-light mx-2">VS</span>
                      <span className="text-[#E2FF00]">{teamBGrade}학년 {tie.teamBClass}반</span> ({teamBGrade}-{tie.teamBClass})
                    </h3>
                  </div>

                  {/* Tie Overall Score Status */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {tie.status === 'COMPLETED' ? (
                      <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-lg">
                        <span className="text-xs font-medium text-blue-400">종합 스코어</span>
                        <span className="text-base font-black text-white font-mono">
                          {tie.teamAWins} : {tie.teamBWins}
                        </span>
                        <span className="text-xs font-bold text-[#E2FF00] ml-1 font-mono">
                          ({tie.winnerClass ? `${tie.winnerClass}반 WIN` : '무승부'})
                        </span>
                      </div>
                    ) : (
                      <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs font-mono">
                        {tie.status === 'READY_TO_PLAY' ? 'READY (출전 확정)' : 'LINEUP PENDING (명단 대기)'}
                      </span>
                    )}

                    {canManageLineup && (
                      <button
                        onClick={() => onOpenLineupModal(tie.id, tie.roundId)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition"
                      >
                        출전명단 작성
                      </button>
                    )}

                    {/* Teacher-only: Reset entire tie match results */}
                    {isTeacher && (tie.status === 'COMPLETED' || tie.subMatches.some(s => s.status === 'COMPLETED')) && (
                      <button
                        onClick={() => setDeleteConfirmModal({
                          type: 'TIE',
                          tieId: tie.id,
                          title: `MATCH ${idx + 1} (${teamAGrade}학년 ${tie.teamAClass}반 VS ${teamBGrade}학년 ${tie.teamBClass}반 전체 5경기)`
                        })}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition flex items-center gap-1 font-mono"
                        title="체육교사 권한: 해당 매치 5개 종목 결과 전체 초기화"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>대진 결과 전체 삭제</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* SubMatches Cards Grid */}
                <div className="p-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSubMatches.map((sm) => {
                    const hasScores = sm.sets && sm.sets.length > 0 && (sm.sets[0].scoreA > 0 || sm.sets[0].scoreB > 0);
                    const isAWin = sm.winnerTeam === 'A';
                    const isBWin = sm.winnerTeam === 'B';
                    const isLive = sm.status === 'IN_PROGRESS';

                    return (
                      <div
                        key={sm.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isLive
                            ? 'bg-[#161E31] border-[#E2FF00]/50 ring-1 ring-[#E2FF00]/30'
                            : sm.status === 'COMPLETED'
                            ? 'bg-[#0E1424] border-white/5 hover:border-white/10'
                            : 'bg-[#0E1424] border-white/5'
                        }`}
                      >
                        {/* SubMatch Top row */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getCategoryBadge(sm.category)}
                            <span className="text-[11px] font-bold text-[#E2FF00] bg-[#E2FF00]/10 px-2 py-0.5 rounded border border-[#E2FF00]/20 flex items-center gap-1 font-mono">
                              <MapPin className="w-3 h-3 text-[#E2FF00]" /> {sm.court}
                            </span>
                          </div>

                          {/* Status Badge */}
                          {sm.status === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
                              <CheckCircle className="w-3 h-3" /> COMPLETED (15점 단판)
                            </span>
                          ) : isLive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#E2FF00]/20 text-[#E2FF00] border border-[#E2FF00]/40 font-mono animate-pulse">
                              <Zap className="w-3 h-3" /> LIVE 15점
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/5 text-white/40 font-mono">
                              단판 15점 경기
                            </span>
                          )}
                        </div>

                        {/* Teams & Players Clash Box */}
                        <div className="grid grid-cols-5 items-center gap-2 py-2.5 px-3 rounded-lg bg-[#0A0F1D] border border-white/5">
                          {/* Team A */}
                          <div className="col-span-2 text-left">
                            <div className="text-xs font-bold text-white">
                              {teamAGrade}학년 {tie.teamAClass}반
                            </div>
                            <div className="text-[11px] text-white/50 truncate">
                              {sm.teamAPlayers.length > 0 ? (sm.teamAPlayers.map(p => p.name).join(', ')) : '선수 미등록'}
                            </div>
                            {isAWin && (
                              <span className="text-[10px] font-bold text-[#E2FF00] font-mono">WIN</span>
                            )}
                          </div>

                          {/* Set Score or VS */}
                          <div className="col-span-1 text-center font-bold">
                            {hasScores ? (
                              <div className="space-y-0.5">
                                <div className="text-base font-black text-white font-mono">
                                  {sm.sets[0].scoreA} : {sm.sets[0].scoreB}
                                </div>
                                <div className="text-[9px] text-[#E2FF00] font-mono">
                                  단판 15점
                                </div>
                              </div>
                            ) : (
                              <span className="text-white/20 text-xs font-mono font-bold">VS</span>
                            )}
                          </div>

                          {/* Team B */}
                          <div className="col-span-2 text-right">
                            <div className="text-xs font-bold text-white">
                              {teamBGrade}학년 {tie.teamBClass}반
                            </div>
                            <div className="text-[11px] text-white/50 truncate">
                              {sm.teamBPlayers.length > 0 ? (sm.teamBPlayers.map(p => p.name).join(', ')) : '선수 미등록'}
                            </div>
                            {isBWin && (
                              <span className="text-[10px] font-bold text-[#E2FF00] font-mono">WIN</span>
                            )}
                          </div>
                        </div>

                        {/* MVP & Quick Stats if completed */}
                        {sm.stats && sm.stats.mvpPlayerName && (
                          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/50 font-mono">
                            <div className="flex items-center gap-1.5 text-[#E2FF00] font-bold">
                              <Award className="w-3.5 h-3.5 text-[#E2FF00]" />
                              <span>MVP: {sm.stats.mvpPlayerName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/40">
                              <span>스매시: {sm.stats.smashWinnersA || 0}/{sm.stats.smashWinnersB || 0}</span>
                              <span>{sm.stats.durationMinutes || 0}분</span>
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => onOpenLiveScoreModal(tie.id, sm.id)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-[#E2FF00]/15 hover:bg-[#E2FF00]/25 text-[#E2FF00] border border-[#E2FF00]/30 transition flex items-center justify-center gap-1 font-mono"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            <span>LIVE SCOREBOARD</span>
                          </button>

                          {canEnterResults && (
                            <button
                              onClick={() => onOpenResultEntryModal(tie.id, sm.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition flex items-center justify-center gap-1"
                            >
                              <FileEdit className="w-3.5 h-3.5 text-white/60" />
                              <span>결과 입력</span>
                            </button>
                          )}

                          {/* Teacher-only: Delete/Reset Submatch Result */}
                          {isTeacher && (sm.status === 'COMPLETED' || hasScores) && (
                            <button
                              onClick={() => setDeleteConfirmModal({
                                type: 'SUBMATCH',
                                tieId: tie.id,
                                subMatchId: sm.id,
                                title: `${CATEGORIES.find(c => c.id === sm.category)?.name || sm.category} (${teamAGrade}학년 ${tie.teamAClass}반 VS ${teamBGrade}학년 ${tie.teamBClass}반)`
                              })}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition flex items-center justify-center gap-1 font-mono"
                              title="체육교사 권한: 경기 결과 삭제 및 점수 초기화"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">결과 삭제</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal (Physical Education Teacher Permission Only) */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#12192B] border border-rose-500/30 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">경기 결과 삭제 및 초기화</h3>
                  <p className="text-xs text-rose-400 font-semibold font-mono">체육교사 전용 권한 승인</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-2 text-xs">
              <div className="font-bold text-white text-sm">
                {deleteConfirmModal.title}
              </div>
              <p className="text-white/60 leading-relaxed">
                해당 경기의 입력된 <strong>최종 점수, 승패 기록, MVP 선수</strong> 데이터가 즉시 삭제되고 경기 전 상태로 초기화됩니다. 리그 순위표와 지표 통계도 자동 재계산됩니다.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 transition"
              >
                취소
              </button>
              <button
                onClick={handleDeleteExecute}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.4)] transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>확인 및 결과 삭제</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
