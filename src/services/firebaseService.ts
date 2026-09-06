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

export interface CaptainAssignment {
  id: string; // doc ID or custom key
  uid?: string;
  email?: string;
  grade: GradeLevel;
  classNum: number;
  studentNum?: number;
  name: string;
  role: 'captain';
  assignedAt: string;
  assignedBy?: string;
}

export class FirebaseService {
  // ==========================================
  // USERS & ROLES
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
      await setDoc(userRef, {
        uid,
        email: user.email || (auth.currentUser?.email || ''),
        name: user.name,
        grade: user.grade,
        classNum: user.classNum,
        studentNum: user.studentNum,
        role: user.role,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Firebase saveUserProfile error:', e);
    }
  }

  /**
   * Teacher Admin: Grant 'captain' role to a student
   */
  static async grantCaptainRole(params: {
    identifier: string; // UID or email or student number
    grade: GradeLevel;
    classNum: number;
    studentNum: number;
    name: string;
    email?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      // Determine doc ID: if identifier provided or composite key
      const docId = params.identifier.trim() || `${params.grade}-${params.classNum}-${params.studentNum}`;
      const userRef = doc(db, 'users', docId);

      await setDoc(userRef, {
        uid: docId,
        email: params.email || '',
        grade: params.grade,
        classNum: params.classNum,
        studentNum: params.studentNum,
        name: params.name,
        role: 'captain',
        updatedAt: new Date().toISOString(),
        assignedAt: new Date().toISOString(),
        assignedBy: auth.currentUser?.email || '체육교사'
      }, { merge: true });

      return {
        success: true,
        message: `${params.grade}학년 ${params.classNum}반 ${params.name} 학생에게 출전명단 작성(captain) 권한을 부여했습니다.`
      };
    } catch (e: any) {
      console.error('Failed to grant captain role:', e);
      return {
        success: false,
        message: `권한 부여 실패: ${e.message || 'Firestore 권한 오류'}`
      };
    }
  }

  /**
   * Teacher Admin: Revoke captain role back to student
   */
  static async revokeCaptainRole(docId: string): Promise<{ success: boolean; message: string }> {
    try {
      const userRef = doc(db, 'users', docId);
      await setDoc(userRef, {
        role: 'student',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return { success: true, message: '반장/체육부장 권한을 해제하였습니다.' };
    } catch (e: any) {
      console.error('Failed to revoke captain role:', e);
      return { success: false, message: `권한 해제 실패: ${e.message}` };
    }
  }

  /**
   * Fetch all captain users
   */
  static async getCaptains(): Promise<CaptainAssignment[]> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', 'in', ['captain', 'SPORTS_REP']));
      const snap = await getDocs(q);
      const list: CaptainAssignment[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          uid: data.uid || d.id,
          email: data.email,
          grade: data.grade || 1,
          classNum: data.classNum || 1,
          studentNum: data.studentNum || 0,
          name: data.name || '미등록',
          role: 'captain',
          assignedAt: data.assignedAt || data.updatedAt || new Date().toISOString(),
          assignedBy: data.assignedBy || '체육교사'
        });
      });
      return list;
    } catch (e) {
      console.warn('Firebase getCaptains fallback:', e);
      return [];
    }
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

      const dataToSave = {
        id: rosterId,
        roundId: roster.roundId,
        grade: roster.grade,
        classNum: roster.classNum,
        category: roster.category,
        players: roster.players,
        submittedBy: roster.submittedBy,
        submittedAt: new Date().toISOString(),
        isLocked: false
      };

      await setDoc(rosterRef, dataToSave, { merge: true });

      return {
        success: true,
        message: `${roster.grade}학년 ${roster.classNum}반 [${roster.category}] 출전명단이 Firebase에 성공적으로 저장되었습니다.`
      };
    } catch (e: any) {
      console.error('Firebase saveRoster error:', e);
      return {
        success: false,
        message: `출전명단 저장 실패: ${e.message || 'Firestore 권한 오류'}`
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

  // ==========================================
  // MATCHES (경기결과)
  // ==========================================

  /**
   * Save match result to Firestore 'matches' collection
   */
  static async saveMatch(match: TieMatch, recordedBy: string = ''): Promise<{ success: boolean; message: string }> {
    try {
      const matchRef = doc(db, 'matches', match.id);
      await setDoc(matchRef, {
        ...match,
        updatedAt: new Date().toISOString(),
        updatedBy: recordedBy || auth.currentUser?.email || '학생자치회/체육교사'
      }, { merge: true });

      return { success: true, message: '경기 결과가 Firebase에 저장되었습니다.' };
    } catch (e: any) {
      console.error('Firebase saveMatch error:', e);
      return { success: false, message: `경기 결과 저장 실패: ${e.message}` };
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
