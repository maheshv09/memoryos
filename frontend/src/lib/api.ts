const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:8000";

export function apiUrl(path: string): string {
  return `${API_BASE.replace(/\/$/, "")}${path.startsWith("/") ? path : "/" + path}`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function checkHealth(): Promise<{ status: string; stats?: { total: number; personal: number; enterprise: number } }> {
  return apiFetch("/health");
}

export interface StreamCallbacks {
  onRetrieval?: (payload: any) => void;
  onToken?: (text: string) => void;
  onStage?: (payload: any) => void;
  onDone?: (payload: any) => void;
  onError?: (err: Error) => void;
}

export async function streamSSE(path: string, body: unknown, cb: StreamCallbacks, signal?: AbortSignal): Promise<void> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (const part of parts) {
        const lines = part.split("\n");
        let event = "message";
        const dataLines: string[] = [];
        for (const line of lines) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
        }
        if (!dataLines.length) continue;
        const data = JSON.parse(dataLines.join("\n"));
        if (event === "retrieval") cb.onRetrieval?.(data);
        else if (event === "token") cb.onToken?.(data.text ?? "");
        else if (event === "stage") cb.onStage?.(data);
        else if (event === "done") cb.onDone?.(data);
      }
    }
  } catch (err) {
    cb.onError?.(err as Error);
    throw err;
  }
}
