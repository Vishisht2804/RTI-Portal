const API_URL = "http://localhost:8000/api/v1";
console.log("USING API URL:", JSON.stringify(API_URL));

export type RtiDetail = {
  id: number;
  registration_number: string | null;
  authority_name: string;
  status: string;
  final_request: string;
  documents: { id: number; filename: string; size: number }[];
  status_events: { id: number; title: string; description: string; status: string }[];
  next_action: { title: string; description: string; action?: string; action_url?: string };
};

export const demoReadyToFile = {
  draft_id: 101,
  authority_id: 12,
  authority_name: "Ministry of Health and Family Welfare",
  jurisdiction: "central",
  category: "health",
  request_text:
    "Please provide the sanctioned budget, expenditure incurred, current completion status, and completion date for government hospital infrastructure projects funded by the Ministry of Health and Family Welfare during 2025.",
  original_query: "How much did Ministry of Health spend on government hospitals in 2025?",
  validation_status: "ready",
  quality_checks: {
    authority: true,
    jurisdiction: true,
    information_request: true,
    specificity: true,
    character_limit: true,
  },
};

export async function api(path: string, options: { method?: string; body?: unknown } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message ?? "API request failed");
  }
  return data;
}

