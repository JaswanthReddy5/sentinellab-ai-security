// Minimal LLM provider abstraction.
//
// SentinelLab's core engine (test generation, mutation, evaluation) is fully
// deterministic and does NOT require an LLM to function — this is a hard
// product requirement so the deployed demo never breaks without API keys.
//
// When a provider key IS configured, it can be used to add natural-language
// variety to generated attack/benign prompts. Every call is wrapped so a
// failure or missing key transparently falls back to `null`, and callers
// always have a deterministic local fallback ready.

export interface LLMProvider {
  name: "openai" | "anthropic" | "local";
  isConfigured: boolean;
  complete(prompt: string, opts?: { maxTokens?: number }): Promise<string | null>;
}

class OpenAIProvider implements LLMProvider {
  name = "openai" as const;
  private apiKey = process.env.OPENAI_API_KEY;
  private model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  get isConfigured() {
    return Boolean(this.apiKey);
  }
  async complete(prompt: string, opts?: { maxTokens?: number }): Promise<string | null> {
    if (!this.apiKey) return null;
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: opts?.maxTokens ?? 300,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.choices?.[0]?.message?.content ?? null;
    } catch {
      return null;
    }
  }
}

class AnthropicProvider implements LLMProvider {
  name = "anthropic" as const;
  private apiKey = process.env.ANTHROPIC_API_KEY;
  private model = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";
  get isConfigured() {
    return Boolean(this.apiKey);
  }
  async complete(prompt: string, opts?: { maxTokens?: number }): Promise<string | null> {
    if (!this.apiKey) return null;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: opts?.maxTokens ?? 300,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.content?.[0]?.text ?? null;
    } catch {
      return null;
    }
  }
}

class LocalProvider implements LLMProvider {
  name = "local" as const;
  isConfigured = true;
  async complete(): Promise<string | null> {
    return null; // callers use deterministic templates
  }
}

export function getLLMProvider(): LLMProvider {
  if (process.env.ANTHROPIC_API_KEY) return new AnthropicProvider();
  if (process.env.OPENAI_API_KEY) return new OpenAIProvider();
  return new LocalProvider();
}

export function llmStatus() {
  const provider = getLLMProvider();
  return {
    provider: provider.name,
    configured: provider.isConfigured && provider.name !== "local",
    mode: provider.name === "local" ? "deterministic-local" : "llm-assisted",
  };
}
