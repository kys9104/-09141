import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  UserCheck, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { 
  TieMatch, 
  UserProfile, 
  isAdminRole, 
  isCouncilRole
} from '../types';
import { CATEGORIES } from '../data/initialData';
import { StorageService } from '../services/storageService';
import { FirebaseService } from '../services/firebaseService';

interface MatchScheduleEditModalProps {
  isOpen: boolean;
  tieMatch: TieMatch | null;
  currentUser: UserProfile | null;
  onClose: () => void;
  onSaved: () => void;
}

export const MatchScheduleEditModal: React.FC<MatchScheduleEditModalProps> = ({
  isOpen,
  tieMatch,
  currentUser,
  onClose,
  onSaved
}) => {
  if (!isOpen || !tieMatch) return null;

  const teamAGrade = tieMatch.teamAGrade || tieMatch.grade || 1;
  const teamBGrade = tieMatch.teamBGrade || tieMatch.grade || 1;

  const [date, setDate] = useState<string>(tieMatch.date || '');
  const [time, setTime] = useState<string>(tieMatch.time || '13:30');
  const [subMatchesConfig, setSubMatchesConfig] = useState<
    Array<{
      id: string;
      category: string;
      court: string;
      scheduledTime: string;
      referee: string;
    }>
  >([]);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (tieMatch) {
      setDate(tieMatch.date || '');
      setTime(tieMatch.time || '13:30');
      setSubMatchesConfig(
        tieMatch.subMatches.map(sm => ({
          id: sm.id,
          category: sm.category,
          court: sm.court || '제1코트',
          scheduledTime: sm.scheduledTime || tieMatch.time || '13:30',
          referee: sm.referee || '학생 심판'
        }))
      );
    }
  }, [tieMatch]);

  const canEdit = isAdminRole(currentUser?.role) || isCouncilRole(currentUser?.role);

  const handleSubMatchChange = (idx: number, field: 'court' | 'scheduledTime' | 'referee', value: string) => {
    setSubMatchesConfig(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      alert('경기 일정 및 코트 배정 수정 권한이 없습니다. (체육교사 또는 학생자치회 전용)');
      return;
    }

    try {
      setIsSaving(true);
      setStatusMessage(null);

      const updatedTie: TieMatch = {
        ...tieMatch,
        date: date.trim() || tieMatch.date,
        time: time.trim() || tieMatch.time,
        subMatches: tieMatch.subMatches.map((sm, idx) => {
          const cfg = subMatchesConfig[idx];
          if (!cfg) return sm;
          return {
            ...sm,
            court: cfg.court,
            scheduledTime: cfg.scheduledTime,
            referee: cfg.referee
          };
        }),
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name 
          ? `${currentUser.name} (${isAdminRole(currentUser.role) ? '체육교사' : '학생자치회'})`
          : '체육교사/학생자치회'
      };

      // 1. Update in StorageService
      StorageService.saveSingleMatch(updatedTie);

      // 2. Persist to Firebase Firestore
      const submitterInfo = currentUser?.name 
        ? `${currentUser.name} (${isAdminRole(currentUser.role) ? '체육교사' : '학생자치회'})`
        : '체육교사/학생자치회';

      await FirebaseService.saveMatch(updatedTie, submitterInfo);

      setStatusMessage({
        type: 'success',
        text: '✓ 경기 일정, 코트 및 심판 배정이 Firestore 클라우드와 로컬에 정상 저장되었습니다!'
      });

      onSaved();
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      console.error('Failed to save match schedule:', err);
      setStatusMessage({
        type: 'error',
        text: `일정 저장 중 오류가 발생했습니다: ${err.message || '네트워크 오류'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#12192B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0A0F1D] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E2FF00]/10 border border-[#E2FF00]/30 flex items-center justify-center text-[#E2FF00]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                경기 일정 및 코트·심판 배정 변경
              </h2>
              <p className="text-xs text-white/50">
                제{tieMatch.roundId}라운드: {teamAGrade}학년 {tieMatch.teamAClass}반 VS {teamBGrade}학년 {tieMatch.teamBClass}반
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          
          {/* Status Message */}
          {statusMessage && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Match Round Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#0A0F1D] border border-white/5">
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#E2FF00]" />
                <span>경기 일자</span>
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="예: 2026. 04. 08 (수)"
                className="w-full px-3 py-2 bg-[#12192B] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#E2FF00] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#E2FF00]" />
                <span>시작 시간</span>
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="예: 13:30"
                className="w-full px-3 py-2 bg-[#12192B] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#E2FF00] font-mono"
              />
            </div>
          </div>

          {/* Submatches 5 Categories Court & Referee Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white/90 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#E2FF00]" />
              <span>종목별 코트 및 심판 배정 (5종목 단판 15점)</span>
            </h4>

            <div className="space-y-2.5">
              {subMatchesConfig.map((cfg, idx) => {
                const catObj = CATEGORIES.find(c => c.id === cfg.category);
                return (
                  <div
                    key={cfg.id || idx}
                    className="p-3 rounded-xl bg-[#0A0F1D] border border-white/5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                  >
                    <div className="sm:col-span-3">
                      <span className="text-xs font-bold text-white block">
                        {catObj ? catObj.name : cfg.category}
                      </span>
                      <span className="text-[10px] text-[#E2FF00] font-mono">
                        {catObj ? catObj.shortName : ''} • 단판 15점
                      </span>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-white/50 block mb-1">코트 배정</label>
                      <select
                        value={cfg.court}
                        onChange={(e) => handleSubMatchChange(idx, 'court', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#12192B] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#E2FF00] font-mono"
                      >
                        <option value="제1코트">제1코트</option>
                        <option value="제2코트">제2코트</option>
                        <option value="제3코트">제3코트</option>
                        <option value="제4코트">제4코트</option>
                        <option value="체육관 A">체육관 A</option>
                        <option value="체육관 B">체육관 B</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-white/50 block mb-1">예정 시간</label>
                      <input
                        type="text"
                        value={cfg.scheduledTime}
                        onChange={(e) => handleSubMatchChange(idx, 'scheduledTime', e.target.value)}
                        placeholder="13:30"
                        className="w-full px-2.5 py-1.5 bg-[#12192B] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#E2FF00] font-mono"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-white/50 block mb-1">배정 심판</label>
                      <input
                        type="text"
                        value={cfg.referee}
                        onChange={(e) => handleSubMatchChange(idx, 'referee', e.target.value)}
                        placeholder="학생 심판 배정"
                        className="w-full px-2.5 py-1.5 bg-[#12192B] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#E2FF00]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-white/40">
              * 변경 사항은 모든 학생 및 심판 화면에 실시간으로 공유됩니다.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/70 transition"
              >
                닫기
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#E2FF00] hover:bg-[#d0ea00] text-black shadow-[0_0_15px_rgba(226,255,0,0.3)] transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <span>클라우드 동기화 중...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-black" />
                    <span>일정 및 배정 저장</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
