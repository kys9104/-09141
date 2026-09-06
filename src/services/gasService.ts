import { StorageService } from './storageService';
import { FirebaseService } from './firebaseService';
import { TieMatch } from '../types';

export class GASService {
  /**
   * Generates the complete, robust Google Apps Script (Code.gs) script code
   * with automatic sheet tab creation, formatting, and CORS-friendly JSON endpoints.
   */
  static getScriptCode(): string {
    return `/**
 * =========================================================================
 * 신안해양과학고등학교 배드민턴 리그전 - Google Apps Script (Code.gs)
 * =========================================================================
 * 
 * [배포 안내]
 * 1. 구글 스프레드시트 생성 -> 메뉴 [확장 프로그램] -> [Apps Script] 클릭
 * 2. 기존 코드를 모두 지우고 이 전체 코드를 붙여넣기 후 저장 (Ctrl+S)
 * 3. 우측 상단 [배포] -> [새 배포] 클릭
 * 4. 유형 선택 [웹 앱] 선택
 *    - 설명: '신안해양과학고 배드민턴 경기결과 연동'
 *    - 다음 사용자로 실행: '나(내 계정)'
 *    - 액세스 권한: '모든 사용자(Anyone)'  <-- 중요!
 * 5. [배포] 버튼 클릭 후 '웹 앱 URL'을 복사하여 체육교사 관리자 페이지에 등록하십시오.
 */

function doPost(e) {
  try {
    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    var action = data.action || 'SYNC_ALL';
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'MATCH_RESULT') {
      logMatchResult(ss, data.payload);
    } else if (action === 'SYNC_ALL') {
      syncFullLeagueData(ss, data.payload);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      timestamp: new Date().toISOString(),
      message: '신안해양과학고 배드민턴 리그 경기결과가 구글 시트에 정상 기록되었습니다.'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    school: '신안해양과학고등학교',
    service: '배드민턴 리그전 실시간 경기결과 연동 서버',
    serverTime: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// 1. 경기 결과 기록
function logMatchResult(ss, match) {
  var sheet = getOrCreateSheet(ss, '경기결과', [
    '기록일시', '라운드', '학년', '경기일자', '대진(팀A vs 팀B)', '종목', '코트', 
    'A팀 출전선수', 'B팀 출전선수', '세트스코어', '승리팀', 'MVP선수', '스매시(A/B)', '심판', '기록자'
  ]);
  
  if (match.subMatches) {
    match.subMatches.forEach(function(sm) {
      var setsText = (sm.sets || []).map(function(s){ return s.scoreA + ':' + s.scoreB; }).join(' / ');
      var teamANames = (sm.teamAPlayers || []).map(function(p){ return p.name; }).join(', ');
      var teamBNames = (sm.teamBPlayers || []).map(function(p){ return p.name; }).join(', ');
      var categoryName = getCategoryKo(sm.category);
      var winner = sm.winnerTeam === 'A' ? (match.grade + '학년 ' + match.teamAClass + '반') : (sm.winnerTeam === 'B' ? (match.grade + '학년 ' + match.teamBClass + '반') : '진행중');

      sheet.appendRow([
        new Date(),
        '제' + match.roundId + '라운드',
        (match.teamAGrade || match.grade || 1) + '학년',
        match.date,
        match.teamAClass + '반 vs ' + match.teamBClass + '반',
        categoryName,
        sm.court || '-',
        teamANames,
        teamBNames,
        setsText || '-',
        winner,
        (sm.stats && sm.stats.mvpPlayerName) || '-',
        (sm.stats ? (sm.stats.smashWinnersA || 0) + ' / ' + (sm.stats.smashWinnersB || 0) : '-'),
        sm.referee || '-',
        sm.recordedBy || match.updatedBy || '-'
      ]);
    });
  }
}

// 2. 전체 데이터 일괄 동기화
function syncFullLeagueData(ss, payload) {
  if (payload.matches && payload.matches.length > 0) {
    var sheet = getOrCreateSheet(ss, '경기결과', [
      '기록일시', '라운드', '학년', '경기일자', '대진(팀A vs 팀B)', '종목', '코트', 
      'A팀 출전선수', 'B팀 출전선수', '세트스코어', '승리팀', 'MVP선수', '스매시(A/B)', '심판', '기록자'
    ], true);
    
    payload.matches.forEach(function(m) {
      logMatchResult(ss, m);
    });
  }
}

// 헬퍼: 시트가 없으면 생성하고 헤더 스타일링
function getOrCreateSheet(ss, name, headers, clearIfExists) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#1e293b');
    headerRange.setFontColor('#f8fafc');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else if (clearIfExists) {
    sheet.clearContents();
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#1e293b');
    headerRange.setFontColor('#f8fafc');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getCategoryKo(cat) {
  var map = {
    'MEN_SINGLES': '남자 단식',
    'WOMEN_SINGLES': '여자 단식',
    'MEN_DOUBLES': '남자 복식',
    'WOMEN_DOUBLES': '여자 복식',
    'MIXED_DOUBLES': '혼합 복식'
  };
  return map[cat] || cat;
}
`;
  }

  /**
   * Dispatches real-time payload to Google Apps Script Webhook
   * (Checks Firebase settings/gasUrl first, falls back to localStorage config)
   */
  static async sendToGAS(action: 'MATCH_RESULT' | 'SYNC_ALL', payload: any): Promise<{ success: boolean; message: string }> {
    let webAppUrl = '';

    try {
      webAppUrl = await FirebaseService.getGasUrl();
    } catch (e) {
      console.warn('Failed to load gasUrl from Firebase:', e);
    }

    if (!webAppUrl) {
      const localConfig = StorageService.getGASConfig();
      webAppUrl = localConfig.webAppUrl || '';
    }

    if (!webAppUrl || !webAppUrl.trim().startsWith('http')) {
      return {
        success: false,
        message: 'Google Apps Script URL이 설정되지 않았습니다. 체육교사 관리자 페이지에서 URL을 등록해주세요.'
      };
    }

    try {
      await fetch(webAppUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          payload,
          timestamp: new Date().toISOString()
        })
      });

      const config = StorageService.getGASConfig();
      config.webAppUrl = webAppUrl;
      config.lastSyncedAt = new Date().toLocaleString('ko-KR');
      config.status = 'CONNECTED';
      StorageService.saveGASConfig(config);

      return {
        success: true,
        message: '구글 스프레드시트로 경기 결과가 실시간 백업되었습니다.'
      };
    } catch (error) {
      console.error('GAS Webhook Error:', error);
      return {
        success: false,
        message: '구글 시트 전송 중 오류: ' + (error instanceof Error ? error.message : String(error))
      };
    }
  }

  /**
   * Triggers full sync of all matches to Google Sheets
   */
  static async syncAll(): Promise<{ success: boolean; message: string }> {
    const matches = StorageService.getMatches();
    return await this.sendToGAS('SYNC_ALL', { matches });
  }

  static getGASScriptCode(): string {
    return this.getScriptCode();
  }

  static getConfig() {
    return StorageService.getGASConfig();
  }

  static saveConfig(config: any) {
    StorageService.saveGASConfig(config);
    if (config.webAppUrl) {
      FirebaseService.saveGasUrl(config.webAppUrl);
    }
  }

  static async testConnection(url: string): Promise<{ success: boolean; message: string }> {
    try {
      await fetch(url.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PING', timestamp: new Date().toISOString() })
      });
      return {
        success: true,
        message: 'Google Apps Script 웹 앱과 성공적으로 통신되었습니다! (PING 완료)'
      };
    } catch (e) {
      return {
        success: false,
        message: '연결 실패: ' + (e instanceof Error ? e.message : String(e))
      };
    }
  }
}
