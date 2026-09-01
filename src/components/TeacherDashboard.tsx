import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  Users, 
  Calendar, 
  FileSpreadsheet, 
  Award, 
  Download, 
  Copy, 
  CheckCircle2, 
  RefreshCw, 
  Edit3, 
  Plus, 
  Trash2,
  Filter,
  Check
} from 'lucide-react';
import { GradeLevel, TieMatch, UserProfile, StudentRecordDraft } from '../types';
import { StorageService } from '../services/storageService';
import { GASService } from '../services/gasService';
import { StudentEvaluationService } from '../services/studentEvaluationService';

interface TeacherDashboardProps {
  currentUser: UserProfile | null;
  onOpenLogin: () => void;
  onOpenGAS: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentUser,
  onOpenLogin,
  onOpenGAS
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(currentUser?.role === 'TEACHER');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  // Dashboard Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'RECORD_GEN' | 'SCHEDULE_MGR' | 'SPORTS_REPS' | 'DATA_SYNC'>('RECORD_GEN');

  // Record Generator States
  const [recordGrade, setRecordGrade] = useState<GradeLevel>(1);
  const [recordClass, setRecordClass] = useState<number>(1);
  const [emphasis, setEmphasis] = useState<'BALANCED' | 'LEADERSHIP' | 'SKILL' | 'SPORTSMANSHIP' | 'GROWTH'>('BALANCED');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('');

  // Sports Reps States
  const [sportsReps, setSportsReps] = useState<Record<string, string>>(StorageService.getSportsRepresentatives());

  // Matches State
  const [matches, setMatches] = useState<TieMatch[]>(StorageService.getMatches());

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '4161') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('체육교사 접근 비밀번호가 일치하지 않습니다.');
    }
  };

  // If not authenticated as teacher yet
  if (!isAuthenticated && currentUser?.role !== 'TEACHER') {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-[#12192B] border border-white/10 rounded-2xl shadow-2xl space-y-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-xl bg-[#E2FF00]/10 border border-[#E2FF00]/30 flex items-center justify-center text-[#E2FF00]">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">체육교사 전용 대시보드</h2>
          <p className="text-xs text-white/50 mt-1.5 leading-relaxed">
            대진표 설정, 실시간 기록 감독, 체육부장 관리 및 <strong className="text-[#E2FF00]">생기부 세특 일괄 자동 생성</strong>은 교사 인증이 필요합니다.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="text-left">
            <label className="block text-xs font-semibold text-white/70 mb-1.5 font-mono">
              TEACHER ACCESS CODE
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full px-4 py-3 rounded-xl bg-[#0A0F1D] border border-white/10 text-center text-white text-lg font-mono font-bold tracking-widest placeholder-white/20 focus:outline-none focus:border-[#E2FF00]"
            />
          </div>

          {authError && (
            <div className="text-xs text-rose-400 font-medium font-mono">{authError}</div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold text-black bg-[#E2FF00] hover:opacity-90 shadow-[0_0_12px_rgba(226,255,0,0.3)] transition"
          >
            교사 대시보드 인증 로그인
          </button>
        </form>
      </div>
    );
  }

  // Get current class students for record generation
  const currentStudents = StorageService.getStudents(recordGrade, recordClass);
  const studentReports: StudentRecordDraft[] = currentStudents.map(student => {
    return StudentEvaluationService.generateStudentReport({
      studentName: student.name,
      grade: recordGrade,
      classNum: recordClass,
      studentNum: student.studentNum,
      emphasis
    });
  });

  const handleCopySingle = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    const headers = ['학년', '반', '번호', '이름', '출전경기수', '승수', '승률(%)', '작성소감문수', '교과세특문구', '행동특성및종합의견'];
    const rows = studentReports.map(r => [
      `${r.grade}학년`,
      `${r.classNum}반`,
      `${r.studentNum}번`,
      r.studentName,
      r.matchesPlayed,
      r.wins,
      `${r.winRate}%`,
      r.reflectionsCount,
      `"${r.generatedRecord.replace(/"/g, '""')}"`,
      `"${r.generatedRecordBehavior.replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `신안해양과학고_${recordGrade}학년_${recordClass}반_배드민턴_생기부_일괄생성.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateSportsRep = (grade: GradeLevel, classNum: number, name: string) => {
    const key = `${grade}-${classNum}`;
    const next = { ...sportsReps, [key]: name };
    setSportsReps(next);
    StorageService.saveSportsRepresentatives(next);
  };

  const handleTriggerGASFullSync = async () => {
    setIsSyncing(true);
    setSyncStatus('구글 시트로 데이터를 전송 중입니다...');
    const result = await GASService.syncAll();
    setIsSyncing(false);
    setSyncStatus(result.message);
  };

  return (
    <div className="space-y-6">
      
      {/* Teacher Master Banner */}
      <div className="p-6 rounded-2xl bg-[#12192B] border border-white/10 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#E2FF00]/10 border border-[#E2FF00]/30 text-[#E2FF00] text-xs font-mono font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>TEACHER MASTER CONTROL ACTIVE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            체육교사 & 학생자치회 <span className="text-[#E2FF00]">통합 운영 대시보드</span>
          </h2>
          <p className="text-xs text-white/50 mt-1">
            배드민턴 리그전 대진표 조정, 출전 명단 관리 및 <strong className="text-[#E2FF00]">학교생활기록부(세특) 일괄 추출</strong>이 가능합니다.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenGAS}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0A0F1D] hover:bg-white/5 text-white border border-white/10 transition flex items-center gap-2 font-mono"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#E2FF00]" />
            <span>GAS SPREADSHEET SYNC</span>
          </button>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-white/10">
        {[
          { id: 'RECORD_GEN', label: '생기부(세특) 자동생성기', icon: Sparkles },
          { id: 'SPORTS_REPS', label: '학급별 체육부장 지정', icon: Users },
          { id: 'SCHEDULE_MGR', label: '대진표 & 시간표 설정', icon: Calendar },
          { id: 'DATA_SYNC', label: '구글 시트 연동 & 백업', icon: RefreshCw }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                isActive
                  ? 'bg-[#E2FF00] text-black shadow-[0_0_12px_rgba(226,255,0,0.3)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Student Record (생기부) Generator */}
      {activeSubTab === 'RECORD_GEN' && (
        <div className="space-y-6">
          
          {/* Filter & Export Bar */}
          <div className="p-6 rounded-2xl bg-[#12192B] border border-white/10 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Grade select */}
                <select
                  value={recordGrade}
                  onChange={(e) => setRecordGrade(Number(e.target.value) as GradeLevel)}
                  className="px-3 py-2 rounded-xl bg-[#0A0F1D] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-[#E2FF00]"
                >
                  <option value={1}>1학년</option>
                  <option value={2}>2학년</option>
                </select>

                {/* Class select */}
                <select
                  value={recordClass}
                  onChange={(e) => setRecordClass(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl bg-[#0A0F1D] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-[#E2FF00]"
                >
                  <option value={1}>1반 (21명)</option>
                  <option value={2}>2반 (21명)</option>
                </select>

                {/* Emphasis tone */}
                <select
                  value={emphasis}
                  onChange={(e) => setEmphasis(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-[#0A0F1D] border border-[#E2FF00]/40 text-[#E2FF00] font-medium text-xs focus:outline-none"
                >
                  <option value="BALANCED">종합 균형형 (기본)</option>
                  <option value="LEADERSHIP">리더십 및 팀워크 강조</option>
                  <option value="SKILL">실기 기량(스매시/네트) 강조</option>
                  <option value="SPORTSMANSHIP">스포츠맨십 및 배려 강조</option>
                  <option value="GROWTH">자기성찰 및 성장 중심</option>
                </select>
              </div>

              {/* Bulk Export Button */}
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-black bg-[#E2FF00] hover:opacity-90 shadow-[0_0_12px_rgba(226,255,0,0.3)] transition"
              >
                <Download className="w-4 h-4 text-black" />
                <span>{recordGrade}학년 {recordClass}반 생기부 CSV 다운로드</span>
              </button>
            </div>

            <div className="text-xs text-white/50 bg-[#0A0F1D] p-3 rounded-xl border border-white/5">
              💡 <strong>생활기록부 알고리즘 안내:</strong> 학생의 실제 리그 출전 기록, 승패 전적, 종목별 활약, 작성한 성찰 일기의 향상 기술 키워드 및 스포츠맨십 평가를 바탕으로 교육부 NEIS 기재 표준에 맞춘 세특 문구가 실시간 조합됩니다.
            </div>
          </div>

          {/* Student Reports List Cards */}
          <div className="grid grid-cols-1 gap-4">
            {studentReports.map((report) => (
              <div
                key={report.studentNum}
                className="p-5 rounded-2xl bg-[#12192B] border border-white/10 hover:border-white/20 transition shadow-lg space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-[#E2FF00]/10 border border-[#E2FF00]/30 flex items-center justify-center text-[#E2FF00] font-mono font-bold text-xs">
                      0{report.studentNum}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{report.studentName} 학생</span>
                        <span className="text-[10px] text-white/40 font-mono">({report.grade}학년 {report.classNum}반 {report.studentNum}번)</span>
                      </h4>
                      <div className="text-[11px] text-white/50 flex items-center gap-3 mt-0.5 font-mono">
                        <span>전적: <strong className="text-white">{report.matchesPlayed}전 {report.wins}승</strong></span>
                        <span>승률: <strong className="text-[#E2FF00]">{report.winRate}%</strong></span>
                        <span>소감문: <strong className="text-blue-400">{report.reflectionsCount}건</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <button
                      onClick={() => handleCopySingle(report.generatedRecord, `setuk-${report.studentNum}`)}
                      className="px-3 py-1.5 rounded-lg font-medium bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition flex items-center gap-1.5"
                    >
                      {copiedId === `setuk-${report.studentNum}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#E2FF00]" />
                          <span className="text-[#E2FF00]">세특 복사완료</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>세특 문구 복사</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleCopySingle(report.generatedRecordBehavior, `behavior-${report.studentNum}`)}
                      className="px-3 py-1.5 rounded-lg font-medium bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition flex items-center gap-1.5"
                    >
                      {copiedId === `behavior-${report.studentNum}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#E2FF00]" />
                          <span className="text-[#E2FF00]">행특 복사완료</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>행특 문구 복사</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Generated Subject Record (세특) */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#E2FF00] block font-mono">[교과 세부능력 및 특기사항]</span>
                  <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-white/5 text-xs text-white/80 leading-relaxed font-sans">
                    {report.generatedRecord}
                  </div>
                </div>

                {/* Generated Behavior Record (행특) */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-blue-400 block font-mono">[행동특성 및 종합의견 참고문구]</span>
                  <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-white/5 text-xs text-white/70 leading-relaxed font-sans">
                    {report.generatedRecordBehavior}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB 2: Sports Reps Assignment */}
      {activeSubTab === 'SPORTS_REPS' && (
        <div className="p-6 rounded-2xl bg-[#12192B] border border-white/10 shadow-lg space-y-6">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#E2FF00]" />
              <span>각 반 체육부장 / 반장 관리</span>
            </h3>
            <p className="text-xs text-white/50 mt-1">
              지정된 체육부장은 로그인 시 자동으로 출전 명단 작성 및 수정 권한이 부여됩니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {['1-1', '1-2', '2-1', '2-2'].map(key => {
              const [g, c] = key.split('-');
              const grade = Number(g) as GradeLevel;
              const classNum = Number(c);
              const students = StorageService.getStudents(grade, classNum);
              const currentRep = sportsReps[key] || '';

              return (
                <div key={key} className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-2">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>{grade}학년 {classNum}반 체육부장</span>
                    <span className="text-[#E2FF00] font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E2FF00]/15">ACTIVE</span>
                  </div>

                  <select
                    value={currentRep}
                    onChange={(e) => handleUpdateSportsRep(grade, classNum, e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#12192B] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-[#E2FF00]"
                  >
                    <option value="">-- 체육부장 학생 선택 --</option>
                    {students.map(s => (
                      <option key={s.studentNum} value={s.name}>
                        {s.studentNum}번 {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Schedule & Timetable Manager */}
      {activeSubTab === 'SCHEDULE_MGR' && (
        <div className="p-6 rounded-2xl bg-[#12192B] border border-white/10 shadow-lg space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#E2FF00]" />
                <span>대진표 및 코트 배정 현황</span>
              </h3>
              <p className="text-xs text-white/50 mt-1">
                6개 라운드의 배정 코트(1·2코트: Match 1, 3·4코트: Match 2) 및 진행 상태를 확인할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {matches.map((tie) => {
              const teamAGrade = tie.teamAGrade || tie.grade;
              const teamBGrade = tie.teamBGrade || tie.grade;
              const matchNum = tie.id.endsWith('M1') ? 1 : 2;

              return (
                <div key={tie.id} className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <span className="px-2 py-0.5 rounded bg-[#E2FF00]/15 text-[#E2FF00] font-mono">
                        MATCH {matchNum} ({matchNum === 1 ? '제1·2코트' : '제3·4코트'})
                      </span>
                      <span>
                        제{tie.roundId}라운드 ({tie.date}) • {teamAGrade}학년 {tie.teamAClass}반 vs {teamBGrade}학년 {tie.teamBClass}반
                      </span>
                    </div>
                    <span className="text-white/50 font-mono">SCORE: {tie.teamAWins} - {tie.teamBWins}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                    {tie.subMatches.map(sm => (
                      <div key={sm.id} className="p-2.5 rounded-lg bg-[#12192B] border border-white/5 space-y-1">
                        <div className="font-bold text-[#E2FF00] text-[11px]">{sm.category}</div>
                        <div className="text-[10px] text-white/40 font-mono">{sm.court}</div>
                        <div className="text-[10px] font-bold text-white/90">
                          {sm.status === 'COMPLETED' ? `완료 (${sm.winnerTeam === 'A' ? `${teamAGrade}-${tie.teamAClass}` : `${teamBGrade}-${tie.teamBClass}`} 승)` : '예정'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: Data Sync & Reset */}
      {activeSubTab === 'DATA_SYNC' && (
        <div className="p-6 rounded-2xl bg-[#12192B] border border-white/10 shadow-lg space-y-6">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#E2FF00]" />
              <span>데이터 연동 및 백업 관리</span>
            </h3>
            <p className="text-xs text-white/50 mt-1">
              Google Apps Script(GAS)로 전체 경기 기록 및 소감문 데이터를 구글 스프레드시트에 일괄 백업합니다.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#0A0F1D] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">구글 스프레드시트 일괄 동기화</span>
              <button
                onClick={handleTriggerGASFullSync}
                disabled={isSyncing}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-[#E2FF00] hover:opacity-90 shadow-[0_0_12px_rgba(226,255,0,0.3)] disabled:opacity-50 transition flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? '동기화 중...' : '구글 시트 즉시 동기화'}</span>
              </button>
            </div>

            {syncStatus && (
              <div className="text-xs p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono">
                {syncStatus}
              </div>
            )}
          </div>

          {/* Reset button */}
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-rose-400">데이터 초기화 (공장 초기화)</div>
              <div className="text-[11px] text-white/40">모든 경기 결과 및 소감문 데이터를 기본 상태로 리셋합니다.</div>
            </div>
            <button
              onClick={() => {
                if (window.confirm('정말 모든 데이터를 초기화하시겠습니까?')) {
                  StorageService.resetToDefault();
                  window.location.reload();
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition"
            >
              초기화 실행
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
