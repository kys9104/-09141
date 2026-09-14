import { 
  TieMatch, 
  ClassStanding, 
  Player, 
  GradeLevel, 
  GASConfig, 
  UserProfile,
  LineupEntry,
  MatchCategory
} from '../types';
import { 
  INITIAL_TIE_MATCHES, 
  DEFAULT_SPORTS_REPRESENTATIVES,
  INITIAL_GAS_CONFIG,
  SAMPLE_STUDENTS
} from '../data/initialData';

const STORAGE_KEYS = {
  TIE_MATCHES: 'sinan_badminton_matches_v8',
  SPORTS_REPS: 'sinan_badminton_sports_reps_v8',
  GAS_CONFIG: 'sinan_badminton_gas_config_v8',
  CURRENT_USER: 'sinan_badminton_current_user_v8',
  LINEUPS: 'sinan_badminton_lineups_v8',
  CUSTOM_STUDENTS: 'sinan_badminton_students_v8',
  ASSIGNED_ROLES: 'sinan_badminton_assigned_roles_v9'
};

export interface AssignedRoleRecord {
  id: string;
  grade: GradeLevel;
  classNum: number;
  studentNum: number;
  name: string;
  role: 'captain' | 'council';
  assignedAt: string;
  assignedBy?: string;
}

export class StorageService {
  /**
   * Always merges incoming matches with INITIAL_TIE_MATCHES so no rounds/matches are lost
   */
  static mergeMatchesWithInitial(incomingMatches: TieMatch[]): TieMatch[] {
    if (!incomingMatches || !Array.isArray(incomingMatches) || incomingMatches.length === 0) {
      return INITIAL_TIE_MATCHES;
    }
    return INITIAL_TIE_MATCHES.map(baseMatch => {
      const found = incomingMatches.find(m => m.id === baseMatch.id);
      if (!found) return baseMatch;
      return {
        ...baseMatch,
        ...found,
        subMatches: baseMatch.subMatches.map(baseSm => {
          const foundSm = found.subMatches?.find(s => s.id === baseSm.id || s.category === baseSm.category);
          if (!foundSm) return baseSm;
          const mergedTeamA = (foundSm.teamAPlayers && foundSm.teamAPlayers.length > 0) ? foundSm.teamAPlayers : (baseSm.teamAPlayers || []);
          const mergedTeamB = (foundSm.teamBPlayers && foundSm.teamBPlayers.length > 0) ? foundSm.teamBPlayers : (baseSm.teamBPlayers || []);
          return {
            ...baseSm,
            ...foundSm,
            teamAPlayers: mergedTeamA,
            teamBPlayers: mergedTeamB
          };
        })
      };
    });
  }

  static getMatches(): TieMatch[] {
    try {
      let matches = INITIAL_TIE_MATCHES;
      const data = localStorage.getItem(STORAGE_KEYS.TIE_MATCHES);
      if (data) {
        const parsed = JSON.parse(data);
        matches = this.mergeMatchesWithInitial(parsed);
      }

      // Auto-hydrate matches with any submitted rosters from STORAGE_KEYS.LINEUPS
      const rosters = this.getRosters();
      if (rosters && rosters.length > 0) {
        matches = matches.map(tie => {
          const teamAGrade = tie.teamAGrade || tie.grade || 1;
          const teamBGrade = tie.teamBGrade || tie.grade || 1;
          let hasAnyLineup = false;

          const updatedSubMatches = tie.subMatches.map(sm => {
            let teamAPlayers = sm.teamAPlayers && sm.teamAPlayers.length > 0 ? [...sm.teamAPlayers] : [];
            let teamBPlayers = sm.teamBPlayers && sm.teamBPlayers.length > 0 ? [...sm.teamBPlayers] : [];

            // Find roster for Team A
            const rosterA = rosters.find(r => 
              r.roundId === tie.roundId && 
              r.grade === teamAGrade && 
              r.classNum === tie.teamAClass && 
              r.category === sm.category
            );
            if (rosterA && rosterA.players && rosterA.players.length > 0) {
              teamAPlayers = rosterA.players;
              hasAnyLineup = true;
            }

            // Find roster for Team B
            const rosterB = rosters.find(r => 
              r.roundId === tie.roundId && 
              r.grade === teamBGrade && 
              r.classNum === tie.teamBClass && 
              r.category === sm.category
            );
            if (rosterB && rosterB.players && rosterB.players.length > 0) {
              teamBPlayers = rosterB.players;
              hasAnyLineup = true;
            }

            return {
              ...sm,
              teamAPlayers,
              teamBPlayers
            };
          });

          return {
            ...tie,
            subMatches: updatedSubMatches,
            status: (hasAnyLineup && tie.status === 'PENDING_LINEUP') ? 'READY_TO_PLAY' : tie.status
          };
        });
      }

      return matches;
    } catch (e) {
      console.error('Failed to parse matches from localStorage', e);
    }
    return INITIAL_TIE_MATCHES;
  }

  static saveMatches(matches: TieMatch[]): void {
    try {
      const merged = this.mergeMatchesWithInitial(matches);
      localStorage.setItem(STORAGE_KEYS.TIE_MATCHES, JSON.stringify(merged));
    } catch (e) {
      console.error('Failed to save matches', e);
    }
  }

  static getSportsRepresentatives(): Record<string, string> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SPORTS_REPS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse sports reps', e);
    }
    return DEFAULT_SPORTS_REPRESENTATIVES;
  }

  static saveSportsRepresentatives(reps: Record<string, string>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SPORTS_REPS, JSON.stringify(reps));
    } catch (e) {
      console.error('Failed to save sports reps', e);
    }
  }

  static setSportsRepresentative(grade: GradeLevel, classNum: number, name: string): void {
    const reps = this.getSportsRepresentatives();
    reps[`${grade}-${classNum}`] = name;
    this.saveSportsRepresentatives(reps);
  }

  // ==========================================
  // ASSIGNED ROLES (반장/체육부장 & 학생자치회)
  // ==========================================
  static getAssignedRoles(): AssignedRoleRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ASSIGNED_ROLES);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse assigned roles', e);
    }
    return [];
  }

  static saveAssignedRoles(roles: AssignedRoleRecord[]): void {
    try {
      if (!roles || roles.length === 0) return;
      const current = this.getAssignedRoles();
      const map = new Map<string, AssignedRoleRecord>();
      current.forEach(r => {
        const key = `${r.grade}-${r.classNum}-${r.studentNum}`;
        map.set(key, r);
      });
      roles.forEach(r => {
        const key = `${r.grade}-${r.classNum}-${r.studentNum}`;
        map.set(key, r);
      });
      localStorage.setItem(STORAGE_KEYS.ASSIGNED_ROLES, JSON.stringify(Array.from(map.values())));
    } catch (e) {
      console.error('Failed to save assigned roles', e);
    }
  }

  static setAssignedRole(record: AssignedRoleRecord): void {
    const roles = this.getAssignedRoles();
    const existingIndex = roles.findIndex(r => 
      r.id === record.id || 
      (Number(r.grade) === Number(record.grade) && 
       Number(r.classNum) === Number(record.classNum) && 
       Number(r.studentNum) === Number(record.studentNum))
    );
    if (existingIndex >= 0) {
      roles[existingIndex] = record;
    } else {
      roles.push(record);
    }
    try {
      localStorage.setItem(STORAGE_KEYS.ASSIGNED_ROLES, JSON.stringify(roles));
    } catch (e) {
      console.error('Failed to save assigned roles in setAssignedRole', e);
    }

    // If role is captain, also sync with sports representative
    if (record.role === 'captain') {
      this.setSportsRepresentative(record.grade, record.classNum, record.name);
    }
  }

  static removeAssignedRole(id: string, grade?: GradeLevel, classNum?: number, studentNum?: number): void {
    const roles = this.getAssignedRoles().filter(r => {
      if (r.id === id) return false;
      if (grade !== undefined && classNum !== undefined && studentNum !== undefined) {
        if (Number(r.grade) === Number(grade) && Number(r.classNum) === Number(classNum) && Number(r.studentNum) === Number(studentNum)) return false;
      }
      return true;
    });
    try {
      localStorage.setItem(STORAGE_KEYS.ASSIGNED_ROLES, JSON.stringify(roles));
    } catch (e) {
      console.error('Failed to save assigned roles after removal', e);
    }

    // If grade and classNum provided, clean up sports representative as well
    if (grade && classNum) {
      const reps = this.getSportsRepresentatives();
      const key = `${grade}-${classNum}`;
      if (reps[key]) {
        delete reps[key];
        this.saveSportsRepresentatives(reps);
      }
    }
  }

  static findAssignedRole(grade: GradeLevel, classNum: number, studentNum: number): AssignedRoleRecord | undefined {
    const roles = this.getAssignedRoles();
    return roles.find(r => 
      Number(r.grade) === Number(grade) && 
      Number(r.classNum) === Number(classNum) && 
      Number(r.studentNum) === Number(studentNum)
    );
  }

  static getGASConfig(): GASConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GAS_CONFIG);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse GAS config', e);
    }
    return INITIAL_GAS_CONFIG;
  }

  // ==========================================
  // ROSTERS (LINEUPS)
  // ==========================================
  static getRosters(): LineupEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LINEUPS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse lineups', e);
    }
    return [];
  }

  static saveAllRosters(rosters: LineupEntry[]): void {
    try {
      if (!rosters || rosters.length === 0) return;
      const current = this.getRosters();
      const map = new Map<string, LineupEntry>();
      current.forEach(r => map.set(`${r.roundId}_${r.grade}_${r.classNum}_${r.category}`, r));
      rosters.forEach(r => map.set(`${r.roundId}_${r.grade}_${r.classNum}_${r.category}`, r));
      localStorage.setItem(STORAGE_KEYS.LINEUPS, JSON.stringify(Array.from(map.values())));
    } catch (e) {
      console.error('Failed to save lineups', e);
    }
  }

  static saveRoster(entry: LineupEntry): void {
    const list = this.getRosters();
    const idx = list.findIndex(r => 
      r.roundId === entry.roundId && 
      r.grade === entry.grade && 
      r.classNum === entry.classNum && 
      r.category === entry.category
    );
    if (idx >= 0) {
      list[idx] = entry;
    } else {
      list.push(entry);
    }
    try {
      localStorage.setItem(STORAGE_KEYS.LINEUPS, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save single roster', e);
    }
  }

  static saveGASConfig(config: GASConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.GAS_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save GAS config', e);
    }
  }

  static getCurrentUser(): UserProfile | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse current user', e);
    }
    return null;
  }

  static getUserSession(): UserProfile | null {
    return this.getCurrentUser();
  }

  static clearUserSession(): void {
    this.saveCurrentUser(null);
  }

  static saveCurrentUser(user: UserProfile | null): void {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    } catch (e) {
      console.error('Failed to save current user', e);
    }
  }

  static saveUserSession(user: UserProfile | null): void {
    this.saveCurrentUser(user);
  }

  static getStudents(grade: GradeLevel, classNum: number): Player[] {
    const key = `${grade}-${classNum}`;
    const defaultList = SAMPLE_STUDENTS[key] || [];
    try {
      const custom = localStorage.getItem(STORAGE_KEYS.CUSTOM_STUDENTS);
      if (custom) {
        const parsed = JSON.parse(custom);
        if (parsed[key] && Array.isArray(parsed[key])) {
          // Merge with official list so that official roster corrections (e.g. 1-1 #4 김현지 여학생) always take precedence
          return parsed[key].map((p: Player) => {
            const official = defaultList.find(d => d.studentNum === p.studentNum);
            if (official) {
              return { ...p, gender: official.gender, name: official.name };
            }
            if (grade === 1 && classNum === 1 && p.studentNum === 4) {
              return { ...p, gender: 'F' as const, name: '김현지' };
            }
            return p;
          });
        }
      }
    } catch (e) {
      console.error('Failed to parse custom students', e);
    }
    return defaultList;
  }

  /**
   * Calculates Standings for the Unified League (or filtered by grade)
   * Ranking Criteria:
   * 1. 승점 (Points: 승 3, 무 1, 패 0)
   * 2. 세트(종목) 득실차 (SubMatch Diff)
   * 3. 총 점수 득실차 (Score Diff)
   * 4. 총 득점 (Score Won)
   */
  static calculateStandings(gradeFilter?: GradeLevel | 'ALL'): ClassStanding[] {
    const matches = this.getMatches();
    
    // Unified 4 teams: 1-1, 1-2, 2-1, 2-2
    const participatingTeams: Array<{ grade: GradeLevel; classNum: number; key: string; name: string }> = [
      { grade: 1, classNum: 1, key: '1-1', name: '1학년 1반' },
      { grade: 1, classNum: 2, key: '1-2', name: '1학년 2반' },
      { grade: 2, classNum: 1, key: '2-1', name: '2학년 1반' },
      { grade: 2, classNum: 2, key: '2-2', name: '2학년 2반' }
    ];

    const table: Record<string, ClassStanding> = {};
    participatingTeams.forEach(t => {
      table[t.key] = {
        grade: t.grade,
        classNum: t.classNum,
        teamKey: t.key,
        className: t.name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        subMatchWon: 0,
        subMatchLost: 0,
        subMatchDiff: 0,
        scoreWon: 0,
        scoreLost: 0,
        scoreDiff: 0,
        rank: 1
      };
    });

    matches.forEach(tie => {
      if (tie.status !== 'COMPLETED') return;

      const teamAGrade = tie.teamAGrade || tie.grade || 1;
      const teamBGrade = tie.teamBGrade || tie.grade || 1;
      const keyA = `${teamAGrade}-${tie.teamAClass}`;
      const keyB = `${teamBGrade}-${tie.teamBClass}`;

      const teamA = table[keyA];
      const teamB = table[keyB];
      if (!teamA || !teamB) return;

      teamA.played += 1;
      teamB.played += 1;

      teamA.subMatchWon += tie.teamAWins;
      teamA.subMatchLost += tie.teamBWins;
      teamB.subMatchWon += tie.teamBWins;
      teamB.subMatchLost += tie.teamAWins;

      // Calculate total individual set points
      tie.subMatches.forEach(sm => {
        sm.sets.forEach(set => {
          teamA.scoreWon += set.scoreA;
          teamA.scoreLost += set.scoreB;
          teamB.scoreWon += set.scoreB;
          teamB.scoreLost += set.scoreA;
        });
      });

      if (tie.teamAWins > tie.teamBWins) {
        teamA.wins += 1;
        teamA.points += 3;
        teamB.losses += 1;
      } else if (tie.teamBWins > tie.teamAWins) {
        teamB.wins += 1;
        teamB.points += 3;
        teamA.losses += 1;
      } else {
        teamA.draws += 1;
        teamB.draws += 1;
        teamA.points += 1;
        teamB.points += 1;
      }
    });

    let list = Object.values(table).map(item => {
      item.subMatchDiff = item.subMatchWon - item.subMatchLost;
      item.scoreDiff = item.scoreWon - item.scoreLost;
      return item;
    });

    // If gradeFilter is provided and not 'ALL'
    if (gradeFilter && gradeFilter !== 'ALL') {
      list = list.filter(item => item.grade === gradeFilter);
    }

    // Sort priority:
    // 1. 승점 (Points)
    // 2. 세트(종목) 득실차 (SubMatch Diff)
    // 3. 총 점수 득실차 (Score Diff)
    // 4. 다득점 (Score Won)
    list.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.subMatchDiff !== a.subMatchDiff) return b.subMatchDiff - a.subMatchDiff;
      if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
      return b.scoreWon - a.scoreWon;
    });

    list.forEach((item, index) => {
      item.rank = index + 1;
    });

    return list;
  }

  // Calculate Cumulative Player Stats
  static getPlayerStats(studentName: string) {
    const matches = this.getMatches();
    let played = 0;
    let wins = 0;
    let pointsScored = 0;
    let pointsAllowed = 0;
    let smashes = 0;
    let drops = 0;
    let mvpCount = 0;
    const categoriesPlayed: MatchCategory[] = [];

    matches.forEach(tie => {
      tie.subMatches.forEach(sm => {
        const inTeamA = sm.teamAPlayers.some(p => p.name === studentName);
        const inTeamB = sm.teamBPlayers.some(p => p.name === studentName);

        if (inTeamA || inTeamB) {
          played += 1;
          categoriesPlayed.push(sm.category);
          if (inTeamA) {
            if (sm.winnerTeam === 'A') wins += 1;
            sm.sets.forEach(s => {
              pointsScored += s.scoreA;
              pointsAllowed += s.scoreB;
            });
            if (sm.stats?.smashWinnersA) smashes += sm.stats.smashWinnersA;
            if (sm.stats?.dropPointsA) drops += sm.stats.dropPointsA;
          } else {
            if (sm.winnerTeam === 'B') wins += 1;
            sm.sets.forEach(s => {
              pointsScored += s.scoreB;
              pointsAllowed += s.scoreA;
            });
            if (sm.stats?.smashWinnersB) smashes += sm.stats.smashWinnersB;
            if (sm.stats?.dropPointsB) drops += sm.stats.dropPointsB;
          }

          if (sm.stats?.mvpPlayerName === studentName) {
            mvpCount += 1;
          }
        }
      });
    });

    const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;

    return {
      name: studentName,
      played,
      wins,
      losses: played - wins,
      winRate,
      pointsScored,
      pointsAllowed,
      smashes,
      drops,
      mvpCount,
      categoriesPlayed: Array.from(new Set(categoriesPlayed))
    };
  }

  // Delete / Reset Individual SubMatch Result
  static deleteSubMatchResult(tieMatchId: string, subMatchId: string): void {
    const matches = this.getMatches();
    const tieIdx = matches.findIndex(m => m.id === tieMatchId);
    if (tieIdx === -1) return;

    const t = matches[tieIdx];
    const smIdx = t.subMatches.findIndex(s => s.id === subMatchId);
    if (smIdx === -1) return;

    const sm = t.subMatches[smIdx];

    t.subMatches[smIdx] = {
      ...sm,
      sets: [{ setNumber: 1, scoreA: 0, scoreB: 0 }],
      winnerTeam: undefined,
      status: 'UPCOMING',
      referee: undefined,
      recordedBy: undefined,
      currentScoreA: 0,
      currentScoreB: 0,
      servingTeam: undefined,
      stats: undefined
    };

    // Recalculate tie wins & status
    let tAWins = 0;
    let tBWins = 0;
    let completedCount = 0;
    t.subMatches.forEach(sub => {
      if (sub.status === 'COMPLETED') {
        completedCount++;
        if (sub.winnerTeam === 'A') tAWins++;
        else if (sub.winnerTeam === 'B') tBWins++;
      }
    });

    t.teamAWins = tAWins;
    t.teamBWins = tBWins;

    if (completedCount === 0) {
      t.status = 'READY_TO_PLAY';
      t.winnerClass = undefined;
    } else if (tAWins >= 3) {
      t.winnerClass = t.teamAClass;
      t.status = 'COMPLETED';
    } else if (tBWins >= 3) {
      t.winnerClass = t.teamBClass;
      t.status = 'COMPLETED';
    } else {
      const allDone = t.subMatches.every(sub => sub.status === 'COMPLETED');
      if (allDone) {
        t.status = 'COMPLETED';
      } else {
        t.status = 'IN_PROGRESS';
        t.winnerClass = undefined;
      }
    }

    matches[tieIdx] = t;
    this.saveMatches(matches);
  }

  // Delete / Reset Entire Tie Match Results
  static deleteTieMatchResult(tieMatchId: string): void {
    const matches = this.getMatches();
    const tieIdx = matches.findIndex(m => m.id === tieMatchId);
    if (tieIdx === -1) return;

    const t = matches[tieIdx];
    t.subMatches = t.subMatches.map(sm => {
      return {
        ...sm,
        sets: [{ setNumber: 1, scoreA: 0, scoreB: 0 }],
        winnerTeam: undefined,
        status: 'UPCOMING',
        referee: undefined,
        recordedBy: undefined,
        currentScoreA: 0,
        currentScoreB: 0,
        servingTeam: undefined,
        stats: undefined
      };
    });

    t.teamAWins = 0;
    t.teamBWins = 0;
    t.winnerClass = undefined;
    t.status = 'READY_TO_PLAY';

    matches[tieIdx] = t;
    this.saveMatches(matches);
  }

  // Reset to Factory Default
  static resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEYS.TIE_MATCHES);
    localStorage.removeItem(STORAGE_KEYS.SPORTS_REPS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_STUDENTS);
  }
}
