import { NextRequest } from 'next/server';

/**
 * Create a NextRequest for testing API routes
 */
export function createRequest(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  },
): NextRequest {
  const baseUrl = 'http://localhost:3000';
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  const init: RequestInit = {
    method: options?.method ?? 'GET',
    headers: options?.headers ?? {},
  };
  if (options?.body) {
    init.body = JSON.stringify(options.body);
    (init.headers as Record<string, string>)['content-type'] = 'application/json';
  }
  return new NextRequest(fullUrl, init);
}

/**
 * Parse JSON response from NextResponse
 */
export async function parseResponse(response: Response) {
  return response.json();
}
