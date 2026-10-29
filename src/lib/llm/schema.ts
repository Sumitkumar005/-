import { z } from "zod";

const KEEP = new Set(["type", "properties", "required", "additionalProperties", "items", "enum", "anyOf", "description", "const"]);

/**
 * Zod -> JSON Schema in the shape Groq strict mode accepts: every object closed and every key required
 * (optional values are modelled as nullable), unsupported keywords like min/max stripped.
 */
export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const raw = z.toJSONSchema(schema, { io: "output", unrepresentable: "any" }) as Record<string, unknown>;
  return clean(raw) as Record<string, unknown>;
}

function clean(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(clean);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (!KEEP.has(k)) continue;
    if (k === "properties") {
      out.properties = Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([pk, pv]) => [pk, clean(pv)]));
    } else out[k] = clean(v);
  }
  if (out.type === "object" || out.properties) {
    out.type = "object";
    out.properties = out.properties ?? {};
    out.required = Object.keys(out.properties as object);
    out.additionalProperties = false;
  }
  return out;
}
