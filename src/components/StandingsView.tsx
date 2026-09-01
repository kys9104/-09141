import React, { useState } from 'react';
import { 
  Trophy, 
  Medal, 
  TrendingUp, 
  Flame, 
  Calendar, 
  Layers, 
  Award,
  Sparkles,
  Info,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { GradeLevel, ClassStanding, TieMatch } from '../types';
import { StorageService } from '../services/storageService';

interface StandingsViewProps {
  onOpenSchedule?: () => void;
}

export const StandingsView: React.FC<StandingsViewProps> = ({
  onOpenSchedule
}) => {
  const standings = StorageService.calculateStandings('ALL');
  const allMatches = StorageService.getMatches();

  const completedMatches = allMatches.filter(m => m.status === 'COMPLETED');
  const leader = standings[0];

  return (
    <div className="space-y-6">
      
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#12192B] border border-white/10 p-6 sm:p-7 shadow-lg">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#E2FF00]/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 text-[#E2FF00]" />
              <span>2026학년도 신안해양과학고 1·2학년 통합 배드민턴 리그전</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              실시간 <span className="text-[#E2FF00]">통합 리그 순위표</span>
            </h2>
            <p className="text-xs sm:text-sm text-white/60 max-w-2xl leading-relaxed">
              1·2학년 총 4개 학급(1-1, 1-2, 2-1, 2-2)이 참가하는 6라운드 통합 풀리그로, 각 종목별 <strong className="text-[#E2FF00]">단판 15점 경기</strong>로 승패를 가립니다.
            </p>
          </div>

          <div className="flex items-center self-start md:self-auto px-3.5 py-2 rounded-xl bg-[#0A0F1D] border border-white/10 text-xs sm:text-sm font-bold text-[#E2FF00] font-mono">
            <span>🏆 1·2학년 통합 단일 풀리그 (4개 학급)</span>
          </div>
        </div>

        {/* Highlight Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/5">
          <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
            <span className="text-[11px] font-medium text-white/50 flex items-center gap-1.5 uppercase">
              <Trophy className="w-3.5 h-3.5 text-[#E2FF00]" /> 현재 1위 (선두)
            </span>
            <div className="mt-1 text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>{leader ? leader.className : '-'}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#E2FF00]/20 text-[#E2FF00] font-mono font-bold">
                {leader ? `${leader.points} PTS` : '0 PTS'}
              </span>
            </div>
          </div>

          <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
            <span className="text-[11px] font-medium text-white/50 flex items-center gap-1.5 uppercase">
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> 진행 경기
            </span>
            <div className="mt-1 text-base sm:text-lg font-bold text-white font-mono">
              {completedMatches.length} / {allMatches.length} <span className="text-xs font-normal text-white/50 font-sans">경기 완료</span>
            </div>
          </div>

          <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
            <span className="text-[11px] font-medium text-white/50 flex items-center gap-1.5 uppercase">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> 경기 방식
            </span>
            <div className="mt-1 text-xs sm:text-sm font-bold text-cyan-400 font-mono">
              6 ROUNDS (단판 15점)
            </div>
          </div>

          <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
            <span className="text-[11px] font-medium text-white/50 flex items-center gap-1.5 uppercase">
              <Award className="w-3.5 h-3.5 text-[#E2FF00]" /> 종목 구성
            </span>
            <div className="mt-1 text-xs sm:text-sm font-bold text-white/90">
              남단·여단·남복·여복·혼복 (5종목)
            </div>
          </div>
        </div>
      </div>

      {/* Main Standings Table Card */}
      <div className="bg-[#12192B] border border-white/10 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 bg-[#161E31] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#E2FF00]" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              1·2학년 통합 공식 순위표
            </h3>
          </div>
          <div className="text-[11px] text-white/50 flex items-center gap-2 font-mono">
            <span className="text-[#E2FF00] font-bold">순위 결정: 승점 ➔ 세트득실차 ➔ 총점수득실차</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#0E1424] text-white/40 font-medium text-[11px] uppercase tracking-wider border-b border-white/5">
              <tr>
                <th className="py-3.5 px-4 text-center w-14">순위</th>
                <th className="py-3.5 px-4">학급명</th>
                <th className="py-3.5 px-3 text-center">경기</th>
                <th className="py-3.5 px-3 text-center text-blue-400">승</th>
                <th className="py-3.5 px-3 text-center text-white/40">무</th>
                <th className="py-3.5 px-3 text-center text-rose-400">패</th>
                <th className="py-3.5 px-4 text-center font-bold text-[#E2FF00]">1. 승점</th>
                <th className="py-3.5 px-3 text-center">종목(승-패)</th>
                <th className="py-3.5 px-3 text-center font-bold text-[#E2FF00]">2. 세트득실차</th>
                <th className="py-3.5 px-3 text-center font-bold text-blue-400">3. 총점수득실차</th>
                <th className="py-3.5 px-4 text-center">승률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {standings.map((item) => {
                const isFirst = item.rank === 1;
                const isSecond = item.rank === 2;

                return (
                  <tr
                    key={item.teamKey}
                    className={`hover:bg-white/5 transition-colors ${
                      isFirst ? 'bg-[#E2FF00]/5' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-4 px-4 text-center font-mono">
                      {isFirst ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#E2FF00] text-black font-black text-xs shadow-[0_0_8px_rgba(226,255,0,0.4)]">
                          01
                        </span>
                      ) : isSecond ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/20 text-white font-bold text-xs">
                          02
                        </span>
                      ) : (
                        <span className="font-bold text-white/40">0{item.rank}</span>
                      )}
                    </td>

                    {/* Class Name */}
                    <td className="py-4 px-4 font-bold text-white flex items-center gap-2">
                      <span className="text-sm font-sans">{item.className}</span>
                      <span className="text-[11px] text-white/40 font-mono">({item.teamKey})</span>
                      {isFirst && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[#E2FF00]/20 text-[#E2FF00] border border-[#E2FF00]/30 font-mono">
                          1위 LEADER
                        </span>
                      )}
                    </td>

                    {/* Match stats */}
                    <td className="py-4 px-3 text-center text-white/70 font-mono">{item.played}</td>
                    <td className="py-4 px-3 text-center font-bold text-blue-400 font-mono">{item.wins}</td>
                    <td className="py-4 px-3 text-center text-white/40 font-mono">{item.draws}</td>
                    <td className="py-4 px-3 text-center text-rose-400 font-mono">{item.losses}</td>
                    
                    {/* 1. Points */}
                    <td className="py-4 px-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-[#E2FF00]/15 text-[#E2FF00] font-black text-sm font-mono border border-[#E2FF00]/30">
                        {item.points} PTS
                      </span>
                    </td>

                    {/* Submatch diff */}
                    <td className="py-4 px-3 text-center text-white/70 font-mono">
                      {item.subMatchWon}W - {item.subMatchLost}L
                    </td>

                    {/* 2. Set (Submatch) diff */}
                    <td className="py-4 px-3 text-center font-bold font-mono">
                      <span className={item.subMatchDiff > 0 ? 'text-[#E2FF00]' : item.subMatchDiff < 0 ? 'text-rose-400' : 'text-white/40'}>
                        {item.subMatchDiff > 0 ? `+${item.subMatchDiff}` : item.subMatchDiff}
                      </span>
                    </td>

                    {/* 3. Score diff */}
                    <td className="py-4 px-3 text-center font-medium font-mono">
                      <span className="text-white/50">{item.scoreWon}:{item.scoreLost}</span>
                      <span className={`ml-1 text-xs font-bold ${item.scoreDiff > 0 ? 'text-blue-400' : item.scoreDiff < 0 ? 'text-rose-400' : 'text-white/40'}`}>
                        ({item.scoreDiff > 0 ? `+${item.scoreDiff}` : item.scoreDiff})
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="py-4 px-4 text-center">
                      {item.played === 0 ? (
                        <span className="px-2 py-0.5 text-[10px] rounded bg-white/5 text-white/40 border border-white/10 font-mono">대기중</span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
                          {Math.round((item.wins / (item.played || 1)) * 100)}% WIN
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Highlights & League Rules Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Completed Match Highlights */}
        <div className="bg-[#12192B] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Medal className="w-4 h-4 text-blue-400" />
              최근 경기 결과 현황
            </h4>
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">단판 15점 5종목</span>
          </div>

          <div className="space-y-3">
            {completedMatches.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-xs font-mono">
                아직 종료된 경기가 없습니다. 경기일정 탭에서 경기 출전 선수 명단을 등록하거나 라이브 스코어보드를 시작해보세요!
              </div>
            ) : (
              completedMatches.slice(0, 3).map((tie) => {
                const teamAGrade = tie.teamAGrade || tie.grade || 1;
                const teamBGrade = tie.teamBGrade || tie.grade || 1;
                const isAWin = tie.teamAWins > tie.teamBWins;
                const isBWin = tie.teamBWins > tie.teamAWins;

                return (
                  <div
                    key={tie.id}
                    className="p-4 rounded-xl bg-[#0E1424] border border-white/5 hover:border-white/10 transition space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs text-white/40">
                      <span className="font-bold text-white/70">제{tie.roundId}라운드 ({tie.date})</span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/30 font-mono">
                        종료 COMPLETED
                      </span>
                    </div>

                    {/* Clash score */}
                    <div className="flex items-center justify-between px-2">
                      <div className={`text-center font-bold ${isAWin ? 'text-[#E2FF00]' : 'text-white/70'}`}>
                        <div className="text-sm sm:text-base">{teamAGrade}학년 {tie.teamAClass}반</div>
                        <div className="text-[10px] text-white/40 font-mono">
                          {isAWin && 'WINNER'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-2xl sm:text-3xl font-black text-white bg-white/5 px-3 py-0.5 rounded-lg border border-white/10 font-mono">
                          {tie.teamAWins}
                        </span>
                        <span className="text-white/30 font-black">:</span>
                        <span className="text-2xl sm:text-3xl font-black text-white bg-white/5 px-3 py-0.5 rounded-lg border border-white/10 font-mono">
                          {tie.teamBWins}
                        </span>
                      </div>

                      <div className={`text-center font-bold ${isBWin ? 'text-[#E2FF00]' : 'text-white/70'}`}>
                        <div className="text-sm sm:text-base">{teamBGrade}학년 {tie.teamBClass}반</div>
                        <div className="text-[10px] text-white/40 font-mono">
                          {isBWin && 'WINNER'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* League Rules Card */}
        <div className="bg-[#12192B] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#E2FF00]" />
              신안해양과학고 배드민턴 리그전 공식 운영 규정
            </h4>
            <span className="text-[10px] text-[#E2FF00] font-mono font-bold">REGULATION 2026</span>
          </div>

          <div className="space-y-2.5 text-xs text-white/70 leading-relaxed">
            <div className="p-3 rounded-xl bg-[#0E1424] border border-white/5">
              <span className="font-bold text-white block mb-1">📌 경기 방식: 각 종목별 단판 15점 경기</span>
              모든 세부 종목(단식/복식/혼복)은 <strong className="text-[#E2FF00]">1세트 단판 15점</strong>으로 진행되며, 5개 종목 중 3개 이상 종목을 승리한 학급이 해당 매치를 승리합니다.
            </div>

            <div className="p-3 rounded-xl bg-[#0E1424] border border-white/5">
              <span className="font-bold text-white block mb-1">🏆 리그 순위 결정 기준 (우선순위)</span>
              <div className="flex flex-col gap-1 mt-1 font-mono text-xs">
                <div className="flex items-center gap-2 text-white">
                  <span className="w-5 h-5 rounded bg-[#E2FF00] text-black font-bold flex items-center justify-center text-[10px]">1</span>
                  <span><strong>승점</strong> (매치 승리 3점, 무승부 1점, 패배 0점)</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <span className="w-5 h-5 rounded bg-white/10 text-white font-bold flex items-center justify-center text-[10px]">2</span>
                  <span><strong>세트(종목) 득실차</strong> (승리 종목수 - 패배 종목수)</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <span className="w-5 h-5 rounded bg-white/10 text-white font-bold flex items-center justify-center text-[10px]">3</span>
                  <span><strong>총 점수 득실차</strong> (전 종목 총 득점 - 총 실점)</span>
                </div>
                <div className="flex items-center gap-2 text-white/60">
                  <span className="w-5 h-5 rounded bg-white/5 text-white/50 font-bold flex items-center justify-center text-[10px]">4</span>
                  <span><strong>다득점</strong> (총 득점이 많은 학급 우선)</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0E1424] border border-white/5">
              <span className="font-bold text-white block mb-1">⏱️ 출전 명단 제출 기한</span>
              각 라운드 <strong className="text-[#E2FF00]">경기 1일 전 23:59까지</strong> 각 반 체육부장이 5개 종목 출전 선수를 작성하여 제출 완료해야 합니다.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
