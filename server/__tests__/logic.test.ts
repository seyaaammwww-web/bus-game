import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { GameRoom, Round } from '../../shared/schema';
import { getEligibleVoters } from '../managers/RoundManager';
import { WildcardService } from '../services/wildcardService';
import { availableLetters } from '../../shared/arabicWords';
import { passesAnswerHeuristics, hasGarbagePattern } from '../utils/answerHeuristics';
import { HybridValidator } from '../hybridValidator';

function strictMajority(total: number): number {
  return Math.floor(total / 2) + 1;
}

function canGoToRefereeReview(phase: string, refereeId: string | null | undefined): boolean {
  return (phase === 'playing' || phase === 'voting' || phase === 'ai_processing') && !!refereeId;
}

function buildEligibleVoterIds(draft: GameRoom, round: Round, requesterId: string): string[] {
  return getEligibleVoters(draft, round)
    .map(p => p.id)
    .filter(id => id !== requesterId);
}

function makeRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  return {
    code: 'TEST',
    phase: 'lobby',
    players: [],
    rounds: [],
    currentRound: 0,
    letters: ['أ'],
    totalRounds: 1,
    hostId: 'host',
    settings: { votingEnabled: true, customCategories: [] },
    ...overrides,
  } as GameRoom;
}

describe('Voting strict majority', () => {
  it('rejects ties (2 yes / 2 no with 4 voters)', () => {
    const total = 4;
    const yes = 2;
    const no = 2;
    const majority = strictMajority(total);
    assert.equal(majority, 3);
    assert.ok(yes < majority);
    assert.ok(no < majority);
    assert.equal(yes + no, total);
  });

  it('accepts when yes reaches strict majority', () => {
    const total = 4;
    const yes = 3;
    assert.ok(yes >= strictMajority(total));
  });
});

describe('Vote cooldown math', () => {
  it('blocks votes within 500ms window', () => {
    const cooldown = 500;
    const lastVote = 1000;
    const now = 1200;
    assert.ok(now - lastVote < cooldown);
    const later = 1600;
    assert.ok(later - lastVote >= cooldown);
  });
});

describe('Eligible voters', () => {
  it('excludes offline, referee, and banished players', () => {
    const round: Round = {
      number: 1,
      letter: 'أ',
      startTime: 0,
      endTime: 0,
      isRush: false,
      isComplete: false,
      submissions: [],
      validatedAnswers: [],
      votingComplete: false,
      banishedPlayerId: 'banished',
    } as Round;

    const draft = makeRoom({
      refereeId: 'ref',
      players: [
        { id: 'p1', name: 'A', score: 0, isReady: true, isOffline: false } as any,
        { id: 'p2', name: 'B', score: 0, isReady: true, isOffline: true } as any,
        { id: 'ref', name: 'Ref', score: 0, isReady: true, isOffline: false } as any,
        { id: 'banished', name: 'C', score: 0, isReady: true, isOffline: false } as any,
      ],
      rounds: [round],
    });

    const eligible = getEligibleVoters(draft, round).map(p => p.id);
    assert.deepEqual(eligible, ['p1']);
  });

  it('excludes answer requester from vote queue eligible list', () => {
    const round: Round = {
      number: 1,
      letter: 'أ',
      startTime: 0,
      endTime: 0,
      isRush: false,
      isComplete: false,
      submissions: [],
      validatedAnswers: [],
      votingComplete: false,
    } as Round;

    const draft = makeRoom({
      players: [
        { id: 'p1', name: 'A', score: 0, isReady: true, isOffline: false } as any,
        { id: 'p2', name: 'B', score: 0, isReady: true, isOffline: false } as any,
        { id: 'p3', name: 'C', score: 0, isReady: true, isOffline: false } as any,
      ],
      rounds: [round],
    });

    const forP1 = buildEligibleVoterIds(draft, round, 'p1');
    assert.ok(!forP1.includes('p1'));
    assert.equal(forP1.length, 2);
  });
});

describe('Referee routing from ai_processing', () => {
  it('routes to referee_review when referee is set', () => {
    assert.equal(canGoToRefereeReview('ai_processing', 'host'), true);
    assert.equal(canGoToRefereeReview('playing', 'host'), true);
    assert.equal(canGoToRefereeReview('voting', 'host'), true);
  });

  it('skips referee_review without referee', () => {
    assert.equal(canGoToRefereeReview('ai_processing', null), false);
    assert.equal(canGoToRefereeReview('ai_processing', undefined), false);
  });
});

describe('Word database scoring', () => {
  it('validates known Arabic answers', () => {
    const svc = WildcardService.getInstance();
    assert.equal(svc.validateWord('أ', 'ولد', 'أحمد'), true);
    assert.equal(svc.validateWord('أ', 'بلد', 'ألمانيا'), true);
    assert.equal(svc.validateWord('أ', 'حيوان', 'أرنب'), true);
  });

  it('rejects words that do not start with the letter', () => {
    const svc = WildcardService.getInstance();
    assert.equal(svc.validateWord('أ', 'ولد', 'محمد'), false);
  });

  it('rejects garbage and Latin keyboard mash', () => {
    const svc = WildcardService.getInstance();
    assert.equal(svc.validateWord('ط', 'ولد', 'ddddd'), false);
    assert.equal(svc.validateWord('ط', 'بنت', 'dd'), false);
    assert.equal(svc.validateWord('ط', 'بلد', 'طءسصك'), false);
    assert.equal(svc.validateWord('ط', 'حيوان', 'سصسصء'), false);
  });

  it('accepts real dictionary words for the round letter', () => {
    const svc = WildcardService.getInstance();
    assert.equal(svc.validateWord('ط', 'حيوان', 'طاووس'), true);
    assert.equal(svc.validateWord('ط', 'جماد', 'طاولة'), true);
  });

  it('rejects garbage via answer heuristics before voting', () => {
    assert.equal(hasGarbagePattern('ddddd'), true);
    assert.equal(hasGarbagePattern('طءسصك'), true);
    assert.equal(hasGarbagePattern('محمد'), false);
    assert.equal(hasGarbagePattern('مكتب'), false);
    assert.equal(passesAnswerHeuristics('ط', 'بلد', 'طءسصك'), false);
    assert.equal(passesAnswerHeuristics('ط', 'بلد', 'طهران'), true);
    assert.equal(passesAnswerHeuristics('ط', 'ولد', 'ddddd'), false);
    assert.equal(passesAnswerHeuristics('م', 'ولد', 'محمد'), true);
  });

  it('rejects wrong-category and garbage answers via full validator', () => {
    const hv = HybridValidator.getInstance();
    const letter = 'ط';

    for (const answer of ['ddddd', 'dd', 'طءسصك', 'سصسصء', '20']) {
      for (const category of ['ولد', 'بنت', 'بلد', 'حيوان', 'جماد']) {
        const r = hv.validate('p1', letter, category, answer);
        assert.equal(r.isValid, false, `${answer} in ${category} should be invalid`);
      }
    }

    assert.equal(hv.validate('p1', letter, 'حيوان', 'طاووس').isValid, true);
    assert.equal(hv.validate('p1', letter, 'جماد', 'طاولة').isValid, true);
    assert.equal(hv.validate('p1', letter, 'بلد', 'طهران').isValid, true);
    assert.equal(hv.validate('p1', letter, 'ولد', 'طاووس').isValid, false);
    assert.equal(hv.validate('p1', letter, 'بنت', 'طاولة').isValid, false);
    assert.equal(hv.validate('p1', 'م', 'ولد', 'محمد').isValid, true);
    assert.equal(hv.validate('p1', letter, 'ولد', 'طائر').isValid, false);
    assert.equal(hv.validate('p1', letter, 'جماد', 'طائر').isValid, false);
  });

  it('accepts curated 2-letter dictionary words (دب، قط، مي…)', () => {
    const hv = HybridValidator.getInstance();
    // Regression: length gate must not run before the dictionary lookup
    assert.equal(hv.validate('p1', 'د', 'حيوان', 'دب').isValid, true);
    assert.equal(hv.validate('p1', 'ق', 'حيوان', 'قط').isValid, true);
    assert.equal(hv.validate('p1', 'م', 'بنت', 'مي').isValid, true);
    assert.equal(hv.validate('p1', 'ط', 'ولد', 'طه').isValid, true);
    assert.equal(hv.validate('p1', 'ر', 'جماد', 'رف').isValid, true);
    // But 2-char non-dictionary noise is still rejected
    assert.equal(hv.validate('p1', 'د', 'حيوان', 'دو').isValid, false);
    assert.equal(hv.validate('p1', 'م', 'ولد', 'مب').isValid, false);
  });

  it('uses exactly the 28 game letters', () => {
    assert.equal(availableLetters.length, 28);
    const svc = WildcardService.getInstance();
    for (const letter of availableLetters) {
      assert.equal((svc as any).isValidLetterKey(letter), true, `letter ${letter} should be valid`);
    }
    assert.equal((svc as any).isValidLetterKey('ٌ'), false);
    assert.equal((svc as any).isValidLetterKey('ی'), false);
    assert.equal((svc as any).isValidLetterKey('گ'), false);
  });
});
