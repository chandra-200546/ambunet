"""Synthetic traffic experiment. Never interpret these metrics as city performance."""
import argparse
import csv
import json
from pathlib import Path
from time import perf_counter
import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import make_pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error

ROOT = Path(__file__).resolve().parents[1]
FEATURES = ['free_flow_sec', 'congestion', 'traffic_level', 'rain', 'vehicles']


def generate(path):
    rng = np.random.default_rng(42)
    with path.open('w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(['timestamp', *FEATURES, 'travel_sec'])
        for timestamp in range(2400):
            free_flow = rng.uniform(20, 600)
            congestion = rng.uniform(1, 1.8)
            level = int(rng.integers(0, 3))
            rain = int(rng.integers(0, 2))
            vehicles = int(rng.integers(0, 1001))
            factor = [0.88, 1.08, 1.32][level] * (1.16 if rain else 1) * (1 + min(.32, max(0, vehicles - 120) / 1000))
            target = free_flow * max(1, congestion * factor * rng.uniform(.85, 1.15))
            writer.writerow([timestamp, free_flow, congestion, level, rain, vehicles, target])


def train(path):
    with path.open() as file:
        rows = sorted(csv.DictReader(file), key=lambda row: float(row['timestamp']))
    rows = [r for r in rows if r.get('travel_sec') and float(r['travel_sec']) > 0]
    if len(rows) < 100:
        raise ValueError('At least 100 chronological observations required')
    x = np.array([[float(r[c]) if r.get(c) else np.nan for c in FEATURES] for r in rows])
    y = np.array([float(r['travel_sec']) for r in rows])
    if not np.isfinite(y).all() or np.isinf(x).any():
        raise ValueError('Nonfinite observations')
    n_train, n_val = int(len(rows) * .6), int(len(rows) * .8)
    best = None
    for depth in [6, 9]:
        model = make_pipeline(SimpleImputer(strategy='median'), RandomForestRegressor(n_estimators=24, max_depth=depth, min_samples_leaf=4, random_state=42, n_jobs=1))
        model.fit(x[:n_train], y[:n_train])
        error = mean_absolute_error(y[n_train:n_val], model.predict(x[n_train:n_val]))
        if best is None or error < best[0]:
            best = (error, model)
    model = best[1]
    started = perf_counter()
    predictions = model.predict(x[n_val:])
    latency = (perf_counter() - started) * 1000 / len(predictions)
    metrics = {'source': 'synthetic', 'rows': len(rows), 'split': 'chronological 60/20/20', 'validation_mae_sec': best[0], 'test_mae_sec': mean_absolute_error(y[n_val:], predictions), 'test_rmse_sec': float(np.sqrt(mean_squared_error(y[n_val:], predictions))), 'test_mape_pct': float(np.mean(np.abs((y[n_val:] - predictions) / y[n_val:])) * 100), 'batch_latency_ms_per_row': latency, 'seed': 42}
    trees = []
    for estimator in model[-1].estimators_:
        tree = estimator.tree_
        trees.append({'left': tree.children_left.tolist(), 'right': tree.children_right.tolist(), 'feature': tree.feature.tolist(), 'threshold': tree.threshold.tolist(), 'value': tree.value[:, 0, 0].tolist()})
    payload = {'features': FEATURES, 'medians': model[0].statistics_.tolist(), 'metrics': metrics, 'trees': trees}
    output = ROOT / 'src/simulation/trafficModel.json'
    output.write_text(json.dumps(payload, separators=(',', ':')))
    joblib.dump(model, ROOT / 'ml/model.joblib')
    (ROOT / 'ml/metrics.json').write_text(json.dumps(metrics, indent=2))
    print(json.dumps(metrics, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--csv', type=Path)
    args = parser.parse_args()
    path = args.csv or ROOT / 'ml/synthetic-traffic.csv'
    if args.csv is None:
        generate(path)
    train(path)
