// Central config. Read lazily so the landing page builds without secrets.

function str(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function bool(name: string, fallback: boolean): boolean {
  const v = str(name);
  if (v === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function int(name: string, fallback: number): number {
  const v = Number(str(name));
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

export const env = {
  get supabaseUrl() {
    return str("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return str("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? str("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  },
  get supabaseServiceKey() {
    return str("SUPABASE_SERVICE_ROLE_KEY") ?? str("SUPABASE_SECRET_KEY");
  },
  get groqApiKey() {
    return str("GROQ_API_KEY");
  },
  /** "groq" when a key is present, otherwise the offline "mock" provider. */
  get llmProvider(): "groq" | "mock" {
    const forced = str("LLM_PROVIDER");
    if (forced === "mock") return "mock";
    return this.groqApiKey ? "groq" : "mock";
  },
  get groqModel() {
    return str("GROQ_MODEL") ?? "openai/gpt-oss-120b";
  },
  get groqFastModel() {
    return str("GROQ_FAST_MODEL") ?? "openai/gpt-oss-20b";
  },
  get groqFallbackModel() {
    return str("GROQ_FALLBACK_MODEL") ?? "llama-3.3-70b-versatile";
  },
  get groqRpm() {
    return int("GROQ_RPM", 28);
  },
  get voiceProvider(): "simulated" | "bolna" {
    return str("VOICE_PROVIDER") === "bolna" ? "bolna" : "simulated";
  },
  get bolna() {
    return {
      apiKey: str("BOLNA_API_KEY"),
      agentId: str("BOLNA_AGENT_ID"),
      fromNumber: str("BOLNA_FROM_NUMBER"),
    };
  },
  get voiceWebhookSecret() {
    return str("VOICE_WEBHOOK_SECRET");
  },
  /** Real calls always respect calling hours. Simulated calls skip them unless asked. */
  get respectCallingHours() {
    return this.voiceProvider !== "simulated" || bool("SIMULATION_RESPECT_HOURS", false);
  },
  get simCallDelayMs() {
    const v = Number(str("SIM_CALL_DELAY_MS"));
    return Number.isFinite(v) && v >= 0 && str("SIM_CALL_DELAY_MS") !== undefined ? v : 1200;
  },
  get maxCallAttempts() {
    return int("MAX_CALL_ATTEMPTS", 2);
  },
  get opsReviewShortlist() {
    return bool("OPS_REVIEW_SHORTLIST", false);
  },
  get googlePlacesKey() {
    return str("GOOGLE_PLACES_API_KEY");
  },
  get workerConcurrency() {
    return int("WORKER_CONCURRENCY", 2);
  },
  get appUrl() {
    return str("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";
  },
};

export function requireEnv<T>(value: T | undefined, name: string): T {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`);
  }
  return value;
}
