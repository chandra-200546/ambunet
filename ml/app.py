from pathlib import Path
from time import perf_counter
import json
import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title='AmbuNet Synthetic Traffic Prediction')
MODEL_PATH = Path(__file__).with_name('model.joblib')
model = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None


class Observation(BaseModel):
    free_flow_sec: float = Field(gt=0, le=600)
    congestion: float = Field(ge=1, le=1.8)
    traffic_level: int = Field(ge=0, le=2)
    rain: int = Field(ge=0, le=1)
    vehicles: int = Field(ge=0, le=1000)


@app.get('/health')
def health():
    return {'model_loaded': model is not None, 'data_source': 'synthetic'}


@app.post('/api/traffic/predict')
def predict(observation: Observation):
    if model is None:
        raise HTTPException(503, 'Run python ml/train.py first')
    started = perf_counter()
    value = max(observation.free_flow_sec, float(model.predict([list(observation.model_dump().values())])[0]))
    return {'travel_sec': value, 'delay_sec': value - observation.free_flow_sec, 'category': 'high' if value / observation.free_flow_sec > 2 else 'medium' if value / observation.free_flow_sec > 1.3 else 'low', 'latency_ms': (perf_counter() - started) * 1000, 'data_source': 'synthetic'}


@app.get('/api/traffic/metrics')
def metrics():
    return json.loads(Path(__file__).with_name('metrics.json').read_text())
