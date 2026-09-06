import { getAccessToken } from './googleAuthService';
import { SubMatch, TieMatch } from '../types';

const STORAGE_KEY_SPREADSHEET_ID = 'sinan_badminton_spreadsheet_id_v1';

export class GoogleSheetsService {
  static getStoredSpreadsheetId(): string | null {
    return localStorage.getItem(STORAGE_KEY_SPREADSHEET_ID);
  }

  static setStoredSpreadsheetId(id: string) {
    localStorage.setItem(STORAGE_KEY_SPREADSHEET_ID, id);
  }

  /**
   * Helper: Translates MatchCategory enum to Korean display name
   */
  static getCategoryKo(cat: string): string {
    switch (cat) {
      case 'MEN_SINGLES': return '남자 단식';
      case 'WOMEN_SINGLES': return '여자 단식';
      case 'MEN_DOUBLES': return '남자 복식';
      case 'WOMEN_DOUBLES': return '여자 복식';
      case 'MIXED_DOUBLES': return '혼합 복식';
      default: return cat;
    }
  }

  /**
   * Ensures the target spreadsheet exists. If not, creates one on Google Drive with styled tabs.
   */
  static async getOrCreateSpreadsheet(): Promise<string> {
    const existingId = this.getStoredSpreadsheetId();
    const token = await getAccessToken();
    if (!token) {
      throw new Error('구글 인증 토큰이 필요합니다. 먼저 [Google 로그인]을 진행해주세요.');
    }

    if (existingId) {
      // Test if file is accessible
      try {
        const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${existingId}?fields=spreadsheetId,properties.title`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (checkRes.ok) {
          return existingId;
        }
      } catch (err) {
        console.warn('Existing spreadsheet unreachable, creating a new one', err);
      }
    }

    // Create a new spreadsheet with customized sheets
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: '신안해양과학고등학교 배드민턴 리그 경기결과'
        },
        sheets: [
          {
            properties: {
              title: '경기결과',
              gridProperties: { frozenRowCount: 1 }
            }
          }
        ]
      })
    });

    if (!createRes.ok) {
      const errJson = await createRes.json();
      throw new Error(errJson.error?.message || '스프레드시트 생성 실패');
    }

    const createdData = await createRes.json();
    const newId = createdData.spreadsheetId;
    this.setStoredSpreadsheetId(newId);

    // Initialize Headers
    await this.initHeaders(newId, token);

    return newId;
  }

  /**
   * Writes headers and formatting to newly created sheets
   */
  private static async initHeaders(spreadsheetId: string, token: string) {
    const matchHeaders = [
      '기록일시', '라운드', '학년', '경기일자', '대진(팀A vs 팀B)', '종목', '코트',
      'A팀 출전선수', 'B팀 출전선수', '세트스코어', '승리팀', 'MVP선수', '스매시(A/B)', '심판/기록자'
    ];

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/경기결과!A1:N1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [matchHeaders] })
    });
  }

  /**
   * Appends match result rows to Google Sheets
   */
  static async appendMatchResult(tie: TieMatch, recordedBy: string = ''): Promise<{ success: boolean; spreadsheetUrl: string; message: string }> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Google 로그인이 필요합니다.');
    }

    const spreadsheetId = await this.getOrCreateSpreadsheet();
    const rows: any[][] = [];
    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    tie.subMatches.forEach((sm: SubMatch) => {
      const setsText = (sm.sets || []).map(s => `${s.scoreA}:${s.scoreB}`).join(' / ');
      const teamANames = (sm.teamAPlayers || []).map(p => p.name).join(', ');
      const teamBNames = (sm.teamBPlayers || []).map(p => p.name).join(', ');
      const categoryName = this.getCategoryKo(sm.category);
      
      let winnerText = '진행중/미완료';
      if (sm.winnerTeam === 'A') {
        winnerText = `${tie.teamAGrade}학년 ${tie.teamAClass}반 승`;
      } else if (sm.winnerTeam === 'B') {
        winnerText = `${tie.teamBGrade}학년 ${tie.teamBClass}반 승`;
      }

      rows.push([
        now,
        `제${tie.roundId}라운드`,
        `${tie.teamAGrade || tie.grade}학년`,
        tie.date,
        `${tie.teamAGrade}-${tie.teamAClass} vs ${tie.teamBGrade}-${tie.teamBClass}`,
        categoryName,
        sm.court || '제1코트',
        teamANames,
        teamBNames,
        setsText || '-',
        winnerText,
        sm.stats?.mvpPlayerName || '-',
        sm.stats ? `${sm.stats.smashWinnersA || 0} / ${sm.stats.smashWinnersB || 0}` : '-',
        sm.referee || sm.recordedBy || recordedBy || '-'
      ]);
    });

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/경기결과!A:N:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: rows })
    });

    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error?.message || '경기결과 시트 기록 실패');
    }

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    return {
      success: true,
      spreadsheetUrl,
      message: `경기결과 (${rows.length}건)가 구글 스프레드시트에 성공적으로 자동 기록되었습니다.`
    };
  }
}
