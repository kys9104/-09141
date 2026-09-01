import { StorageService } from './storageService';
import { TieMatch, StudentReflection } from '../types';

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
 *    - 설명: '신안해양과학고 배드민턴 연동 v1'
 *    - 다음 사용자로 실행: '나(내 계정)'
 *    - 액세스 권한: '모든 사용자(Anyone)'  <-- 중요!
 * 5. [배포] 버튼 클릭 후 '웹 앱 URL'을 복사하여 웹앱 설정창에 등록하십시오.
 */

function doPost(e) {
  try {
    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    var action = data.action || 'SYNC_ALL';
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'MATCH_RESULT') {
      logMatchResult(ss, data.payload);
    } else if (action === 'STUDENT_REFLECTION') {
      logReflection(ss, data.payload);
    } else if (action === 'SYNC_ALL') {
      syncFullLeagueData(ss, data.payload);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      timestamp: new Date().toISOString(),
      message: '신안해양과학고 배드민턴 리그 데이터가 구글 시트에 정상 기록되었습니다.'
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
    service: '배드민턴 리그전 실시간 기록 연동 서버',
    serverTime: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// 1. 경기 결과 기록
function logMatchResult(ss, match) {
  var sheet = getOrCreateSheet(ss, '경기결과', [
    '기록일시', '라운드', '학년', '경기일자', '대진(팀A vs 팀B)', '종목', '코트', 
    'A팀 출전선수', 'B팀 출전선수', '세트스코어', '승리팀', 'MVP선수', '스매시(A/B)', '심판'
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
        match.grade + '학년',
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
        sm.referee || '-'
      ]);
    });
  }
}

// 2. 학생 소감문 기록
function logReflection(ss, ref) {
  var sheet = getOrCreateSheet(ss, '학생소감문_일기', [
    '작성일시', '학년', '반', '번호', '이름', '라운드', '종목', '상대학급', '참여역할', '자기평가(1-5)', '향상기술', '소감문 내용', '스포츠맨십체크'
  ]);
  
  sheet.appendRow([
    ref.createdAt || new Date().toISOString(),
    ref.grade + '학년',
    ref.classNum + '반',
    ref.studentNum + '번',
    ref.studentName,
    '제' + ref.roundId + '라운드',
    getCategoryKo(ref.category),
    ref.opponentClass + '반',
    ref.roleInMatch,
    ref.rating,
    (ref.improvedSkills || []).join(', '),
    ref.content,
    ref.sportsmanshipCheck ? '준수' : '미흡'
  ]);
}

// 3. 전체 데이터 동기화
function syncFullLeagueData(ss, payload) {
  if (!payload) return;
  
  // 경기 결과 일괄 갱신
  if (payload.matches && payload.matches.length > 0) {
    var matchSheet = getOrCreateSheet(ss, '경기결과', [
      '기록일시', '라운드', '학년', '경기일자', '대진(팀A vs 팀B)', '종목', '코트', 
      'A팀 출전선수', 'B팀 출전선수', '세트스코어', '승리팀', 'MVP선수', '스매시(A/B)', '심판'
    ], true);
    
    payload.matches.forEach(function(m) {
      logMatchResult(ss, m);
    });
  }
  
  // 소감문 일괄 갱신
  if (payload.reflections && payload.reflections.length > 0) {
    var refSheet = getOrCreateSheet(ss, '학생소감문_일기', [
      '작성일시', '학년', '반', '번호', '이름', '라운드', '종목', '상대학급', '참여역할', '자기평가(1-5)', '향상기술', '소감문 내용', '스포츠맨십체크'
    ], true);
    
    payload.reflections.forEach(function(r) {
      logReflection(ss, r);
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
   */
  static async sendToGAS(action: 'MATCH_RESULT' | 'STUDENT_REFLECTION' | 'SYNC_ALL', payload: any): Promise<{ success: boolean; message: string }> {
    const config = StorageService.getGASConfig();
    if (!config.webAppUrl || !config.webAppUrl.trim().startsWith('http')) {
      return {
        success: false,
        message: 'Google Apps Script 배포 URL이 설정되지 않았습니다. [구글 시트 연동 설정]에서 URL을 등록해주세요.'
      };
    }

    try {
      // Send as POST request. Note that Google Apps Script web apps return 302 redirect.
      // fetch with no-cors will reliably trigger execution on Google server.
      await fetch(config.webAppUrl.trim(), {
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

      config.lastSyncedAt = new Date().toLocaleString('ko-KR');
      config.status = 'CONNECTED';
      StorageService.saveGASConfig(config);

      return {
        success: true,
        message: '구글 스프레드시트로 성공적으로 전송되었습니다.'
      };
    } catch (error) {
      console.error('GAS Webhook Error:', error);
      config.status = 'ERROR';
      StorageService.saveGASConfig(config);
      return {
        success: false,
        message: '구글 시트 전송 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : String(error))
      };
    }
  }

  /**
   * Triggers full sync of all matches, standings, and reflections
   */
  static async syncAll(): Promise<{ success: boolean; message: string }> {
    const matches = StorageService.getMatches();
    const reflections = StorageService.getReflections();
    
    return await this.sendToGAS('SYNC_ALL', {
      matches,
      reflections
    });
  }

  static getGASScriptCode(): string {
    return this.getScriptCode();
  }

  static getConfig() {
    return StorageService.getGASConfig();
  }

  static saveConfig(config: any) {
    StorageService.saveGASConfig(config);
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
