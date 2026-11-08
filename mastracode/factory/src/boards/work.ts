import { DEFAULT_BOARD_ID } from './default-board.js';
import { compileBoardDefinition } from './define-board.js';
import type { BoardPhaseDefinition } from './define-board.js';

/**
 * The goal Building pursues. The goal judge sees only this text and the latest messages, so it
 * spells out when the build is done and when it waits for a person.
 */
export const BUILD_OBJECTIVE =
  'Build the plan approved in Planning for this work item. Done when every step of that plan is implemented on ' +
  "the work branch; the plan's verification gates (the tests, typecheck and lint it names, else the narrowest " +
  'relevant ones) were run on the final head and passed; the branch is pushed; and the card was moved on with ' +
  'factory_transition_work_item: to Review when self-review is on, to PR review after opening the change request ' +
  'when it is off, or back to Planning if the plan proved wrong. Continue while any of that is missing. Waiting ' +
  'only when the agent asked a person a question it cannot answer from the repository.';

export type WorkBoardPhase =
  | 'intake'
  | 'triage'
  | 'planning'
  | 'execute'
  | 'review'
  | 'pr-review'
  | 'done'
  | 'canceled';

export const workBoard = compileBoardDefinition<'work', Record<WorkBoardPhase, BoardPhaseDefinition<WorkBoardPhase>>>({
  id: DEFAULT_BOARD_ID,
  name: 'Work',
  initialPhase: 'intake',
  sourceClosed: { completed: 'done', canceled: 'canceled' },
  phases: {
    intake: {
      name: 'Intake',
      kind: 'resting',
      // Never straight to Building or Review: a plan comes first, and Review is self-review of a
      // build. PR review takes a pull request's own card; Done is where a completed source closes it.
      nextPhases: ['triage', 'planning', 'pr-review', 'done', 'canceled'],
    },
    triage: {
      name: 'Triage',
      kind: 'working',
      runner: { skill: 'factory-triage', context: 'triage' },
      // A confirmed bug goes to Planning; any other open issue waits in Intake for a person.
      nextPhases: ['intake', 'planning', 'done', 'canceled'],
    },
    planning: {
      name: 'Planning',
      kind: 'working',
      // Planning and Building share one session, so the builder keeps the plan's context.
      runner: { skill: 'factory-plan', context: 'work' },
      nextPhases: ['execute', 'triage', 'intake', 'done', 'canceled'],
      // An approved plan moves the card into Building; an agent cannot move it there itself.
      exitTool: { id: 'submit_plan', autoApprove: false, next: 'execute' },
    },
    execute: {
      name: 'Building',
      kind: 'working',
      runner: { skill: 'factory-build', context: 'work', goal: { objective: BUILD_OBJECTIVE, maxRuns: 20 } },
      // Review with self-review on; PR review once the builder opened the change request with it
      // off; Planning again when the build shows the plan was wrong.
      nextPhases: ['review', 'pr-review', 'planning', 'done', 'canceled'],
    },
    review: {
      name: 'Review',
      // An independent reviewer tests the builder's pushed branch in its own review seat
      // (self-review); on approve it opens the change request and moves the card to PR review.
      kind: 'working',
      runner: { skill: 'factory-self-review', context: 'review' },
      // A card re-entering Review with its change request already open waits for a person.
      autoStart: true,
      autoStartWhen: { operator: 'AND', conditions: [{ field: 'item.pullRequest', operator: 'not_exists' }] },
      tools: ['factory_record_review_verdict'],
      // Self-review sends the card back to Building, or parks it in Intake at its round limit.
      // A maintainer's review request takes its open pull request to PR review.
      nextPhases: ['execute', 'intake', 'pr-review', 'done', 'canceled'],
    },
    'pr-review': {
      name: 'PR review',
      // A card's pull request is reviewed here by the independent reviewer, in its own
      // review seat on the pull request's branch. Kept apart from Review, the builder's
      // self-review of its own branch.
      kind: 'working',
      runner: { skill: 'factory-review', context: 'review' },
      tools: ['factory_record_review_verdict', 'factory_review_source'],
      // Merged, closed, or set aside in Intake. An issue card can go back to its builder for a
      // fix; a pull request's own card never reaches the builder's lanes (workPullRequestCardRejection).
      nextPhases: ['intake', 'planning', 'execute', 'done', 'canceled'],
    },
    done: {
      name: 'Done',
      kind: 'terminal',
      // A review request on a finished pull request reopens its review.
      nextPhases: ['pr-review'],
    },
    canceled: {
      name: 'Canceled',
      kind: 'terminal',
      // Revived into Intake; a pull request closed without merging and then reopened goes back to Review.
      nextPhases: ['intake', 'pr-review'],
    },
  },
});
