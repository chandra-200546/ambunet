import unittest
from fastapi.testclient import TestClient
from ml.app import app


class PredictionTests(unittest.TestCase):
    def test_inference(self):
        response = TestClient(app).post('/api/traffic/predict', json={'free_flow_sec': 120, 'congestion': 1.4, 'traffic_level': 2, 'rain': 1, 'vehicles': 260})
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.json()['travel_sec'], 120)
        self.assertEqual(response.json()['data_source'], 'synthetic')

    def test_validation(self):
        self.assertEqual(TestClient(app).post('/api/traffic/predict', json={'free_flow_sec': -1}).status_code, 422)
