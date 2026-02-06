import logging
import os

import httpx

logger = logging.getLogger(__name__)


class InferenceClient:
    def __init__(self):
        self.base_url = os.getenv("INFERENCE_API_URL")
        if not self.base_url:
            # 開発環境（Docker）でのデフォルト値を設定するか、エラーを投げる
            self.base_url = "http://inference:8000"

    async def get_prediction(self, prompt: str):
        """FastAPI (Gemini) 推論エンドポイントを呼び出す"""
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(f"{self.base_url}/v1/predict", json={"prompt": prompt})
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"Inference API error: {e.response.status_code} - {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"Inference API connection error: {e}")
                raise
