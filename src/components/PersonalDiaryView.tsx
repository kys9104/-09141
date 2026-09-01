import React, { useState } from 'react';
import { 
  BookOpen, 
  PlusCircle, 
  Star, 
  HeartHandshake, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  MessageSquare, 
  Award,
  Copy,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { 
  GradeLevel, 
  MatchCategory, 
  StudentReflection, 
  UserProfile 
} from '../types';
import { CATEGORIES, LEAGUE_ROUNDS } from '../data/initialData';
import { StorageService } from '../services/storageService';
import { GASService } from '../services/gasService';
import { StudentEvaluationService } from '../services/studentEvaluationService';

interface PersonalDiaryViewProps {
  currentUser: UserProfile | null;
  onOpenLogin: () => void;
}

export const PersonalDiaryView: React.FC<PersonalDiaryViewProps> = ({
  currentUser,
  onOpenLogin
}) => {
  const [reflections, setReflections] = useState<StudentReflection[]>(StorageService.getReflections());
  const [isWriting, setIsWriting] = useState<boolean>(false);
  const [copiedDraft, setCopiedDraft] = useState<boolean>(false);

  // Form State
  const [roundId, setRoundId] = useState<number>(1);
  const [category, setCategory] = useState<MatchCategory>('MEN_SINGLES');
  const [opponentClass, setOpponentClass] = useState<number>(2);
  const [roleInMatch, setRoleInMatch] = useState<'PLAYER' | 'CHEERING' | 'REFEREE' | 'STAFF' | 'SPECTATOR'>('PLAYER');
  const [rating, setRating] = useState<number>(5);
  const [sportsmanshipCheck, setSportsmanshipCheck] = useState<boolean>(true);
  const [improvedSkills, setImprovedSkills] = useState<string[]>(['스매시 타점', '파트너와의 소통']);
  const [content, setContent] = useState<string>('');

  const availableSkills = [
    '스매시 타점', '헤어핀 네트플레이', '풋워크 및 이동', 
    '파트너와의 소통', '서브 리시브', '경기 집중력·멘탈', 
    '수비 리턴', '로테이션 전술', '체력 및 지구력', '상대 빈공간 공략'
  ];

  const handleToggleSkill = (skill: string) => {
    setImprovedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const newReflection: StudentReflection = {
      id: 'ref-' + Date.now(),
      createdAt: new Date().toLocaleDateString('ko-KR') + ' ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      grade: currentUser?.grade || 1,
      classNum: currentUser?.classNum || 1,
      studentNum: currentUser?.studentNum || 1,
      studentName: currentUser?.name || '익명 학생',
      roundId,
      category,
      opponentClass,
      roleInMatch,
      rating,
      sportsmanshipCheck,
      improvedSkills,
      content: content.trim(),
      teacherComment: '체육교사 확인: 성실하고 깊이 있는 성찰 내용입니다. 경기 기량 향상과 긍정적인 스포츠 태도가 돋보입니다.'
    };

    const updated = StorageService.addReflection(newReflection);
    setReflections(updated);

    // Auto-sync with Google Apps Script
    GASService.sendToGAS('STUDENT_REFLECTION', newReflection).catch(console.error);

    setContent('');
    setIsWriting(false);
  };

  const myReflections = currentUser 
    ? reflections.filter(r => r.studentName === currentUser.name || (r.grade === currentUser.grade && r.classNum === currentUser.classNum && r.studentNum === currentUser.studentNum))
    : reflections;

  // Algorithmic evaluation draft for current user
  const evaluationDraft = currentUser ? StudentEvaluationService.generateStudentReport({
    studentName: currentUser.name,
    grade: currentUser.grade,
    classNum: currentUser.classNum,
    studentNum: currentUser.studentNum,
    role: currentUser.role
  }) : null;

  const handleCopyRecord = () => {
    if (!evaluationDraft) return;
    navigator.clipboard.writeText(evaluationDraft.generatedRecord);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-[#12192B] border border-white/10 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#E2FF00] mb-1 font-mono">
            <BookOpen className="w-3.5 h-3.5" />
            <span>STUDENT REFLECTION & LIFE RECORD MODULE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            경기 소감 & <span className="text-[#E2FF00]">성찰 일기</span>
          </h2>
          <p className="text-xs text-white/50 mt-1">
            라운드별 경기 참여 소감과 향상된 기술, 스포츠맨십을 기록하면 생활기록부(세특) 문구가 실시간 조합됩니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!currentUser ? (
            <button
              onClick={onOpenLogin}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#E2FF00] text-black shadow-[0_0_12px_rgba(226,255,0,0.3)] transition hover:opacity-90"
            >
              로그인 후 일기 작성
            </button>
          ) : (
            <button
              onClick={() => setIsWriting(!isWriting)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#E2FF00] text-black shadow-[0_0_12px_rgba(226,255,0,0.3)] hover:opacity-90 transition"
            >
              <PlusCircle className="w-4 h-4 text-black" />
              <span>{isWriting ? '작성창 닫기' : '새 경기 소감문 작성'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Algorithmic Life Record (생기부) Preview Card for Student */}
      {currentUser && evaluationDraft && (
        <div className="p-6 rounded-2xl bg-[#12192B] border border-white/10 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E2FF00]/10 border border-[#E2FF00]/30 flex items-center justify-center text-[#E2FF00]">
                <Sparkles className="w-4 h-4 text-[#E2FF00]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{currentUser.name} 학생의 학교생활기록부(세특) 자동 조합 문구</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E2FF00]/15 text-[#E2FF00] font-mono border border-[#E2FF00]/30">
                    ALGO GENERATED
                  </span>
                </h3>
                <p className="text-[11px] text-white/40">
                  출전 경기수, 승률, 성찰 키워드 및 스포츠맨십 지표를 종합 분석한 표준 문안입니다.
                </p>
              </div>
            </div>

            <button
              onClick={handleCopyRecord}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition font-mono"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedDraft ? 'COPIED!' : 'COPY DRAFT'}</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/10 text-xs sm:text-sm text-white/90 leading-relaxed font-sans">
            "{evaluationDraft.generatedRecord}"
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-white/50 pt-1 font-mono">
            <span>출전: <strong className="text-white">{evaluationDraft.matchesPlayed}경기</strong></span>
            <span>승률: <strong className="text-[#E2FF00]">{evaluationDraft.winRate}%</strong></span>
            <span>성찰기록: <strong className="text-blue-400">{evaluationDraft.reflectionsCount}회</strong></span>
            <span>스포츠맨십: <strong className="text-lime-400">{evaluationDraft.sportsmanshipScore}회 완료</strong></span>
          </div>
        </div>
      )}

      {/* Writing Form Card */}
      {isWriting && (
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-[#12192B] border border-[#E2FF00]/30 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#E2FF00]" />
              <span>경기 소감문 / 일기 작성</span>
            </h3>
            <span className="text-xs text-white/50 font-mono">
              USER: {currentUser?.grade}학년 {currentUser?.classNum}반 {currentUser?.name}
            </span>
          </div>

          {/* Round, Category, Opponent Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                라운드 선택
              </label>
              <select
                value={roundId}
                onChange={(e) => setRoundId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0F1D] border border-white/10 text-white text-xs font-medium focus:border-[#E2FF00] focus:outline-none"
              >
                {LEAGUE_ROUNDS.map(r => (
                  <option key={r.id} value={r.id}>
                    제{r.id}라운드 ({r.date.split(' ')[1]} {r.date.split(' ')[2]})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                종목 선택
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MatchCategory)}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0F1D] border border-white/10 text-white text-xs font-medium focus:border-[#E2FF00] focus:outline-none"
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.shortName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                상대 학급
              </label>
              <select
                value={opponentClass}
                onChange={(e) => setOpponentClass(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0F1D] border border-white/10 text-white text-xs font-medium focus:border-[#E2FF00] focus:outline-none"
              >
                <option value={1}>1반</option>
                <option value={2}>2반</option>
                <option value={3}>3반</option>
              </select>
            </div>
          </div>

          {/* Role & Self Star Rating */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                나의 참여 역할
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: 'PLAYER', label: '선수 출전' },
                  { id: 'CHEERING', label: '학급 응원단' },
                  { id: 'REFEREE', label: '심판/기록' }
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRoleInMatch(r.id as any)}
                    className={`py-2 rounded-xl border font-bold text-center transition ${
                      roleInMatch === r.id
                        ? 'bg-[#E2FF00] text-black border-[#E2FF00]'
                        : 'bg-[#0A0F1D] border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                자기 만족도 평가 (1~5점)
              </label>
              <div className="flex items-center gap-1.5 py-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-[#E2FF00] hover:scale-110 transition"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= rating ? 'fill-[#E2FF00] text-[#E2FF00]' : 'text-white/20'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs font-bold text-[#E2FF00] font-mono">{rating} / 5 PTS</span>
              </div>
            </div>
          </div>

          {/* Improved Skills Tag Selector */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-2">
              이번 경기에서 스스로 성장/향상되었다고 느낀 기술 및 태도 (복수 선택)
            </label>
            <div className="flex flex-wrap gap-2">
              {availableSkills.map(skill => {
                const isSelected = improvedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleToggleSkill(skill)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      isSelected
                        ? 'bg-[#E2FF00]/15 border-[#E2FF00] text-[#E2FF00]'
                        : 'bg-[#0A0F1D] border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}{skill}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sportsmanship Checkbox */}
          <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-white/10">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sportsmanshipCheck}
                onChange={(e) => setSportsmanshipCheck(e.target.checked)}
                className="w-4 h-4 rounded bg-[#12192B] border-white/20 text-[#E2FF00] focus:ring-[#E2FF00]"
              />
              <span className="text-xs font-medium text-white/80 flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-rose-400" />
                경기 규칙을 준수하고 상대방 및 팀원과 예의 바르게 악수·격려하며 스포츠맨십을 실천했습니다.
              </span>
            </label>
          </div>

          {/* Content Textarea */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">
              상세 경기 소감 및 배운 점 (생기부 세특에 자동 반영됩니다)
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="예: 경기 초반 서브 리시브에 실수가 있었지만, 파트너와 차분히 소통하며 수비 위치를 조율하여 역전승을 거두었습니다. 스포츠를 통해 포기하지 않는 끈기를 배웠습니다..."
              className="w-full p-4 rounded-xl bg-[#0A0F1D] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#E2FF00] text-xs sm:text-sm leading-relaxed"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsWriting(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/60 bg-white/5 hover:bg-white/10 transition"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-black bg-[#E2FF00] hover:opacity-90 shadow-[0_0_12px_rgba(226,255,0,0.3)] transition flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-black" />
              <span>소감문 저장 및 동기화</span>
            </button>
          </div>
        </form>
      )}

      {/* Past Reflections List */}
      <div className="space-y-4">
        <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#E2FF00]" />
          <span>작성된 경기 소감문 모음 ({myReflections.length}건)</span>
        </h3>

        {myReflections.length === 0 ? (
          <div className="p-12 text-center bg-[#12192B] rounded-2xl border border-white/10 text-white/40 text-xs sm:text-sm font-mono">
            아직 등록된 경기 소감문이 없습니다. 상단 [+ 새 경기 소감문 작성] 버튼을 눌러 첫 일기를 남겨보세요!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myReflections.map((ref) => (
              <div
                key={ref.id}
                className="p-5 rounded-2xl bg-[#12192B] border border-white/10 hover:border-white/20 transition shadow-lg space-y-3"
              >
                {/* Top Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E2FF00]/15 text-[#E2FF00] font-mono border border-[#E2FF00]/30">
                      R{ref.roundId}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {ref.grade}학년 {ref.classNum}반 {ref.studentName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < ref.rating ? 'fill-[#E2FF00] text-[#E2FF00]' : 'text-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Sub info */}
                <div className="text-[11px] text-white/50 flex items-center gap-3 font-mono">
                  <span>종목: <strong className="text-white">{ref.category}</strong></span>
                  <span>상대: <strong className="text-white">{ref.opponentClass}반</strong></span>
                  <span>역할: <strong className="text-[#E2FF00]">{ref.roleInMatch}</strong></span>
                </div>

                {/* Content */}
                <p className="text-xs text-white/80 leading-relaxed bg-[#0A0F1D] p-3.5 rounded-xl border border-white/5">
                  "{ref.content}"
                </p>

                {/* Improved Skills Pills */}
                {ref.improvedSkills && ref.improvedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {ref.improvedSkills.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-[#E2FF00] border border-white/10">
                        #{s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Teacher Comment */}
                {ref.teacherComment && (
                  <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 font-medium">
                    {ref.teacherComment}
                  </div>
                )}

                <div className="text-[10px] text-white/30 text-right font-mono">
                  {ref.createdAt}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
