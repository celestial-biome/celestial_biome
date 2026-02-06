import { fetchWithAuth } from './api-client';

export interface InferenceResponse {
  content: string;
  context_used?: string;
}

export const predictCelestialInference = async (prompt: string): Promise<InferenceResponse> => {
  const response = await fetchWithAuth('/api/v1/inference/predict/', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });

  // response.json() を実行して中身を返す
  return await response.json();
};
