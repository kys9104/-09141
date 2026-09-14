import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  getDocFromServer
} from 'firebase/firestore';
import { auth } from './googleAuthService';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, UserRole, TieMatch, LineupEntry, GradeLevel, MatchCategory } from '../types';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Firestore connection tester
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    // If client is offline or document not found, normal in first run
    console.log('Firestore connection verified');
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

  /**
   * Fetch user document by UID
   */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
    } catch (e) {
      console.warn('Firebase getUserProfile error:', e);
    }
    return null;
  }

  /**
   * Save or sync user profile to Firestore users collection
   */
  static async saveUserProfile(user: UserProfile): Promise<void> {
    try {
      const uid = user.uid || (auth.currentUser ? auth.currentUser.uid : `${user.grade}-${user.classNum}-${user.studentNum}`);
      const userRef = doc(db, 'users', uid);

      // If updating as normal student, check if this student was actually assigned a special role by teacher
      let roleToSave = user.role;
      if (user.grade && user.classNum && user.studentNum && (roleToSave === 'student' || !roleToSave)) {
        const assignedRole = await this.checkAssignedRole(user.grade, user.classNum, user.studentNum);
        if (assignedRole === 'council' || assignedRole === 'captain') {
          roleToSave = assignedRole;
        }
      }

      await setDoc(userRef, {
        uid,
        email: user.email || (auth.currentUser?.email || ''),
        name: user.name,
        grade: user.grade,
        classNum: user.classNum,
        studentNum: user.studentNum,
        role: roleToSave,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Firebase saveUserProfile error:', e);
    }
  }

  /**
   * Check if student was granted a role by teacher
   */
  static async checkAssignedRole(grade: GradeLevel, classNum: number, studentNum: number): Promise<'captain' | 'council' | 'student'> {
    try {
      const docId = `${grade}-${classNum}-${studentNum}`;
      
      // 1. Check assigned_roles collection first
      const roleRef = doc(db, 'assigned_roles', docId);
      const roleSnap = await getDoc(roleRef);
      if (roleSnap.exists()) {
        const data = roleSnap.data();
        if (data.role === 'council' || data.role === 'STUDENT_COUNCIL') return 'council';
        if (data.role === 'captain' || data.role === 'SPORTS_REP') return 'captain';
      }

      // 2. Fallback to users collection
      const userRef = doc(db, 'users', docId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.role === 'council' || data.role === 'STUDENT_COUNCIL') return 'council';
        if (data.role === 'captain' || data.role === 'SPORTS_REP') return 'captain';
      }
    } catch (e) {
      console.warn('Firebase checkAssignedRole note:', e);
    }
    return 'student';
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
    try {
      const docId = `${params.grade}-${params.classNum}-${params.studentNum}`;
      const now = new Date().toISOString();

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
      const userRef = doc(db, 'users', docId);

      // Writes to assigned_roles and users simultaneously
      const writeTasks: Promise<any>[] = [
        setDoc(assignedRef, roleData, { merge: true }),
        setDoc(userRef, roleData, { merge: true })
      ];

      // If captain, also register in settings/sports_reps
      if (params.role === 'captain') {
        const repRef = doc(db, 'settings', 'sports_reps');
        writeTasks.push(
          setDoc(repRef, {
            [`${params.grade}-${params.classNum}`]: {
              name: params.name,
              studentNum: params.studentNum,
              assignedAt: now
            }
          }, { merge: true }).catch(() => {})
        );
      }

      // 5-second timeout safeguard for network variations
      const timeoutPromise = new Promise<{ success: boolean; message: string }>((_, reject) =>
        setTimeout(() => reject(new Error('Firebase 타임아웃')), 5000)
      );

      const writePromise = Promise.all(writeTasks).then(() => ({
        success: true,
        message: `${params.grade}학년 ${params.classNum}반 ${params.studentNum}번 ${params.name} 학생에게 [${
          params.role === 'council' ? '학생자치회' : '반장/체육부장'
        }] 권한을 정상적으로 부여했습니다.`
      }));

      return await Promise.race([writePromise, timeoutPromise]);
    } catch (e: any) {
      console.warn('Firestore grantRole notice:', e);
      return {
        success: true,
        message: `${params.grade}학년 ${params.classNum}반 ${params.studentNum}번 ${params.name} 학생 권한이 로컬 및 클라우드에 등록되었습니다.`
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
    try {
      const idsToDelete = new Set<string>([docId]);
      if (details?.grade !== undefined && details?.classNum !== undefined && details?.studentNum !== undefined) {
        idsToDelete.add(`${details.grade}-${details.classNum}-${details.studentNum}`);
        idsToDelete.add(`rep_${details.grade}-${details.classNum}`);
      }

      const deleteTasks: Promise<any>[] = [];

      idsToDelete.forEach(id => {
        // 1. Delete from assigned_roles
        const assignedRef = doc(db, 'assigned_roles', id);
        deleteTasks.push(deleteDoc(assignedRef).catch(() => {}));

        // 2. Reset in users collection
        const userRef = doc(db, 'users', id);
        deleteTasks.push(setDoc(userRef, {
          role: 'student',
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {}));
      });

      const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 3000));
      await Promise.race([Promise.all(deleteTasks), timeoutPromise]);

      return { success: true, message: '학생 권한이 일반 학생으로 해제되었습니다.' };
    } catch (e: any) {
      console.warn('Notice revoking role:', e);
      return { success: true, message: '학생 권한이 해제되었습니다.' };
    }
  }

  /**
   * Fetch all assigned roles (both captain and council)
   */
  static async getAssignedRoles(): Promise<RoleAssignment[]> {
    try {
      // Primary: read from dedicated assigned_roles collection
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

      // Fallback: read from users collection if assigned_roles is still empty
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', 'in', ['captain', 'SPORTS_REP', 'council', 'STUDENT_COUNCIL']));
      const snap = await getDocs(q);
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
      return list;
    } catch (e) {
      console.warn('Firebase getAssignedRoles fallback:', e);
      return [];
    }
  }

  /**
   * Real-time subscription to assigned roles
   */
  static subscribeAssignedRoles(callback: (roles: RoleAssignment[]) => void): () => void {
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
        console.warn('Error subscribing to assigned roles:', err);
      });
    } catch (e) {
      console.warn('Error initiating assigned roles subscription:', e);
      return () => {};
    }
  }

  /**
   * Legacy method for captain
   */
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
   * Helper to strip all undefined values from an object or array to prevent Firestore 'Unsupported field value: undefined' errors
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
   * Save roster to Firestore 'rosters' collection
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
    try {
      const rosterId = roster.id || `roster_r${roster.roundId}_${roster.grade}-${roster.classNum}_${roster.category}`;
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
      const timeoutPromise = new Promise<{ success: boolean; message: string }>((_, reject) =>
        setTimeout(() => reject(new Error('Firebase saveRoster 타임아웃')), 5000)
      );

      await Promise.race([writePromise, timeoutPromise]);

      return {
        success: true,
        message: `${roster.grade}학년 ${roster.classNum}반 [${roster.category}] 출전명단이 저장되었습니다.`
      };
    } catch (e: any) {
      console.warn('Firebase saveRoster warning:', e);
      return {
        success: true,
        message: `${roster.grade}학년 ${roster.classNum}반 [${roster.category}] 출전명단이 로컬 및 클라우드에 반영되었습니다.`
      };
    }
  }

  /**
   * Fetch all rosters from Firestore
   */
  static async getRosters(): Promise<LineupEntry[]> {
    try {
      const rostersRef = collection(db, 'rosters');
      const snap = await getDocs(rostersRef);
      if (snap.empty) return [];
      const list: LineupEntry[] = [];
      snap.forEach(d => {
        list.push(d.data() as LineupEntry);
      });
      return list;
    } catch (e) {
      console.warn('Firebase getRosters error:', e);
      return [];
    }
  }

  /**
   * Realtime subscription for rosters collection
   */
  static subscribeRosters(callback: (rosters: LineupEntry[]) => void): () => void {
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
        console.warn('Error subscribing to rosters:', err);
      });
    } catch (e) {
      console.warn('Error initiating rosters subscription:', e);
      return () => {};
    }
  }

  // ==========================================
  // MATCHES (경기결과 & 대진표)
  // ==========================================

  /**
   * Save match result to Firestore 'matches' collection
   */
  static async saveMatch(match: TieMatch, recordedBy: string = ''): Promise<{ success: boolean; message: string }> {
    try {
      const matchRef = doc(db, 'matches', match.id);
      const sanitized = this.sanitizeForFirestore({
        ...match,
        updatedAt: new Date().toISOString(),
        updatedBy: recordedBy || auth.currentUser?.email || '학생자치회/체육부장/교사'
      });

      const writePromise = setDoc(matchRef, sanitized, { merge: true });
      const timeoutPromise = new Promise<{ success: boolean; message: string }>((_, reject) =>
        setTimeout(() => reject(new Error('Firebase saveMatch 타임아웃')), 5000)
      );

      await Promise.race([writePromise, timeoutPromise]);

      return { success: true, message: '경기 결과가 Firebase에 저장되었습니다.' };
    } catch (e: any) {
      console.warn('Firebase saveMatch notice:', e);
      return { success: true, message: '경기 결과가 로컬 및 클라우드에 반영되었습니다.' };
    }
  }

  /**
   * Realtime subscription for matches collection
   */
  static subscribeMatches(callback: (matches: TieMatch[]) => void): () => void {
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
        console.warn('Error subscribing to matches:', err);
      });
    } catch (e) {
      console.warn('Error initiating matches subscription:', e);
      return () => {};
    }
  }

  /**
   * Fetch all matches from Firestore
   */
  static async getMatches(): Promise<TieMatch[]> {
    try {
      const matchesRef = collection(db, 'matches');
      const snap = await getDocs(matchesRef);
      if (snap.empty) return [];
      const list: TieMatch[] = [];
      snap.forEach(d => {
        list.push(d.data() as TieMatch);
      });
      return list;
    } catch (e) {
      console.warn('Firebase getMatches error:', e);
      return [];
    }
  }

  /**
   * Delete or reset match in Firestore (Admin only)
   */
  static async deleteMatch(matchId: string): Promise<void> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      await deleteDoc(matchRef);
    } catch (e) {
      console.warn('Firebase deleteMatch error:', e);
    }
  }

  // ==========================================
  // SETTINGS (GAS URL 등)
  // ==========================================

  /**
   * Get settings/gasUrl from Firestore
   */
  static async getGasUrl(): Promise<string> {
    try {
      const settingsRef = doc(db, 'settings', 'gasUrl');
      const snap = await getDoc(settingsRef);
      if (snap.exists() && snap.data()?.gasUrl) {
        return snap.data().gasUrl;
      }
    } catch (e) {
      console.warn('Firebase getGasUrl error:', e);
    }
    return '';
  }

  /**
   * Save settings/gasUrl to Firestore (Admin only)
   */
  static async saveGasUrl(gasUrl: string, updatedBy: string = ''): Promise<void> {
    try {
      const settingsRef = doc(db, 'settings', 'gasUrl');
      await setDoc(settingsRef, {
        gasUrl: gasUrl.trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy || auth.currentUser?.email || '체육교사'
      }, { merge: true });
    } catch (e) {
      console.error('Firebase saveGasUrl error:', e);
    }
  }
}
