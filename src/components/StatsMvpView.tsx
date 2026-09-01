import React, { useState } from 'react';
import { 
  Trophy, 
  Award, 
  Flame, 
  Zap, 
  Crown,
  Activity
} from 'lucide-react';
import { GradeLevel } from '../types';
import { StorageService } from '../services/storageService';

export const StatsMvpView: React.FC = () => {
  const [selectedGrade, setSelectedGrade] = useState<'ALL' | GradeLevel>('ALL');

  const allMatches = StorageService.getMatches();
  const matches = selectedGrade === 'ALL'
    ? allMatches
    : allMatches.filter(m => (m.teamAGrade === selectedGrade || m.teamBGrade === selectedGrade || m.grade === selectedGrade));
  const standings = StorageService.calculateStandings(selectedGrade);

  // Compute player individual stats from submatches
  const playerStatsMap: Record<string, {
    name: string;
    grade: GradeLevel;
    classNum: number;
    matches: number;
    wins: number;
    smashes: number;
    mvpCount: number;
  }> = {};

  matches.forEach(tie => {
    tie.subMatches.forEach(sm => {
      if (sm.status === 'COMPLETED') {
        const isAWin = sm.winnerTeam === 'A';
        const isBWin = sm.winnerTeam === 'B';
        const isMvp = sm.stats?.mvpPlayerName;

        sm.teamAPlayers.forEach(p => {
          if (!playerStatsMap[p.name]) {
            playerStatsMap[p.name] = {
              name: p.name,
              grade: p.grade,
              classNum: p.classNum,
              matches: 0,
              wins: 0,
              smashes: 0,
              mvpCount: 0
            };
          }
          playerStatsMap[p.name].matches += 1;
          if (isAWin) playerStatsMap[p.name].wins += 1;
          if (sm.stats?.smashWinnersA) playerStatsMap[p.name].smashes += Math.round(sm.stats.smashWinnersA / sm.teamAPlayers.length);
          if (isMvp === p.name) playerStatsMap[p.name].mvpCount += 1;
        });

        sm.teamBPlayers.forEach(p => {
          if (!playerStatsMap[p.name]) {
            playerStatsMap[p.name] = {
              name: p.name,
              grade: p.grade,
              classNum: p.classNum,
              matches: 0,
              wins: 0,
              smashes: 0,
              mvpCount: 0
            };
          }
          playerStatsMap[p.name].matches += 1;
          if (isBWin) playerStatsMap[p.name].wins += 1;
          if (sm.stats?.smashWinnersB) playerStatsMap[p.name].smashes += Math.round(sm.stats.smashWinnersB / sm.teamBPlayers.length);
          if (isMvp === p.name) playerStatsMap[p.name].mvpCount += 1;
        });
      }
    });
  });

  const playerStatsList = Object.values(playerStatsMap);

  // Top MVP players
  const topMvps = [...playerStatsList].sort((a, b) => b.mvpCount - a.mvpCount || b.wins - a.wins).slice(0, 5);

  // Top Smashers
  const topSmashers = [...playerStatsList].sort((a, b) => b.smashes - a.smashes).slice(0, 5);

  // Most Wins
  const topWinners = [...playerStatsList].sort((a, b) => b.wins - a.wins || (b.wins/b.matches || 0) - (a.wins/a.matches || 0)).slice(0, 5);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-[#12192B] border border-white/10 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#E2FF00] mb-1 font-mono">
            <Trophy className="w-3.5 h-3.5" />
            <span>LEAGUE RECORDS & MVP HALL OF FAME</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            누적 기록 & <span className="text-[#E2FF00]">명예의 전당</span>
          </h2>
          <p className="text-xs text-white/50 mt-1">
            개인별 최다 MVP, 스매시 에이스, 다승 리더 및 학급별 종합 경기 지표입니다.
          </p>
        </div>

        {/* Grade Selector */}
        <div className="flex items-center bg-[#0A0F1D] p-1 rounded-xl border border-white/10 self-start md:self-auto">
          <button
            onClick={() => setSelectedGrade('ALL')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
              selectedGrade === 'ALL'
                ? 'bg-[#E2FF00] text-black shadow-[0_0_12px_rgba(226,255,0,0.3)]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            통합 (전체)
          </button>
          <button
            onClick={() => setSelectedGrade(1)}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
              selectedGrade === 1
                ? 'bg-[#E2FF00] text-black shadow-[0_0_12px_rgba(226,255,0,0.3)]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            1학년
          </button>
          <button
            onClick={() => setSelectedGrade(2)}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
              selectedGrade === 2
                ? 'bg-[#E2FF00] text-black shadow-[0_0_12px_rgba(226,255,0,0.3)]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            2학년
          </button>
        </div>
      </div>

      {/* Top 3 Spotlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* 1. MVP Leader */}
        <div className="p-5 rounded-2xl bg-[#12192B] border border-white/10 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#E2FF00] font-bold text-xs uppercase tracking-wider font-mono">
              <Crown className="w-4 h-4 text-[#E2FF00]" />
              <span>MVP LEADER</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E2FF00]/15 text-[#E2FF00] font-mono border border-[#E2FF00]/30">
              TOP 01
            </span>
          </div>

          {topMvps[0] ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white tracking-tight">{topMvps[0].name}</span>
                <span className="text-xs text-[#E2FF00] font-mono font-bold">{selectedGrade}학년 {topMvps[0].classNum}반</span>
              </div>
              <div className="text-xs text-white/50 flex items-center gap-3 pt-1 font-mono">
                <span>MVP: <strong className="text-[#E2FF00] text-sm font-bold">{topMvps[0].mvpCount}회</strong></span>
                <span>전적: <strong className="text-white">{topMvps[0].matches}전 {topMvps[0].wins}승</strong></span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-white/40 py-4 font-mono">NO RECORDS YET</div>
          )}

          <div className="pt-3 border-t border-white/5 space-y-2 text-xs">
            {topMvps.slice(1, 4).map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-white/70">
                <span className="flex items-center gap-2">
                  <span className="text-white/40 font-mono font-bold">0{i + 2}</span>
                  <span>{p.classNum}반 {p.name}</span>
                </span>
                <span className="font-mono font-bold text-[#E2FF00]">{p.mvpCount}회</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Top Smasher */}
        <div className="p-5 rounded-2xl bg-[#12192B] border border-white/10 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider font-mono">
              <Flame className="w-4 h-4 text-rose-400" />
              <span>SMASH ACE</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 font-mono border border-rose-500/30">
              POWER
            </span>
          </div>

          {topSmashers[0] ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white tracking-tight">{topSmashers[0].name}</span>
                <span className="text-xs text-rose-400 font-mono font-bold">{selectedGrade}학년 {topSmashers[0].classNum}반</span>
              </div>
              <div className="text-xs text-white/50 flex items-center gap-3 pt-1 font-mono">
                <span>스매시: <strong className="text-rose-400 text-sm font-bold">{topSmashers[0].smashes}개</strong></span>
                <span>경기당: <strong className="text-white">{(topSmashers[0].smashes / (topSmashers[0].matches || 1)).toFixed(1)}개</strong></span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-white/40 py-4 font-mono">NO RECORDS YET</div>
          )}

          <div className="pt-3 border-t border-white/5 space-y-2 text-xs">
            {topSmashers.slice(1, 4).map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-white/70">
                <span className="flex items-center gap-2">
                  <span className="text-white/40 font-mono font-bold">0{i + 2}</span>
                  <span>{p.classNum}반 {p.name}</span>
                </span>
                <span className="font-mono font-bold text-rose-400">{p.smashes}개</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Most Wins */}
        <div className="p-5 rounded-2xl bg-[#12192B] border border-white/10 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider font-mono">
              <Zap className="w-4 h-4 text-blue-400" />
              <span>VICTORY LEADER</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 font-mono border border-blue-500/30">
              WIN RATE
            </span>
          </div>

          {topWinners[0] ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white tracking-tight">{topWinners[0].name}</span>
                <span className="text-xs text-blue-400 font-mono font-bold">{selectedGrade}학년 {topWinners[0].classNum}반</span>
              </div>
              <div className="text-xs text-white/50 flex items-center gap-3 pt-1 font-mono">
                <span>승리: <strong className="text-blue-400 text-sm font-bold">{topWinners[0].wins}승</strong></span>
                <span>승률: <strong className="text-white">{Math.round((topWinners[0].wins / (topWinners[0].matches || 1)) * 100)}%</strong></span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-white/40 py-4 font-mono">NO RECORDS YET</div>
          )}

          <div className="pt-3 border-t border-white/5 space-y-2 text-xs">
            {topWinners.slice(1, 4).map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-white/70">
                <span className="flex items-center gap-2">
                  <span className="text-white/40 font-mono font-bold">0{i + 2}</span>
                  <span>{p.classNum}반 {p.name}</span>
                </span>
                <span className="font-mono font-bold text-blue-400">{p.wins}승 ({Math.round((p.wins / (p.matches || 1)) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Class Statistics Summary Table */}
      <div className="p-6 rounded-2xl bg-[#12192B] border border-white/10 shadow-lg space-y-4">
        <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#E2FF00]" />
          <span>{selectedGrade}학년 학급별 종합 경기 지표 요약</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0E1424] text-white/40 font-mono uppercase tracking-wider text-[11px]">
              <tr className="border-b border-white/5">
                <th className="py-3 px-4">순위</th>
                <th className="py-3 px-4">학급명</th>
                <th className="py-3 px-4 text-center text-[#E2FF00]">총 승점</th>
                <th className="py-3 px-4 text-center">전적(승/패)</th>
                <th className="py-3 px-4 text-center">세트 득실</th>
                <th className="py-3 px-4 text-center">총 득점</th>
                <th className="py-3 px-4 text-center">총 실점</th>
                <th className="py-3 px-4 text-center">점수 득실</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {standings.map((st) => (
                <tr key={st.classNum} className="hover:bg-white/5 transition">
                  <td className="py-3 px-4">
                    <span className={`w-6 h-6 rounded inline-flex items-center justify-center font-bold text-xs ${
                      st.rank === 1 ? 'bg-[#E2FF00] text-black shadow-[0_0_8px_rgba(226,255,0,0.3)]' : 'bg-white/10 text-white/70'
                    }`}>
                      0{st.rank}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-white font-sans">
                    {st.grade}학년 {st.classNum}반
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-[#E2FF00]">
                    {st.points} PTS
                  </td>
                  <td className="py-3 px-4 text-center text-white/80">
                    {st.wins}W {st.losses}L
                  </td>
                  <td className="py-3 px-4 text-center font-bold">
                    <span className={st.subMatchDiff > 0 ? 'text-[#E2FF00]' : st.subMatchDiff < 0 ? 'text-rose-400' : 'text-white/40'}>
                      {st.subMatchDiff > 0 ? `+${st.subMatchDiff}` : st.subMatchDiff}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-white/70">
                    {st.scoreWon}
                  </td>
                  <td className="py-3 px-4 text-center text-white/40">
                    {st.scoreLost}
                  </td>
                  <td className="py-3 px-4 text-center font-bold">
                    <span className={st.scoreDiff > 0 ? 'text-blue-400' : st.scoreDiff < 0 ? 'text-rose-400' : 'text-white/40'}>
                      {st.scoreDiff > 0 ? `+${st.scoreDiff}` : st.scoreDiff}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

