import React from 'react';
import { 
  Trophy, 
  Activity,
  TrendingUp,
  Target,
  BarChart3
} from 'lucide-react';
import { StorageService } from '../services/storageService';

export const StatsMvpView: React.FC = () => {
  const matches = StorageService.getMatches();
  const standings = StorageService.calculateStandings('ALL');

  const totalMatchesPlayed = matches.reduce((acc, tie) => {
    return acc + tie.subMatches.filter(sm => sm.status === 'COMPLETED').length;
  }, 0);

  const totalPointsScored = standings.reduce((acc, s) => acc + s.scoreWon, 0);
  const leadingClass = standings[0] || null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="bg-[#12192B] border border-white/10 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#E2FF00] mb-1 font-mono">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>CLASS PERFORMANCE & MATCH SUMMARY</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            학급별 <span className="text-[#E2FF00]">종합 경기 지표 요약</span> (통합 전체)
          </h2>
          <p className="text-xs text-white/50 mt-1">
            신안중학교 학교스포츠클럽 배드민턴 리그 전체 학급의 순위, 승점, 전적, 세트 득실 및 총 득실점 종합 분석 데이터입니다.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Leading Class */}
        <div className="p-5 rounded-2xl bg-[#12192B] border border-white/10 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-white/50">선두 1위 학급</span>
            <Trophy className="w-4 h-4 text-[#E2FF00]" />
          </div>
          {leadingClass ? (
            <div>
              <div className="text-2xl font-black text-white tracking-tight">
                {leadingClass.grade}학년 {leadingClass.classNum}반
              </div>
              <div className="text-xs font-mono text-[#E2FF00] font-bold mt-0.5">
                승점 {leadingClass.points} PTS ({leadingClass.wins}승 {leadingClass.losses}패)
              </div>
            </div>
          ) : (
            <div className="text-xs text-white/40 font-mono">기록 없음</div>
          )}
        </div>

        {/* Total Completed Submatches */}
        <div className="p-5 rounded-2xl bg-[#12192B] border border-white/10 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-white/50">완료된 매치 수</span>
            <Target className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              {totalMatchesPlayed} <span className="text-sm font-medium text-white/50">경기</span>
            </div>
            <div className="text-xs font-mono text-blue-400 font-bold mt-0.5">
              공식 집계 완료
            </div>
          </div>
        </div>

        {/* Total Points Scored */}
        <div className="p-5 rounded-2xl bg-[#12192B] border border-white/10 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-white/50">총 누적 득점</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight font-mono">
              {totalPointsScored} <span className="text-sm font-medium text-white/50">PTS</span>
            </div>
            <div className="text-xs font-mono text-emerald-400 font-bold mt-0.5">
              리그 전체 득점 총합
            </div>
          </div>
        </div>
      </div>

      {/* Class Statistics Summary Table */}
      <div className="p-6 rounded-2xl bg-[#12192B] border border-white/10 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#E2FF00]" />
            <span>
              전체 학급 종합 경기 지표 순위표
            </span>
          </h3>
          <span className="text-[11px] font-mono text-white/40">
            승점 → 세트득실 → 득실차 기준 정렬
          </span>
        </div>

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
                <tr key={`${st.grade}-${st.classNum}`} className="hover:bg-white/5 transition">
                  <td className="py-3 px-4">
                    <span className={`w-6 h-6 rounded inline-flex items-center justify-center font-bold text-xs ${
                      st.rank === 1 ? 'bg-[#E2FF00] text-black shadow-[0_0_8px_rgba(226,255,0,0.3)]' : 'bg-white/10 text-white/70'
                    }`}>
                      0{st.rank}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-white font-sans text-sm">
                    {st.grade}학년 {st.classNum}반
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-[#E2FF00] text-sm">
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
