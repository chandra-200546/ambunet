import model from './trafficModel.json';

export const trafficModelMetrics = model.metrics;
export function predictTravelSeconds(freeFlow: number, congestion: number, traffic: string, rain: boolean, vehicles: number) {
  const features = [freeFlow, congestion, ['low', 'medium', 'high'].indexOf(traffic), Number(rain), vehicles];
  const prediction = model.trees.reduce((sum, tree) => {
    let node = 0;
    while (tree.left[node] !== -1) node = Math.fround(features[tree.feature[node]]) <= tree.threshold[node] ? tree.left[node] : tree.right[node];
    return sum + tree.value[node];
  }, 0) / model.trees.length;
  return Math.max(freeFlow, prediction);
}
