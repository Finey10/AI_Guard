import { ReleaseAnalysisRequest, ReleaseAnalysisResponse } from './types';
import { computeLocalMockResponse } from './mockData';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8000';

export interface ApiResponseWrapper {
  data: ReleaseAnalysisResponse;
  isMock: boolean;
  status: number;
  message?: string;
  error?: string;
}

/**
 * Checks if the backend server is reachable.
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Sends a release analysis request to the backend API.
 * If backend is unavailable or returns an error, cleanly falls back
 * to deterministic mock computation while flagging `isMock = true`.
 */
export async function analyzeRelease(
  request: ReleaseAnalysisRequest
): Promise<ApiResponseWrapper> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`${API_BASE_URL}/api/analyze-release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Backend returned HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();

    // Validate expected fields
    if (
      typeof json.risk_score !== 'number' ||
      !json.recommendation ||
      typeof json.remaining_budget_percent !== 'number'
    ) {
      throw new Error('Backend response did not conform to the expected schema.');
    }

    return {
      data: json,
      isMock: false,
      status: response.status,
      message: 'Analysis returned from live backend engine.'
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Network failure or timeout';
    
    // Fall back to mathematically calibrated mock computation
    const fallbackData = computeLocalMockResponse(request);

    return {
      data: fallbackData,
      isMock: true,
      status: 200,
      error: `Backend unreachable at ${API_BASE_URL} (${errorMessage}). Running in offline demo/mock mode.`,
      message: 'Displaying deterministic mock analysis.'
    };
  }
}
