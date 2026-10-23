import { describe, expect, it } from 'vitest';
import { walkthroughStage, walkthroughTimeline } from './walkthrough';

describe('guided demo progression', () => {
  it('moves through request, dispatch, routing, journey, handoff and results', () => {
    const timeline = walkthroughTimeline(600);
    expect(timeline).toEqual([0, 4, 9, 13, 33, 38]);
    timeline.forEach((value, index) => expect(walkthroughStage(value, timeline)).toBe(index));
    expect(walkthroughStage(32.99, timeline)).toBe(3);
  });
  it('uses route duration to schedule hospital arrival', () => {
    expect(walkthroughTimeline(1200)[4] - walkthroughTimeline(600)[4]).toBe(20);
  });
});
