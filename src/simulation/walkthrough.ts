export const WALKTHROUGH_STAGES = ['Emergency request', 'Smart dispatch', 'Green corridor', 'Ambulance journey', 'Hospital handoff', 'Results'] as const;

export function walkthroughTimeline(missionSeconds: number) {
  // Presentation stages are paced for reading; journey duration comes from the route.
  const arrival = 13 + Math.max(0, missionSeconds) / 30;
  return [0, 4, 9, 13, arrival, arrival + 5];
}

export function walkthroughStage(seconds: number, boundaries: number[]) {
  let stage = 0;
  boundaries.forEach((boundary, index) => { if (seconds >= boundary) stage = index; });
  return stage;
}
