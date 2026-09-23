import { 
  CategoryInfo, 
  RoundInfo, 
  Player, 
  TieMatch, 
  SubMatch, 
  GradeLevel
} from '../types';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'MEN_SINGLES',
    name: '남자 단식',
    shortName: '남단',
    playersPerTeam: 1,
    description: '남자 1인 출전 단식 경기 (단판 15점 경기)',
    iconName: 'User'
  },
  {
    id: 'WOMEN_SINGLES',
    name: '여자 단식',
    shortName: '여단',
    playersPerTeam: 1,
    description: '여자 1인 출전 단식 경기 (단판 15점 경기)',
    iconName: 'UserCheck'
  },
  {
    id: 'MEN_DOUBLES',
    name: '남자 복식',
    shortName: '남복',
    playersPerTeam: 2,
    description: '남자 2인 1조 복식 경기 (단판 15점 경기)',
    iconName: 'Users'
  },
  {
    id: 'WOMEN_DOUBLES',
    name: '여자 복식',
    shortName: '여복',
    playersPerTeam: 2,
    description: '여자 2인 1조 복식 경기 (단판 15점 경기)',
    iconName: 'Users'
  },
  {
    id: 'MIXED_DOUBLES',
    name: '혼합 복식',
    shortName: '혼복',
    playersPerTeam: 2,
    description: '남학생 1명 + 여학생 1명 팀워크 혼합 복식 경기 (단판 15점 경기)',
    iconName: 'HeartHandshake'
  }
];

export const LEAGUE_ROUNDS: RoundInfo[] = [
  {
    id: 1,
    roundNumber: 1,
    title: '제1라운드 (1-1 VS 1-2 / 2-1 VS 2-2)',
    date: '2026. 09. 14 (월)',
    dateRaw: '2026-09-14',
    deadlineDate: '2026-09-13 23:59',
    dayOfWeek: '월요일',
    description: '1·2학년 통합 리그 개막전 (1-1 vs 1-2, 2-1 vs 2-2)',
    isFinished: false
  },
  {
    id: 2,
    roundNumber: 2,
    title: '제2라운드 (1-1 VS 2-1 / 1-2 VS 2-2)',
    date: '2026. 09. 22 (화)',
    dateRaw: '2026-09-22',
    deadlineDate: '2026-09-21 23:59',
    dayOfWeek: '화요일',
    description: '학년 간 교차 맞대결 (1-1 vs 2-1, 1-2 vs 2-2)',
    isFinished: false
  },
  {
    id: 3,
    roundNumber: 3,
    title: '제3라운드 (1-2 VS 2-1 / 1-1 VS 2-2)',
    date: '2026. 09. 30 (수)',
    dateRaw: '2026-09-30',
    deadlineDate: '2026-09-29 23:59',
    dayOfWeek: '수요일',
    description: '전반기 교차 결전 (1-2 vs 2-1, 1-1 vs 2-2)',
    isFinished: false
  },
  {
    id: 4,
    roundNumber: 4,
    title: '제4라운드 (1-1 VS 1-2 / 2-1 VS 2-2)',
    date: '2026. 10. 07 (수)',
    dateRaw: '2026-10-07',
    deadlineDate: '2026-10-06 23:59',
    dayOfWeek: '수요일',
    description: '후반기 동학년 리턴 매치 (1-1 vs 1-2, 2-1 vs 2-2)',
    isFinished: false
  },
  {
    id: 5,
    roundNumber: 5,
    title: '제5라운드 (1-1 VS 2-1 / 1-2 VS 2-2)',
    date: '2026. 10. 28 (수)',
    dateRaw: '2026-10-28',
    deadlineDate: '2026-10-27 23:59',
    dayOfWeek: '수요일',
    description: '후반기 교차 리턴 매치 (1-1 vs 2-1, 1-2 vs 2-2)',
    isFinished: false
  },
  {
    id: 6,
    roundNumber: 6,
    title: '제6라운드 (1-2 VS 2-1 / 1-1 VS 2-2)',
    date: '2026. 11. 04 (수)',
    dateRaw: '2026-11-04',
    deadlineDate: '2026-11-03 23:59',
    dayOfWeek: '수요일',
    description: '최종 챔피언십 파이널 매치 (1-2 vs 2-1, 1-1 vs 2-2)',
    isFinished: false
  }
];

// Official Student Roster (신안해양과학고등학교 배드민턴 리그 명단)
export const OFFICIAL_STUDENTS_ROSTER: Record<string, { num: number; name: string; gender: 'M' | 'F' }[]> = {
  '1-1': [
    { num: 1, name: '곽승준', gender: 'M' },
    { num: 2, name: '김건우', gender: 'M' },
    { num: 3, name: '김준성', gender: 'M' },
    { num: 4, name: '김현지', gender: 'F' },
    { num: 5, name: '명지호', gender: 'M' },
    { num: 7, name: '박주영', gender: 'M' },
    { num: 8, name: '박호연', gender: 'M' },
    { num: 9, name: '백호', gender: 'M' },
    { num: 10, name: '선준혁', gender: 'M' },
    { num: 11, name: '송현우', gender: 'M' },
    { num: 12, name: '양준성', gender: 'M' },
    { num: 13, name: '이관훈', gender: 'M' },
    { num: 14, name: '이민수', gender: 'M' },
    { num: 16, name: '이예준', gender: 'M' },
    { num: 17, name: '임솔지', gender: 'F' },
    { num: 18, name: '장범석', gender: 'M' },
    { num: 19, name: '정찬주', gender: 'F' },
    { num: 20, name: '조희우', gender: 'F' },
    { num: 21, name: '홍서현', gender: 'M' }
  ],
  '1-2': [
    { num: 1, name: '강성수', gender: 'M' },
    { num: 3, name: '김보현', gender: 'F' },
    { num: 4, name: '김예준', gender: 'M' },
    { num: 5, name: '문경호', gender: 'M' },
    { num: 6, name: '박이한', gender: 'M' },
    { num: 7, name: '박해일', gender: 'M' },
    { num: 8, name: '백승광', gender: 'M' },
    { num: 9, name: '백현주', gender: 'F' },
    { num: 10, name: '신예영', gender: 'F' },
    { num: 11, name: '윤호현', gender: 'M' },
    { num: 12, name: '이진우', gender: 'M' },
    { num: 13, name: '이진주', gender: 'F' },
    { num: 14, name: '이진혁', gender: 'M' },
    { num: 15, name: '이채아', gender: 'F' },
    { num: 16, name: '정솔비', gender: 'F' },
    { num: 17, name: '조하얀', gender: 'M' },
    { num: 18, name: '주단비', gender: 'F' },
    { num: 19, name: '최우진', gender: 'M' }
  ],
  '2-1': [
    { num: 1, name: '강성률', gender: 'M' },
    { num: 2, name: '고아영', gender: 'F' },
    { num: 3, name: '김서윤', gender: 'F' },
    { num: 4, name: '김서준', gender: 'M' },
    { num: 5, name: '김승준', gender: 'M' },
    { num: 6, name: '김예찬', gender: 'M' },
    { num: 7, name: '김주엘', gender: 'M' },
    { num: 8, name: '김현우', gender: 'M' },
    { num: 9, name: '신승민', gender: 'M' },
    { num: 10, name: '안현서', gender: 'M' },
    { num: 11, name: '이하늘', gender: 'M' },
    { num: 13, name: '장준혁', gender: 'M' },
    { num: 14, name: '정서연', gender: 'F' },
    { num: 15, name: '주시은', gender: 'F' },
    { num: 16, name: '주혜진', gender: 'F' },
    { num: 17, name: '한주아', gender: 'F' },
    { num: 18, name: '한준범', gender: 'M' }
  ],
  '2-2': [
    { num: 2, name: '김대륜', gender: 'M' },
    { num: 3, name: '김승민', gender: 'M' },
    { num: 5, name: '문경원', gender: 'F' },
    { num: 6, name: '문대호', gender: 'M' },
    { num: 7, name: '박대성', gender: 'M' },
    { num: 8, name: '박찬수', gender: 'M' },
    { num: 9, name: '승주빈', gender: 'M' },
    { num: 10, name: '유동준', gender: 'M' },
    { num: 11, name: '이민서', gender: 'M' },
    { num: 12, name: '이태형', gender: 'M' },
    { num: 13, name: '장성효', gender: 'F' },
    { num: 14, name: '진재원', gender: 'M' },
    { num: 15, name: '최가은', gender: 'F' },
    { num: 16, name: '최지윤', gender: 'F' },
    { num: 17, name: '하태민', gender: 'M' }
  ]
};

const createClassRoster = (grade: 1 | 2, classNum: number): Player[] => {
  const key = `${grade}-${classNum}`;
  const list = OFFICIAL_STUDENTS_ROSTER[key] || [];
  return list.map(item => ({
    grade,
    classNum,
    studentNum: item.num,
    name: item.name,
    gender: item.gender
  }));
};

export const SAMPLE_STUDENTS: Record<string, Player[]> = {
  '1-1': createClassRoster(1, 1),
  '1-2': createClassRoster(1, 2),
  '2-1': createClassRoster(2, 1),
  '2-2': createClassRoster(2, 2),
};

// Default Sports Representatives (체육부장 / 반장)
export const DEFAULT_SPORTS_REPRESENTATIVES: Record<string, string> = {
  '1-1': '선준혁',
  '1-2': '김예준',
  '2-1': '김예찬',
  '2-2': '박찬수'
};

export interface DefaultAssignedRole {
  id: string;
  grade: GradeLevel;
  classNum: number;
  studentNum: number;
  name: string;
  role: 'captain' | 'council';
  assignedAt: string;
  assignedBy?: string;
}

// Default Assigned Roles (체육부장/반장 및 학생자치회 명단)
export const DEFAULT_ASSIGNED_ROLES: DefaultAssignedRole[] = [
  // 체육부장 / 반장 (4명)
  { id: '1-1-10-captain', grade: 1, classNum: 1, studentNum: 10, name: '선준혁', role: 'captain', assignedAt: '2026-03-01T00:00:00Z', assignedBy: '체육교사' },
  { id: '1-2-4-captain', grade: 1, classNum: 2, studentNum: 4, name: '김예준', role: 'captain', assignedAt: '2026-03-01T00:00:00Z', assignedBy: '체육교사' },
  { id: '2-1-6-captain', grade: 2, classNum: 1, studentNum: 6, name: '김예찬', role: 'captain', assignedAt: '2026-03-01T00:00:00Z', assignedBy: '체육교사' },
  { id: '2-2-8-captain', grade: 2, classNum: 2, studentNum: 8, name: '박찬수', role: 'captain', assignedAt: '2026-03-01T00:00:00Z', assignedBy: '체육교사' },

  // 학생자치회 (7명)
  { id: '1-1-10-council', grade: 1, classNum: 1, studentNum: 10, name: '선준혁', role: 'council', assignedAt: '2026-03-01T00:00:00Z', assignedBy: '체육교사' },
  { id: '1-1-8-council', grade: 1, classNum: 1, studentNum: 8, name: '박호연', role: 'council', assignedAt: '2026-03-01T00:00:00Z', assignedBy: '체육교사' },
  { id: '2-1-1-council', grade: 2, classNum: 1, studentNum: 1, name: '강성률', role: 'council', assignedAt: '2026-03-01T00:00:00Z', assignedBy: '체육교사' },
  { id: '2-1-11-council', grade: 2, classNum: 1, studentNum: 11, name: '이하늘', role: 'council', assignedAt: '2026-03-01T00:00:00Z', assignedBy: '체육교사' },
  { id: '2-1-4-council', grade: 2, classNum: 1, studentNum: 4, name: '김서준', role: 'council', assignedAt: '2026-03-01T00:00:00Z', assignedBy: '체육교사' },
  { id: '2-1-8-council', grade: 2, classNum: 1, studentNum: 8, name: '김현우', role: 'council', assignedAt: '2026-03-01T00:00:00Z', assignedBy: '체육교사' },
  { id: '2-2-17-council', grade: 2, classNum: 2, studentNum: 17, name: '하태민', role: 'council', assignedAt: '2026-03-01T00:00:00Z', assignedBy: '체육교사' }
];

// Helper to create 5 submatches per tie match (Single-set 15-point games)
// Match 1 -> Court 1, Court 2 | Match 2 -> Court 3, Court 4
const createSubMatches = (tieIdPrefix: string, isMatch2: boolean = false): SubMatch[] => {
  const courtMain = isMatch2 ? '제3코트' : '제1코트';
  const courtSub = isMatch2 ? '제4코트' : '제2코트';

  return [
    {
      id: `${tieIdPrefix}-MS`,
      category: 'MEN_SINGLES',
      court: courtMain,
      scheduledTime: '',
      teamAPlayers: [],
      teamBPlayers: [],
      sets: [{ setNumber: 1, scoreA: 0, scoreB: 0 }],
      status: 'UPCOMING'
    },
    {
      id: `${tieIdPrefix}-WS`,
      category: 'WOMEN_SINGLES',
      court: courtSub,
      scheduledTime: '',
      teamAPlayers: [],
      teamBPlayers: [],
      sets: [{ setNumber: 1, scoreA: 0, scoreB: 0 }],
      status: 'UPCOMING'
    },
    {
      id: `${tieIdPrefix}-MD`,
      category: 'MEN_DOUBLES',
      court: courtMain,
      scheduledTime: '',
      teamAPlayers: [],
      teamBPlayers: [],
      sets: [{ setNumber: 1, scoreA: 0, scoreB: 0 }],
      status: 'UPCOMING'
    },
    {
      id: `${tieIdPrefix}-WD`,
      category: 'WOMEN_DOUBLES',
      court: courtSub,
      scheduledTime: '',
      teamAPlayers: [],
      teamBPlayers: [],
      sets: [{ setNumber: 1, scoreA: 0, scoreB: 0 }],
      status: 'UPCOMING'
    },
    {
      id: `${tieIdPrefix}-XD`,
      category: 'MIXED_DOUBLES',
      court: courtMain,
      scheduledTime: '',
      teamAPlayers: [],
      teamBPlayers: [],
      sets: [{ setNumber: 1, scoreA: 0, scoreB: 0 }],
      status: 'UPCOMING'
    }
  ];
};

export const INITIAL_TIE_MATCHES: TieMatch[] = [
  // ==========================================
  // ROUND 1: 1-1 VS 1-2, 2-1 VS 2-2
  // ==========================================
  {
    id: 'TIE-R1-M1',
    roundId: 1,
    grade: 1,
    teamAGrade: 1,
    teamAClass: 1,
    teamBGrade: 1,
    teamBClass: 2,
    date: '2026. 09. 14 (월)',
    deadlineDate: '2026-09-13 23:59',
    teamAWins: 0,
    teamBWins: 0,
    status: 'PENDING_LINEUP',
    subMatches: createSubMatches('SM-R1-M1', false)
  },
  {
    id: 'TIE-R1-M2',
    roundId: 1,
    grade: 2,
    teamAGrade: 2,
    teamAClass: 1,
    teamBGrade: 2,
    teamBClass: 2,
    date: '2026. 09. 14 (월)',
    deadlineDate: '2026-09-13 23:59',
    teamAWins: 0,
    teamBWins: 0,
    status: 'PENDING_LINEUP',
    subMatches: createSubMatches('SM-R1-M2', true)
  },

  // ==========================================
  // ROUND 2: 1-1 VS 2-1, 1-2 VS 2-2
  // ==========================================
  {
    id: 'TIE-R2-M1',
    roundId: 2,
    grade: 1,
    teamAGrade: 1,
    teamAClass: 1,
    teamBGrade: 2,
    teamBClass: 1,
    date: '2026. 09. 22 (화)',
    deadlineDate: '2026-09-21 23:59',
    teamAWins: 0,
    teamBWins: 0,
    status: 'PENDING_LINEUP',
    subMatches: createSubMatches('SM-R2-M1', false)
  },
  {
    id: 'TIE-R2-M2',
    roundId: 2,
    grade: 1,
    teamAGrade: 1,
    teamAClass: 2,
    teamBGrade: 2,
    teamBClass: 2,
    date: '2026. 09. 22 (화)',
    deadlineDate: '2026-09-21 23:59',
    teamAWins: 0,
    teamBWins: 0,
    status: 'PENDING_LINEUP',
    subMatches: createSubMatches('SM-R2-M2', true)
  },

  // ==========================================
  // ROUND 3: 1-2 VS 2-1, 1-1 VS 2-2
  // ==========================================
  {
    id: 'TIE-R3-M1',
    roundId: 3,
    grade: 1,
    teamAGrade: 1,
    teamAClass: 2,
    teamBGrade: 2,
    teamBClass: 1,
    date: '2026. 09. 30 (수)',
    deadlineDate: '2026-09-29 23:59',
    teamAWins: 0,
    teamBWins: 0,
    status: 'PENDING_LINEUP',
    subMatches: createSubMatches('SM-R3-M1', false)
  },
  {
    id: 'TIE-R3-M2',
    roundId: 3,
    grade: 1,
    teamAGrade: 1,
    teamAClass: 1,
    teamBGrade: 2,
    teamBClass: 2,
    date: '2026. 09. 30 (수)',
    deadlineDate: '2026-09-29 23:59',
    teamAWins: 0,
    teamBWins: 0,
    status: 'PENDING_LINEUP',
    subMatches: createSubMatches('SM-R3-M2', true)
  },

  // ==========================================
  // ROUND 4: 1-1 VS 1-2, 2-1 VS 2-2
  // ==========================================
  {
    id: 'TIE-R4-M1',
    roundId: 4,
    grade: 1,
    teamAGrade: 1,
    teamAClass: 1,
    teamBGrade: 1,
    teamBClass: 2,
    date: '2026. 10. 07 (수)',
    deadlineDate: '2026-10-06 23:59',
    teamAWins: 0,
    teamBWins: 0,
    status: 'PENDING_LINEUP',
    subMatches: createSubMatches('SM-R4-M1', false)
  },
  {
    id: 'TIE-R4-M2',
    roundId: 4,
    grade: 2,
    teamAGrade: 2,
    teamAClass: 1,
    teamBGrade: 2,
    teamBClass: 2,
    date: '2026. 10. 07 (수)',
    deadlineDate: '2026-10-06 23:59',
    teamAWins: 0,
    teamBWins: 0,
    status: 'PENDING_LINEUP',
    subMatches: createSubMatches('SM-R4-M2', true)
  },

  // ==========================================
  // ROUND 5: 1-1 VS 2-1, 1-2 VS 2-2
  // ==========================================
  {
    id: 'TIE-R5-M1',
    roundId: 5,
    grade: 1,
    teamAGrade: 1,
    teamAClass: 1,
    teamBGrade: 2,
    teamBClass: 1,
    date: '2026. 10. 28 (수)',
    deadlineDate: '2026-10-27 23:59',
    teamAWins: 0,
    teamBWins: 0,
    status: 'PENDING_LINEUP',
    subMatches: createSubMatches('SM-R5-M1', false)
  },
  {
    id: 'TIE-R5-M2',
    roundId: 5,
    grade: 1,
    teamAGrade: 1,
    teamAClass: 2,
    teamBGrade: 2,
    teamBClass: 2,
    date: '2026. 10. 28 (수)',
    deadlineDate: '2026-10-27 23:59',
    teamAWins: 0,
    teamBWins: 0,
    status: 'PENDING_LINEUP',
    subMatches: createSubMatches('SM-R5-M2', true)
  },

  // ==========================================
  // ROUND 6: 1-2 VS 2-1, 1-1 VS 2-2
  // ==========================================
  {
    id: 'TIE-R6-M1',
    roundId: 6,
    grade: 1,
    teamAGrade: 1,
    teamAClass: 2,
    teamBGrade: 2,
    teamBClass: 1,
    date: '2026. 11. 04 (수)',
    deadlineDate: '2026-11-03 23:59',
    teamAWins: 0,
    teamBWins: 0,
    status: 'PENDING_LINEUP',
    subMatches: createSubMatches('SM-R6-M1', false)
  },
  {
    id: 'TIE-R6-M2',
    roundId: 6,
    grade: 1,
    teamAGrade: 1,
    teamAClass: 1,
    teamBGrade: 2,
    teamBClass: 2,
    date: '2026. 11. 04 (수)',
    deadlineDate: '2026-11-03 23:59',
    teamAWins: 0,
    teamBWins: 0,
    status: 'PENDING_LINEUP',
    subMatches: createSubMatches('SM-R6-M2', true)
  }
];
