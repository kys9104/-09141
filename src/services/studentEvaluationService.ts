import { StorageService } from './storageService';
import { GradeLevel, MatchCategory, UserRole } from '../types';

export interface EvaluationOptions {
  studentName: string;
  grade: GradeLevel;
  classNum: number;
  studentNum: number;
  role?: UserRole;
  emphasis?: 'BALANCED' | 'LEADERSHIP' | 'SKILL' | 'SPORTSMANSHIP' | 'GROWTH';
}

export class StudentEvaluationService {
  /**
   * Generates school record draft (세특 & 행특) using Pure JS algorithmic rules
   */
  static generateStudentReport(opts: EvaluationOptions) {
    const { studentName, grade, classNum, studentNum, role = 'STUDENT', emphasis = 'BALANCED' } = opts;
    const stats = StorageService.getPlayerStats(studentName);
    const reflections = StorageService.getReflections().filter(
      r => r.studentName === studentName || (r.grade === grade && r.classNum === classNum && r.studentNum === studentNum)
    );

    const sportsReps = StorageService.getSportsRepresentatives();
    const isSportsRep = sportsReps[`${grade}-${classNum}`] === studentName || role === 'SPORTS_REP';
    const isStudentCouncil = role === 'STUDENT_COUNCIL';

    // Extract unique skills from reflections
    const skillSet = new Set<string>();
    reflections.forEach(r => {
      (r.improvedSkills || []).forEach(s => skillSet.add(s));
    });
    const skillsList = Array.from(skillSet);

    // 1. Generate Subject Specific Record (교과 세부능력 및 특기사항)
    const subjectSections: string[] = [];

    // Part A: Participation & Role
    if (isSportsRep) {
      subjectSections.push(
        `신안해양과학고등학교 교내 배드민턴 리그전에서 학급의 체육부장(경기운영 리더)으로서 매 라운드 1일 전까지 선수 출전 명단을 체계적으로 조율·제출하고, 팀원들의 컨디션을 세심하게 점검하며 경기를 원활하게 이끄는 뛰어난 리더십을 발휘함.`
      );
    } else if (isStudentCouncil) {
      subjectSections.push(
        `교내 배드민턴 리그전 학생자치회 운영진으로서 공정한 경기 심판 및 실시간 스코어보드 기록, 경기 통계 데이터 집계를 책임감 있게 수행하여 성공적인 리그전 운영에 크게 기여함.`
      );
    } else if (stats.played > 0) {
      const catNames = stats.categoriesPlayed.map(c => this.getCategoryKo(c)).join(', ');
      subjectSections.push(
        `교내 배드민턴 리그전에서 학급 대표 선수(${catNames})로 주도적으로 출전하여 매 경기 강한 승부욕과 끈기 있는 집중력을 보여줌.`
      );
    } else {
      subjectSections.push(
        `교내 배드민턴 리그전 전 과정에서 학급 서포터즈 및 응원단으로서 성실하게 참여하여 학급의 단합과 활기찬 스포츠 분위기 조성에 적극 동참함.`
      );
    }

    // Part B: Technical Skills & Match Execution
    if (stats.played > 0) {
      const parts: string[] = [];
      if (stats.smashes > 5 || emphasis === 'SKILL') {
        parts.push(`타점 높은 강력한 오버헤드 스매시와 코트 구석을 찌르는 정교한 드롭샷을 적절히 구사하며 공격 주도권을 잡는 능력이 탁월함.`);
      }
      if (stats.categoriesPlayed.includes('MEN_DOUBLES') || stats.categoriesPlayed.includes('WOMEN_DOUBLES') || stats.categoriesPlayed.includes('MIXED_DOUBLES')) {
        parts.push(`복식 경기에서는 파트너와의 원활한 소통을 기반으로 공격-수비 로테이션을 능숙하게 전개하고 빈 공간을 즉각 커버하는 유기적인 팀워크를 구현함.`);
      } else {
        parts.push(`단식 경기에서는 안정적인 풋워크와 상대의 움직임을 예측한 헤어핀 네트플레이를 활용해 랠리를 유리하게 이끌어 감.`);
      }
      if (stats.winRate >= 60) {
        parts.push(`총 ${stats.played}전 ${stats.wins}승(승률 ${stats.winRate}%)의 우수한 전적을 기록하며 팀의 리그 상위권 도약에 핵심적인 기여를 함.`);
      } else {
        parts.push(`매 경기 승패에 연연하지 않고 끝까지 셔틀콕을 추격하는 성실한 태도와 집중력을 발휘함.`);
      }
      subjectSections.push(parts.join(' '));
    } else {
      subjectSections.push(`경기를 관전하며 전술 분석 및 상대 팀 랠리 패턴을 파악하여 출전 선수들에게 유용한 피드백을 전달하는 관찰력을 나타냄.`);
    }

    // Part C: Self-reflection & Sportsmanship
    if (reflections.length > 0) {
      const keySkillText = skillsList.length > 0 ? `특히 [${skillsList.slice(0, 3).join(', ')}] 영역에서` : '경기 운영 및 기술적 측면에서';
      subjectSections.push(
        `경기 후 정기적인 성찰 일기 작성을 통해 자신의 플레이를 객관적으로 분석하고, ${keySkillText} 지속적인 기량 향상을 위해 스스로 피드백을 수립하고 실천하는 자기주도적 학습 태도가 돋보임.`
      );
    } else {
      subjectSections.push(
        `경기 규칙을 철저히 준수하고 상대 선수를 존중하는 모범적인 스포츠맨십과 공동체 협력 역량을 고루 갖춤.`
      );
    }

    // 2. Generate Behavior & Comprehensive Opinion (행동특성 및 종합의견)
    const behaviorSections: string[] = [];
    if (isSportsRep) {
      behaviorSections.push(`(리더십 및 배려) 학급 체육부장으로서 공동의 목표를 위해 솔선수범하며, 팀원들의 다양한 의견을 경청하고 갈등 없이 조율하는 민주적 리더십이 뛰어남.`);
    } else if (isStudentCouncil) {
      behaviorSections.push(`(공동체 기여 및 책임감) 교내 리그전 운영진으로서 보이지 않는 곳에서도 공정성과 책임감을 가지고 헌신하는 봉사 정신과 뛰어난 업무 추진력을 갖춤.`);
    } else {
      behaviorSections.push(`(협동 및 배려) 학급 구성원들과 원활하게 소통하며 경기 중 발생할 수 있는 긴장 상황에서도 동료들을 따뜻하게 격려하고 북돋우는 배려심이 깊음.`);
    }

    behaviorSections.push(
      `(끈기 및 성실성) 체육 활동 및 리그전 전 일정에 성실하고 적극적인 자세로 참여하며, 위기 상황에서도 쉽게 포기하지 않고 최선을 다하는 강한 회복탄력성을 지님.`
    );

    return {
      studentName,
      grade,
      classNum,
      studentNum,
      role,
      matchesPlayed: stats.played,
      wins: stats.wins,
      winRate: stats.winRate,
      reflectionsCount: reflections.length,
      sportsmanshipScore: reflections.filter(r => r.sportsmanshipCheck).length,
      generatedRecord: subjectSections.join(' '),
      generatedRecordBehavior: behaviorSections.join(' ')
    };
  }

  private static getCategoryKo(category: MatchCategory): string {
    const map: Record<MatchCategory, string> = {
      MEN_SINGLES: '남자 단식',
      WOMEN_SINGLES: '여자 단식',
      MEN_DOUBLES: '남자 복식',
      WOMEN_DOUBLES: '여자 복식',
      MIXED_DOUBLES: '혼합 복식'
    };
    return map[category] || category;
  }
}
