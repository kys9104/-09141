export type GradeLevel = 1 | 2;

export type UserRole = 
  | 'admin'    // ① 체육교사(Admin): 전체 결과 관리(수정/삭제), GAS URL 설정, 반장/체육부장 권한 부여
  | 'captain'  // ② 지정된 반장 및 체육부장: 자기 반의 출전명단(Roster) 작성 및 제출 전용
  | 'council'  // ③ 학생자치회: 경기 결과(점수 등) 입력 전용
  | 'student'  // ④ 일반 학생: 모든 명단과 경기 결과 조회 전용
  | 'TEACHER'  // 레거시 호환
  | 'SPORTS_REP' 
  | 'STUDENT_COUNCIL' 
  | 'STUDENT';

export function isAdminRole(role?: string): boolean {
  return role === 'admin' || role === 'TEACHER';
}

export function isCaptainRole(role?: string): boolean {
  return role === 'captain' || role === 'SPORTS_REP' || isAdminRole(role);
}

export function isCouncilRole(role?: string): boolean {
  return role === 'council' || role === 'STUDENT_COUNCIL' || isAdminRole(role);
}

export function isStudentOnlyRole(role?: string): boolean {
  return !role || role === 'student' || role === 'STUDENT';
}

export interface UserProfile {
  uid?: string;
  email?: string;
  grade: GradeLevel;
  classNum: number;
  studentNum: number;
  name: string;
  role: UserRole;
  isSportsRep?: boolean;
}

export type MatchCategory = 
  | 'MEN_SINGLES'      // 남자 단식
  | 'WOMEN_SINGLES'    // 여자 단식
  | 'MEN_DOUBLES'      // 남자 복식
  | 'WOMEN_DOUBLES'    // 여자 복식
  | 'MIXED_DOUBLES';   // 혼합 복식

export interface CategoryInfo {
  id: MatchCategory;
  name: string;
  shortName: string;
  playersPerTeam: number;
  description: string;
  iconName: string;
}

export interface Player {
  grade: GradeLevel;
  classNum: number;
  studentNum: number;
  name: string;
  gender: 'M' | 'F';
}

export interface LineupEntry {
  id: string;
  roundId: number;
  grade: GradeLevel;
  classNum: number;
  category: MatchCategory;
  players: Player[];
  submittedBy: string;
  submittedAt: string; // ISO date string
  isLocked: boolean;
}

export interface SetScore {
  setNumber: number;
  scoreA: number;
  scoreB: number;
}

export interface MatchStats {
  smashWinnersA?: number;
  smashWinnersB?: number;
  dropPointsA?: number;
  dropPointsB?: number;
  netPointsA?: number;
  netPointsB?: number;
  serviceAcesA?: number;
  serviceAcesB?: number;
  unforcedErrorsA?: number;
  unforcedErrorsB?: number;
  mvpPlayerName?: string;
  durationMinutes?: number;
}

export interface SubMatch {
  id: string;
  category: MatchCategory;
  court: string;
  scheduledTime: string; // e.g. "13:30"
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  sets: SetScore[];
  winnerTeam?: 'A' | 'B' | 'DRAW';
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  currentSet?: number;
  currentScoreA?: number;
  currentScoreB?: number;
  servingTeam?: 'A' | 'B';
  stats?: MatchStats;
  referee?: string;
  recordedBy?: string;
}

export interface TieMatch {
  id: string;
  roundId: number;
  grade?: GradeLevel;
  teamAGrade: GradeLevel;
  teamAClass: number; // e.g. 1 (1반)
  teamBGrade: GradeLevel;
  teamBClass: number; // e.g. 2 (2반)
  date: string; // "2026. 09. 14 (월)"
  deadlineDate: string; // "2026. 09. 13 23:59"
  subMatches: SubMatch[];
  winnerTeamKey?: string; // e.g. "1-1" or "2-1"
  winnerClass?: number; // winning class number
  teamAWins: number; // number of submatches won by Team A
  teamBWins: number; // number of submatches won by Team B
  status: 'PENDING_LINEUP' | 'LINEUP_COMPLETED' | 'READY_TO_PLAY' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface RoundInfo {
  id: number;
  roundNumber: number;
  title: string;
  date: string;
  dateRaw: string; // YYYY-MM-DD
  deadlineDate: string; // YYYY-MM-DD HH:mm
  dayOfWeek: string;
  description: string;
  isFinished: boolean;
}

export interface ClassStanding {
  grade: GradeLevel;
  classNum: number;
  teamKey: string; // e.g. "1-1", "1-2", "2-1", "2-2"
  className: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number; // 승점 (승 3, 무 1, 패 0)
  subMatchWon: number;
  subMatchLost: number;
  subMatchDiff: number;
  scoreWon: number;
  scoreLost: number;
  scoreDiff: number;
  rank: number;
}

export interface GASConfig {
  webAppUrl: string;
  autoSync: boolean;
  lastSyncedAt?: string;
  status: 'DISCONNECTED' | 'CONNECTED' | 'ERROR';
}
