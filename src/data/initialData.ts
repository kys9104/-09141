import { 
  CategoryInfo, 
  RoundInfo, 
  Player, 
  TieMatch, 
  SubMatch, 
  StudentReflection,
  GASConfig
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
    date: '2026. 09. 21 (월)',
    dateRaw: '2026-09-21',
    deadlineDate: '2026-09-20 23:59',
    dayOfWeek: '월요일',
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

// Generate anonymized roster of 21 students for each class (1~10: Male, 11~21: Female)
const createClassRoster = (grade: 1 | 2, classNum: number): Player[] => {
  const list: Player[] = [];
  for (let num = 1; num <= 21; num++) {
    list.push({
      grade,
      classNum,
      studentNum: num,
      name: `${num}번 학생`,
      gender: num <= 10 ? 'M' : 'F'
    });
  }
  return list;
};

export const SAMPLE_STUDENTS: Record<string, Player[]> = {
  '1-1': createClassRoster(1, 1),
  '1-2': createClassRoster(1, 2),
  '1-3': createClassRoster(1, 3),
  '2-1': createClassRoster(2, 1),
  '2-2': createClassRoster(2, 2),
  '2-3': createClassRoster(2, 3),
};

// Default Sports Representatives
export const DEFAULT_SPORTS_REPRESENTATIVES: Record<string, string> = {
  '1-1': '1번 학생',
  '1-2': '1번 학생',
  '1-3': '1번 학생',
  '2-1': '1번 학생',
  '2-2': '1번 학생',
  '2-3': '1번 학생'
};

// Helper to create 5 submatches per tie match (Single-set 15-point games)
const createSubMatches = (tieIdPrefix: string): SubMatch[] => [
  {
    id: `${tieIdPrefix}-MS`,
    category: 'MEN_SINGLES',
    court: '제1코트',
    scheduledTime: '13:30',
    teamAPlayers: [],
    teamBPlayers: [],
    sets: [{ setNumber: 1, scoreA: 0, scoreB: 0 }],
    status: 'UPCOMING'
  },
  {
    id: `${tieIdPrefix}-WS`,
    category: 'WOMEN_SINGLES',
    court: '제2코트',
    scheduledTime: '13:30',
    teamAPlayers: [],
    teamBPlayers: [],
    sets: [{ setNumber: 1, scoreA: 0, scoreB: 0 }],
    status: 'UPCOMING'
  },
  {
    id: `${tieIdPrefix}-MD`,
    category: 'MEN_DOUBLES',
    court: '제1코트',
    scheduledTime: '14:00',
    teamAPlayers: [],
    teamBPlayers: [],
    sets: [{ setNumber: 1, scoreA: 0, scoreB: 0 }],
    status: 'UPCOMING'
  },
  {
    id: `${tieIdPrefix}-WD`,
    category: 'WOMEN_DOUBLES',
    court: '제2코트',
    scheduledTime: '14:00',
    teamAPlayers: [],
    teamBPlayers: [],
    sets: [{ setNumber: 1, scoreA: 0, scoreB: 0 }],
    status: 'UPCOMING'
  },
  {
    id: `${tieIdPrefix}-XD`,
    category: 'MIXED_DOUBLES',
    court: '제1코트',
    scheduledTime: '14:30',
    teamAPlayers: [],
    teamBPlayers: [],
    sets: [{ setNumber: 1, scoreA: 0, scoreB: 0 }],
    status: 'UPCOMING'
  }
];

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
    subMatches: createSubMatches('SM-R1-M1')
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
    subMatches: createSubMatches('SM-R1-M2')
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
    date: '2026. 09. 21 (월)',
    deadlineDate: '2026-09-20 23:59',
    teamAWins: 0,
    teamBWins: 0,
    status: 'PENDING_LINEUP',
    subMatches: createSubMatches('SM-R2-M1')
  },
  {
    id: 'TIE-R2-M2',
    roundId: 2,
    grade: 1,
    teamAGrade: 1,
    teamAClass: 2,
    teamBGrade: 2,
    teamBClass: 2,
    date: '2026. 09. 21 (월)',
    deadlineDate: '2026-09-20 23:59',
    teamAWins: 0,
    teamBWins: 0,
    status: 'PENDING_LINEUP',
    subMatches: createSubMatches('SM-R2-M2')
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
    subMatches: createSubMatches('SM-R3-M1')
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
    subMatches: createSubMatches('SM-R3-M2')
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
    subMatches: createSubMatches('SM-R4-M1')
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
    subMatches: createSubMatches('SM-R4-M2')
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
    subMatches: createSubMatches('SM-R5-M1')
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
    subMatches: createSubMatches('SM-R5-M2')
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
    subMatches: createSubMatches('SM-R6-M1')
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
    subMatches: createSubMatches('SM-R6-M2')
  }
];

export const INITIAL_REFLECTIONS: StudentReflection[] = [];

export const INITIAL_GAS_CONFIG: GASConfig = {
  webAppUrl: '',
  autoSync: true,
  status: 'DISCONNECTED'
};
