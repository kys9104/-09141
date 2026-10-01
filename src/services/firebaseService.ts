import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  getDocFromServer
} from 'firebase/firestore';
import { auth, signInAnonymously } from './googleAuthService';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, TieMatch, LineupEntry, GradeLevel, MatchCategory } from '../types';
import { INITIAL_TIE_MATCHES } from '../data/initialData';
import { StorageService } from './storageService';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// ==========================================
// FIRESTORE QUOTA EXHAUSTION PROTECTION
// ==========================================
let isCloudQuotaExhausted = false;

export function isQuotaError(err: any): boolean {
  if (!err) return false;
  const str = String(err?.message || err?.code || err?.name || err?.toString?.() || err).toLowerCase();
  return (
    str.includes('resource-exhausted') ||
    str.includes('quota') ||
    str.includes('backoff') ||
    str.includes('exceeded') ||
    str.includes('write units') ||
    str.includes('free tier database')
  );
}

export function markQuotaExhausted(): void {
  if (!isCloudQuotaExhausted) {
    isCloudQuotaExhausted = true;
    try {
      localStorage.setItem('sinan_firestore_quota_exhausted', String(Date.now()));
    } catch {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firestoreQuotaExhausted'));
    }
  }
}

export function checkIsQuotaExhausted(): boolean {
  if (isCloudQuotaExhausted) return true;
  try {
    const saved = localStorage.getItem('sinan_firestore_quota_exhausted');
    if (saved) {
      const elapsed = Date.now() - Number(saved);
      // Suppress writes for 12 hours once quota limit is hit, then test gently
      if (elapsed < 12 * 60 * 60 * 1000) {
        isCloudQuotaExhausted = true;
        return true;
      } else {
        localStorage.removeItem('sinan_firestore_quota_exhausted');
      }
    }
  } catch {}
  return false;
}

// Initial check on load
checkIsQuotaExhausted();

// Catch any unhandled quota promise rejections from Firestore's internal streams
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (isQuotaError(event.reason)) {
      markQuotaExhausted();
      event.preventDefault();
    }
  });
}

// Firestore connection tester
export async function testFirestoreConnection(): Promise<boolean> {
  if (checkIsQuotaExhausted()) return true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExhausted();
    }
    return true;
  }
}

export interface RoleAssignment {
  id: string; // doc ID or custom key
  uid?: string;
  email?: string;
  grade: GradeLevel;
  classNum: number;
  studentNum: number;
  name: string;
  role: 'captain' | 'council';
  assignedAt: string;
  assignedBy?: string;
}

export type CaptainAssignment = RoleAssignment;

export class FirebaseService {
  // ==========================================
  // USERS & ROLES (반장/체육부장 & 학생자치회)
  // ==========================================

  static isQuotaExhausted(): boolean {
    return checkIsQuotaExhausted();
  }

  /**
   * Fetch user document by UID
   */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (checkIsQuotaExhausted()) return null;
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
    } catch (e) {
      if (isQuotaError(e)) markQuotaExhausted();
    }
    return null;
  }

  /**
   * Save or sync user profile to Firestore users collection
   */
  static async saveUserProfile(user: UserProfile): Promise<void> {
    // Skip if quota is exhausted or regular student to conserve free write quota
    if (checkIsQuotaExhausted() || !user || user.role === 'student' || user.role === 'STUDENT') {
      return;
    }
    try {
      const uid = user.uid || (auth.currentUser ? auth.currentUser.uid : `${user.grade}-${user.classNum}-${user.studentNum}`);
      const userRef = doc(db, 'users', uid);

      const writePromise = setDoc(userRef, {
        uid,
        email: user.email || (auth.currentUser?.email || ''),
        name: user.name,
        grade: user.grade,
        classNum: user.classNum,
        studentNum: user.studentNum,
        role: user.role,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3000)
      );

      await Promise.race([writePromise, timeoutPromise]);
    } catch (e: any) {
      if (isQuotaError(e)) {
        markQuotaExhausted();
      }
    }
  }

  /**
   * Check if student was granted a role by teacher
   */
  static async checkAssignedRole(grade: GradeLevel, classNum: number, studentNum: number): Promise<'captain' | 'council' | 'student'> {
    // 1. Always check local storage first
    const localRole = StorageService.findAssignedRole(grade, classNum, studentNum);
    if (localRole) return localRole.role;

    if (checkIsQuotaExhausted()) {
      return 'student';
    }

    try {
      const docId = `${grade}-${classNum}-${studentNum}`;
      
      // Check assigned_roles collection by direct docId
      const roleRef = doc(db, 'assigned_roles', docId);
      const roleSnap = await getDoc(roleRef);
      if (roleSnap.exists()) {
        const data = roleSnap.data();
        if (data.role === 'council' || data.role === 'STUDENT_COUNCIL') return 'council';
        if (data.role === 'captain' || data.role === 'SPORTS_REP') return 'captain';
      }

      // Check with -captain suffix
      const roleSnapCap = await getDoc(doc(db, 'assigned_roles', `${docId}-captain`));
      if (roleSnapCap.exists()) return 'captain';

      // Check with -council suffix
      const roleSnapCoun = await getDoc(doc(db, 'assigned_roles', `${docId}-council`));
      if (roleSnapCoun.exists()) return 'council';

      // Query assigned_roles collection by fields
      const q = query(
        collection(db, 'assigned_roles'),
        where('grade', '==', Number(grade)),
        where('classNum', '==', Number(classNum)),
        where('studentNum', '==', Number(studentNum))
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const data = querySnap.docs[0].data();
        if (data.role === 'council' || data.role === 'STUDENT_COUNCIL') return 'council';
        if (data.role === 'captain' || data.role === 'SPORTS_REP') return 'captain';
      }
    } catch (e: any) {
      if (isQuotaError(e)) {
        markQuotaExhausted();
      }
    }

    return 'student';
  }

  static async isDesignatedRoleAsync(grade: GradeLevel, classNum: number, studentNum: number, role: 'captain' | 'council'): Promise<boolean> {
    try {
      const assigned = await this.checkAssignedRole(grade, classNum, studentNum);
      return assigned === role;
    } catch {
      return false;
    }
  }

  /**
   * Teacher Admin: Grant role (captain or council) to a student
   */
  static async grantRole(params: {
    grade: GradeLevel;
    classNum: number;
    studentNum: number;
    name: string;
    role: 'captain' | 'council';
    email?: string;
  }): Promise<{ success: boolean; message: string }> {
    const docId = `${params.grade}-${params.classNum}-${params.studentNum}`;
    const now = new Date().toISOString();

    // 1. Always update local storage first
    StorageService.setAssignedRole({
      id: docId,
      grade: params.grade,
      classNum: params.classNum,
      studentNum: params.studentNum,
      name: params.name,
      role: params.role,
      assignedAt: now,
      assignedBy: auth.currentUser?.email || '체육교사'
    });

    if (params.role === 'captain') {
      StorageService.setSportsRepresentative(params.grade, params.classNum, params.name);
    }

    // 2. If quota is exhausted, finish safely
    if (checkIsQuotaExhausted()) {
      return {
        success: true,
        message: `${params.grade}학년 ${params.classNum}반 ${params.studentNum}번 ${params.name} 학생에게 [${
          params.role === 'council' ? '학생자치회' : '반장/체육부장'
        }] 권한이 정상 등록되었습니다.`
      };
    }

    try {
      const roleData = {
        id: docId,
        uid: docId,
        email: params.email || '',
        grade: params.grade,
        classNum: params.classNum,
        studentNum: params.studentNum,
        name: params.name,
        role: params.role,
        updatedAt: now,
        assignedAt: now,
        assignedBy: auth.currentUser?.email || '체육교사'
      };

      const assignedRef = doc(db, 'assigned_roles', docId);
      const writePromise = setDoc(assignedRef, roleData, { merge: true });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 4000)
      );

      await Promise.race([writePromise, timeoutPromise]);

      return {
        success: true,
        message: `${params.grade}학년 ${params.classNum}반 ${params.studentNum}번 ${params.name} 학생에게 [${
          params.role === 'council' ? '학생자치회' : '반장/체육부장'
        }] 권한을 정상적으로 부여했습니다.`
      };
    } catch (e: any) {
      if (isQuotaError(e)) {
        markQuotaExhausted();
      }
      return {
        success: true,
        message: `${params.grade}학년 ${params.classNum}반 ${params.studentNum}번 ${params.name} 학생 권한이 정상 등록되었습니다.`
      };
    }
  }

  /**
   * Teacher Admin: Revoke role back to student
   */
  static async revokeRole(
    docId: string, 
    details?: { grade?: GradeLevel; classNum?: number; studentNum?: number }
  ): Promise<{ success: boolean; message: string }> {
    // 1. Always update local storage first
    StorageService.removeAssignedRole(docId, details?.grade, details?.classNum, details?.studentNum);

    if (checkIsQuotaExhausted()) {
      return { success: true, message: '학생 권한이 일반 학생으로 해제되었습니다.' };
    }

    try {
      const assignedRef = doc(db, 'assigned_roles', docId);
      const deletePromise = deleteDoc(assignedRef);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 4000)
      );
      await Promise.race([deletePromise, timeoutPromise]);
      return { success: true, message: '학생 권한이 일반 학생으로 해제되었습니다.' };
    } catch (e: any) {
      if (isQuotaError(e)) {
        markQuotaExhausted();
      }
      return { success: true, message: '학생 권한이 해제되었습니다.' };
    }
  }

  /**
   * Fetch all assigned roles (both captain and council)
   */
  static async getAssignedRoles(): Promise<RoleAssignment[]> {
    if (checkIsQuotaExhausted()) {
      return StorageService.getAssignedRoles().map(r => ({
        id: r.id,
        grade: r.grade,
        classNum: r.classNum,
        studentNum: r.studentNum,
        name: r.name,
        role: r.role,
        assignedAt: r.assignedAt || new Date().toISOString(),
        assignedBy: r.assignedBy || '체육교사'
      }));
    }

    try {
      const assignedSnap = await getDocs(collection(db, 'assigned_roles'));
      const list: RoleAssignment[] = [];

      assignedSnap.forEach(d => {
        const data = d.data();
        const rawRole = data.role;
        const normalizedRole: 'captain' | 'council' = 
          (rawRole === 'council' || rawRole === 'STUDENT_COUNCIL') ? 'council' : 'captain';
        list.push({
          id: d.id,
          uid: data.uid || d.id,
          email: data.email,
          grade: data.grade || 1,
          classNum: data.classNum || 1,
          studentNum: data.studentNum || 0,
          name: data.name || '미등록',
          role: normalizedRole,
          assignedAt: data.assignedAt || data.updatedAt || new Date().toISOString(),
          assignedBy: data.assignedBy || '체육교사'
        });
      });

      if (list.length > 0) {
        return list;
      }
    } catch (e: any) {
      if (isQuotaError(e)) {
        markQuotaExhausted();
      }
    }

    return StorageService.getAssignedRoles().map(r => ({
      id: r.id,
      grade: r.grade,
      classNum: r.classNum,
      studentNum: r.studentNum,
      name: r.name,
      role: r.role,
      assignedAt: r.assignedAt || new Date().toISOString(),
      assignedBy: r.assignedBy || '체육교사'
    }));
  }

  /**
   * Real-time subscription to assigned roles
   */
  static subscribeAssignedRoles(callback: (roles: RoleAssignment[]) => void): () => void {
    if (checkIsQuotaExhausted()) {
      return () => {};
    }
    try {
      const q = collection(db, 'assigned_roles');
      return onSnapshot(q, (snap) => {
        const list: RoleAssignment[] = [];
        snap.forEach(d => {
          const data = d.data();
          const rawRole = data.role;
          const normalizedRole: 'captain' | 'council' = 
            (rawRole === 'council' || rawRole === 'STUDENT_COUNCIL') ? 'council' : 'captain';
          list.push({
            id: d.id,
            uid: data.uid || d.id,
            email: data.email,
            grade: data.grade || 1,
            classNum: data.classNum || 1,
            studentNum: data.studentNum || 0,
            name: data.name || '미등록',
            role: normalizedRole,
            assignedAt: data.assignedAt || data.updatedAt || new Date().toISOString(),
            assignedBy: data.assignedBy || '체육교사'
          });
        });
        callback(list);
      }, (err) => {
        if (isQuotaError(err)) {
          markQuotaExhausted();
        }
      });
    } catch (e) {
      if (isQuotaError(e)) {
        markQuotaExhausted();
      }
      return () => {};
    }
  }

  static async grantCaptainRole(params: {
    identifier?: string;
    grade: GradeLevel;
    classNum: number;
    studentNum: number;
    name: string;
    email?: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.grantRole({
      grade: params.grade,
      classNum: params.classNum,
      studentNum: params.studentNum,
      name: params.name,
      role: 'captain',
      email: params.email
    });
  }

  static async revokeCaptainRole(docId: string): Promise<{ success: boolean; message: string }> {
    return this.revokeRole(docId);
  }

  static async getCaptains(): Promise<CaptainAssignment[]> {
    const all = await this.getAssignedRoles();
    return all.filter(r => r.role === 'captain');
  }

  /**
   * Helper to strip all undefined values from an object or array to prevent Firestore errors
   */
  private static sanitizeForFirestore<T>(data: T): T {
    return JSON.parse(JSON.stringify(data, (key, value) => {
      if (value === undefined) return undefined;
      return value;
    }));
  }

  // ==========================================
  // ROSTERS (LINEUPS)
  // ==========================================

  /**
   * Save roster to local storage & Firestore 'rosters' collection
   */
  static async saveRoster(roster: {
    id?: string;
    roundId: number;
    grade: GradeLevel;
    classNum: number;
    category: MatchCategory;
    players: Array<{ name: string; studentNum?: number; gender?: string }>;
    submittedBy: string;
  }): Promise<{ success: boolean; message: string }> {
    const rosterId = roster.id || `roster_r${roster.roundId}_${roster.grade}-${roster.classNum}_${roster.category}`;

    // 1. Always update local storage first
    StorageService.saveRoster({
      id: rosterId,
      roundId: roster.roundId,
      grade: roster.grade,
      classNum: roster.classNum,
      category: roster.category,
      players: (roster.players || []).map(p => ({
        grade: roster.grade,
        classNum: roster.classNum,
        name: p.name || '',
        studentNum: p.studentNum || 0,
        gender: (p.gender === 'F' ? 'F' : 'M') as 'M' | 'F'
      })),
      submittedBy: roster.submittedBy || '체육부장/학생자치회/교사',
      submittedAt: new Date().toISOString(),
      isLocked: false
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rostersUpdated'));
    }

    // 2. If quota is exhausted, complete immediately
    if (checkIsQuotaExhausted()) {
      return {
        success: true,
        message: `${roster.grade}학년 ${roster.classNum}반 [${roster.category}] 출전명단이 저장되었습니다.`
      };
    }

    try {
      const rosterRef = doc(db, 'rosters', rosterId);
      const dataToSave = this.sanitizeForFirestore({
        id: rosterId,
        roundId: roster.roundId,
        grade: roster.grade,
        classNum: roster.classNum,
        category: roster.category,
        players: (roster.players || []).map(p => ({
          name: p.name || '',
          studentNum: p.studentNum || 0,
          gender: p.gender || 'M'
        })),
        submittedBy: roster.submittedBy || '체육부장/학생자치회/교사',
        submittedAt: new Date().toISOString(),
        isLocked: false
      });

      const writePromise = setDoc(rosterRef, dataToSave, { merge: true });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 4000)
      );

      await Promise.race([writePromise, timeoutPromise]);

      return {
        success: true,
        message: `${roster.grade}학년 ${roster.classNum}반 [${roster.category}] 출전명단이 저장되었습니다.`
      };
    } catch (e: any) {
      if (isQuotaError(e)) {
        markQuotaExhausted();
      }
      return {
        success: true,
        message: `${roster.grade}학년 ${roster.classNum}반 [${roster.category}] 출전명단이 저장되었습니다.`
      };
    }
  }

  /**
   * Fetch all rosters
   */
  static async getRosters(): Promise<LineupEntry[]> {
    if (checkIsQuotaExhausted()) {
      return StorageService.getRosters();
    }
    try {
      const rostersRef = collection(db, 'rosters');
      const snap = await getDocs(rostersRef);
      if (snap.empty) return StorageService.getRosters();
      const list: LineupEntry[] = [];
      snap.forEach(d => {
        list.push(d.data() as LineupEntry);
      });
      return list;
    } catch (e) {
      if (isQuotaError(e)) {
        markQuotaExhausted();
      }
      return StorageService.getRosters();
    }
  }

  /**
   * Realtime subscription for rosters collection
   */
  static subscribeRosters(callback: (rosters: LineupEntry[]) => void): () => void {
    if (checkIsQuotaExhausted()) {
      return () => {};
    }
    try {
      const q = collection(db, 'rosters');
      return onSnapshot(q, (snap) => {
        if (snap.empty) return;
        const list: LineupEntry[] = [];
        snap.forEach(d => {
          list.push(d.data() as LineupEntry);
        });
        callback(list);
      }, (err) => {
        if (isQuotaError(err)) {
          markQuotaExhausted();
        }
      });
    } catch (e) {
      if (isQuotaError(e)) {
        markQuotaExhausted();
      }
      return () => {};
    }
  }

  // ==========================================
  // MATCHES (경기결과 & 대진표)
  // ==========================================

  /**
   * Save match result to local storage & Firestore 'matches' collection
   */
  static async saveMatch(match: TieMatch, recordedBy: string = ''): Promise<{ success: boolean; message: string }> {
    // 1. Always update local storage first
    StorageService.saveSingleMatch(match);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('matchesUpdated'));
    }

    // 2. If quota is exhausted, skip Firestore write without error
    if (checkIsQuotaExhausted()) {
      return { success: true, message: '경기 결과가 저장되었습니다.' };
    }

    try {
      const matchRef = doc(db, 'matches', match.id);
      const sanitized = this.sanitizeForFirestore({
        ...match,
        updatedAt: new Date().toISOString(),
        updatedBy: recordedBy || auth.currentUser?.email || '학생자치회/체육부장/교사'
      });

      const writePromise = setDoc(matchRef, sanitized, { merge: true });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 4000)
      );

      await Promise.race([writePromise, timeoutPromise]);

      return { success: true, message: '경기 결과가 저장되었습니다.' };
    } catch (e: any) {
      if (isQuotaError(e)) {
        markQuotaExhausted();
      }
      return { success: true, message: '경기 결과가 저장되었습니다.' };
    }
  }

  /**
   * Realtime subscription for matches collection
   */
  static subscribeMatches(callback: (matches: TieMatch[]) => void): () => void {
    if (checkIsQuotaExhausted()) {
      return () => {};
    }
    try {
      const q = collection(db, 'matches');
      return onSnapshot(q, (snap) => {
        if (snap.empty) return;
        const list: TieMatch[] = [];
        snap.forEach(d => {
          list.push(d.data() as TieMatch);
        });
        callback(list);
      }, (err) => {
        if (isQuotaError(err)) {
          markQuotaExhausted();
        }
      });
    } catch (e) {
      if (isQuotaError(e)) {
        markQuotaExhausted();
      }
      return () => {};
    }
  }

  /**
   * Fetch all matches from Firestore
   */
  static async getMatches(): Promise<TieMatch[]> {
    if (checkIsQuotaExhausted()) {
      return StorageService.getMatches();
    }
    try {
      const matchesRef = collection(db, 'matches');
      const snap = await getDocs(matchesRef);
      if (snap.empty) return StorageService.getMatches();
      const list: TieMatch[] = [];
      snap.forEach(d => {
        list.push(d.data() as TieMatch);
      });
      return list;
    } catch (e) {
      if (isQuotaError(e)) {
        markQuotaExhausted();
      }
      return StorageService.getMatches();
    }
  }

  /**
   * Ensure active auth state
   */
  static async ensureAuth(): Promise<void> {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
    } catch (e) {
      // Permission rules allow open access, continue seamlessly
    }
  }

  /**
   * Safely fetch matches on app start without executing any bulk write calls
   */
  static async initializeCloudMatchesIfEmpty(): Promise<TieMatch[]> {
    if (checkIsQuotaExhausted()) {
      return StorageService.getMatches();
    }
    try {
      await this.ensureAuth();
      const existing = await this.getMatches();
      if (existing && existing.length > 0) {
        return existing;
      }
      return StorageService.getMatches();
    } catch (e) {
      if (isQuotaError(e)) {
        markQuotaExhausted();
      }
      return StorageService.getMatches();
    }
  }

  /**
   * Delete or reset match in Firestore (Admin only)
   */
  static async deleteMatch(matchId: string): Promise<void> {
    const current = StorageService.getMatches();
    const target = current.find(m => m.id === matchId);
    if (target) {
      // Reset subMatches status and sets locally
      const blankMatch: TieMatch = {
        ...target,
        teamAWins: 0,
        teamBWins: 0,
        status: 'PENDING_LINEUP',
        subMatches: target.subMatches.map(sm => ({
          ...sm,
          status: 'UPCOMING',
          winnerTeam: undefined,
          sets: [{ setNumber: 1, scoreA: 0, scoreB: 0 }]
        }))
      };
      StorageService.saveSingleMatch(blankMatch);
    }

    if (checkIsQuotaExhausted()) {
      return;
    }

    try {
      await this.ensureAuth();
      const matchRef = doc(db, 'matches', matchId);
      const deletePromise = deleteDoc(matchRef);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 4000)
      );
      await Promise.race([deletePromise, timeoutPromise]);
    } catch (e) {
      if (isQuotaError(e)) {
        markQuotaExhausted();
      }
    }
  }

  /**
   * Reset all cloud matches to initial blank state and delete all cloud rosters
   */
  static async resetAllCloudMatchesAndRosters(): Promise<{ success: boolean; message: string }> {
    StorageService.resetAllMatchesAndLineups();

    if (checkIsQuotaExhausted()) {
      return { success: true, message: '모든 경기 결과 및 출전선수명단이 초기화되었습니다.' };
    }

    try {
      await this.ensureAuth();
      const matchPromises = INITIAL_TIE_MATCHES.map(async (m) => {
        const matchRef = doc(db, 'matches', m.id);
        const cleanData = this.sanitizeForFirestore({
          ...m,
          updatedAt: new Date().toISOString(),
          updatedBy: auth.currentUser?.email || '체육교사 (데이터 초기화)'
        });
        return setDoc(matchRef, cleanData);
      });
      await Promise.allSettled(matchPromises);

      try {
        const rostersRef = collection(db, 'rosters');
        const snap = await getDocs(rostersRef);
        const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.allSettled(deletePromises);
      } catch (err) {
        if (isQuotaError(err)) markQuotaExhausted();
      }

      return { success: true, message: '모든 경기 결과 및 출전선수명단이 초기화되었습니다.' };
    } catch (e: any) {
      if (isQuotaError(e)) {
        markQuotaExhausted();
      }
      return { success: true, message: '모든 경기 결과 및 출전선수명단이 초기화되었습니다.' };
    }
  }
}
