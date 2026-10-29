"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowUp, CheckCircle, Lightning, Phone, Question, X } from "@phosphor-icons/react";
import { LogoMark } from "@/components/brand";
import { Spinner, cx } from "@/components/ui";

// Landing-page assistant. Quote and callback flows are scripted and cost no AI calls;
// only free-typed questions go to /api/chat. Leads go to /api/leads.

type Msg = { id: number; from: "bot" | "user"; text: ReactNode; plain: string };
type Step = "idle" | "need" | "quantity" | "city" | "contact" | "done";
type Kind = "quote" | "callback";

const HINT_KEY = "bt_chat_hint_seen";
const MAX_AI_TURNS = 10;

const HOW_IT_WORKS =
  "You tell us what you buy. We find wholesalers in Delhi NCR, call them in Hindi and English, check every GSTIN, and turn each quote into one landed cost at your door. Then we negotiate and hand you the best two or three. Your first brief is free.";

let nextId = 1;
const bot = (text: string): Msg => ({ id: nextId++, from: "bot", text, plain: text });
const user = (text: string): Msg => ({ id: nextId++, from: "user", text, plain: text });

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => [bot("Namaste! I can get you a wholesale quote, explain how BhavTaav works, or connect you to a person.")]);
  const [step, setStep] = useState<Step>("idle");
  const [kind, setKind] = useState<Kind>("quote");
  const [lead, setLead] = useState({ need: "", quantity: "", city: "" });
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [aiTurns, setAiTurns] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  // One quiet nudge after 20 seconds, once per visitor.
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(HINT_KEY) === "1";
    } catch {}
    if (seen) return;
    const t = setTimeout(() => setHint(true), 20_000);
    return () => clearTimeout(t);
  }, []);

  const dismissHint = () => {
    setHint(false);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {}
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking, step]);

  useEffect(() => {
    if (!open) return;
    if (step !== "contact") inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    // Full-screen on phones: stop the page scrolling behind the panel.
    const phone = window.matchMedia("(max-width: 639px)").matches;
    if (phone) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      if (phone) document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggle() {
    dismissHint();
    setOpen((o) => !o);
  }

  function close() {
    setOpen(false);
    launcherRef.current?.focus();
  }

  const say = (...m: Msg[]) => setMsgs((x) => [...x, ...m]);

  function startQuote() {
    setKind("quote");
    setLead({ need: "", quantity: "", city: "" });
    say(user("Get a quote"), bot("What do you want to buy? For example: 250 ml printed paper cups."));
    setStep("need");
  }

  function startCallback() {
    setKind("callback");
    say(user("Talk to a person"), bot("Sure. Leave your name and WhatsApp number below and someone from the team will message you."));
    setStep("contact");
  }

  function howItWorks() {
    say(user("How does BhavTaav work?"), bot(HOW_IT_WORKS));
  }

  function cancelFlow() {
    say(bot("No problem. Ask me anything, or pick an option below."));
    setStep("idle");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");

    if (step === "need") {
      setLead((l) => ({ ...l, need: text }));
      say(user(text), bot("Roughly how much do you need each month?"));
      return setStep("quantity");
    }
    if (step === "quantity") {
      setLead((l) => ({ ...l, quantity: text }));
      say(user(text), bot("Which city should it be delivered to?"));
      return setStep("city");
    }
    if (step === "city") {
      setLead((l) => ({ ...l, city: text }));
      say(user(text), bot("Last step: where should we send your quote?"));
      return setStep("contact");
    }

    // Free text goes to the assistant.
    const mine = user(text);
    const history = [...msgs, mine];
    setMsgs(history);
    if (aiTurns >= MAX_AI_TURNS) {
      return say(bot("The quickest way from here is a person. Tap \"Talk to a person\" and we'll reply on WhatsApp."));
    }
    setAiTurns((n) => n + 1);
    setThinking(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.slice(-19).map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.plain.slice(0, 1000) })),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      say(bot(j.reply ?? j.error ?? "Something went wrong. Tap \"Talk to a person\" and we'll reply on WhatsApp."));
    } catch {
      say(bot("I couldn't reach the server. Check your connection, or tap \"Talk to a person\"."));
    } finally {
      setThinking(false);
    }
  }

  const inFlow = step === "need" || step === "quantity" || step === "city";
  const placeholder = step === "need" ? "What do you buy?" : step === "quantity" ? "e.g. 5,000 a month" : step === "city" ? "e.g. Gurugram" : "Ask about BhavTaav…";

  return (
    <>
      {/* Hint */}
      {hint && !open ? (
        <div className="fixed bottom-[92px] right-5 z-50 flex max-w-[260px] animate-rise items-start gap-2 rounded-2xl rounded-br-md bg-white py-3 pl-4 pr-2 text-[14px] text-ink shadow-[0_12px_40px_-12px_rgba(10,22,40,0.35)] ring-1 ring-line">
          <button type="button" onClick={toggle} className="text-left font-medium">
            Need a wholesale quote? <span className="text-marigold-deep">Ask us.</span>
          </button>
          <button type="button" onClick={dismissHint} aria-label="Dismiss" className="focus-ring -mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted hover:bg-paper hover:text-ink">
            <X className="h-3.5 w-3.5" weight="bold" />
          </button>
        </div>
      ) : null}

      {/* Launcher */}
      <button
        ref={launcherRef}
        type="button"
        onClick={toggle}
        aria-label={open ? "Close chat" : "Chat with BhavTaav"}
        aria-expanded={open}
        aria-controls="bt-chat"
        className={cx(
          "focus-ring group fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-ink shadow-[0_10px_30px_-6px_rgba(10,22,40,0.55)] ring-4 ring-marigold/25 transition hover:-translate-y-0.5 hover:ring-marigold/40",
          open && "max-sm:hidden",
        )}
      >
        <span className={cx("absolute transition duration-300", open ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100")}>
          <LogoMark className="h-7 w-7 translate-y-[1px]" />
        </span>
        <span className={cx("absolute text-white transition duration-300", open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0")}>
          <X className="h-6 w-6" weight="bold" />
        </span>
      </button>

      {/* Panel */}
      {open ? (
        <div
          id="bt-chat"
          role="dialog"
          aria-label="BhavTaav chat"
          className="fixed inset-0 z-50 flex animate-rise flex-col overflow-hidden bg-white sm:inset-auto sm:bottom-[92px] sm:right-5 sm:h-[min(620px,calc(100dvh-120px))] sm:w-[380px] sm:rounded-[22px] sm:shadow-[0_24px_70px_-20px_rgba(10,22,40,0.45)] sm:ring-1 sm:ring-line"
        >
          {/* Header */}
          <div className="relative overflow-hidden bg-ink px-5 py-4 text-white">
            <div className="grid-bg absolute inset-0 opacity-60" />
            <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-marigold/25 blur-3xl" />
            <div className="relative flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.08] ring-1 ring-white/10">
                <LogoMark className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[16px] font-bold leading-tight">
                  Bhav<span className="text-marigold">Taav</span> assistant
                </p>
                <p lang="hi" className="font-hindi text-[13px] leading-tight text-white/60">भाव-ताव हम करेंगे</p>
              </div>
              <button type="button" onClick={close} aria-label="Close chat" className="focus-ring grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" weight="bold" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-paper/70 px-4 py-4" aria-live="polite">
            {msgs.map((m) => (
              <div key={m.id} className={cx("flex", m.from === "user" ? "justify-end" : "justify-start")}>
                <p
                  className={cx(
                    "max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed",
                    m.from === "user" ? "rounded-br-md bg-ink text-white" : "rounded-bl-md bg-white text-ink ring-1 ring-line",
                  )}
                >
                  {m.text}
                </p>
              </div>
            ))}
            {thinking ? (
              <div className="flex justify-start" aria-label="Typing">
                <span className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3.5 ring-1 ring-line">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-muted" style={{ animationDelay: `${i * 0.18}s` }} />
                  ))}
                </span>
              </div>
            ) : null}
            {step === "contact" ? (
              <ContactCard
                kind={kind}
                lead={lead}
                transcript={msgs}
                onCancel={cancelFlow}
                onDone={(name, phone) => {
                  say(bot(`Thanks, ${name.split(" ")[0]}. We'll message you on WhatsApp at ${phone} during business hours, Monday to Saturday.`));
                  setStep("done");
                }}
              />
            ) : null}
          </div>

          {/* Quick actions */}
          {step === "idle" || step === "done" ? (
            <div className="flex flex-wrap gap-1.5 border-t border-line bg-white px-4 pt-3">
              {step === "idle" ? <Chip onClick={startQuote} icon={<Lightning weight="fill" className="h-3.5 w-3.5 text-marigold-deep" />}>Get a quote</Chip> : null}
              <Chip onClick={howItWorks} icon={<Question weight="bold" className="h-3.5 w-3.5" />}>How it works</Chip>
              {step === "idle" ? <Chip onClick={startCallback} icon={<Phone weight="bold" className="h-3.5 w-3.5" />}>Talk to a person</Chip> : null}
            </div>
          ) : null}

          {/* Input */}
          {step !== "contact" ? (
            <form onSubmit={submit} className={cx("bg-white px-4 pb-4 pt-3", !(step === "idle" || step === "done") && "border-t border-line")}>
              {inFlow ? (
                <button type="button" onClick={cancelFlow} className="mb-2 text-[12px] font-medium text-muted hover:text-ink">
                  Cancel quote
                </button>
              ) : null}
              <div className="flex items-center gap-2 rounded-xl border border-line bg-white py-1.5 pl-3.5 pr-1.5 transition focus-within:border-ink/40 focus-within:ring-2 focus-within:ring-marigold/40">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={500}
                  placeholder={placeholder}
                  aria-label="Message"
                  className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted/70"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || thinking}
                  aria-label="Send"
                  className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-marigold text-ink transition hover:bg-marigold-deep hover:text-white disabled:bg-paper disabled:text-muted"
                >
                  <ArrowUp className="h-4 w-4" weight="bold" />
                </button>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted">AI assistant. A person follows up on WhatsApp.</p>
            </form>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function Chip({ onClick, icon, children }: { onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-ink transition hover:border-ink/30 hover:bg-paper"
    >
      {icon}
      {children}
    </button>
  );
}

function ContactCard({
  kind,
  lead,
  transcript,
  onCancel,
  onDone,
}: {
  kind: Kind;
  lead: { need: string; quantity: string; city: string };
  transcript: Msg[];
  onCancel: () => void;
  onDone: (name: string, phone: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [need, setNeed] = useState(kind === "quote" ? lead.need : "");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) return setError("Please tick the box so we can message you on WhatsApp.");
    setBusy(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const utm = Object.fromEntries([...params].filter(([k]) => k.startsWith("utm_")));
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          name,
          phone,
          need: need.trim() || "Wants to talk to the team",
          quantity: kind === "quote" ? lead.quantity : null,
          city: kind === "quote" ? lead.city : null,
          consent,
          path: window.location.pathname,
          utm,
          transcript: transcript.slice(-40).map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.plain.slice(0, 1000) })),
          website: website || undefined,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Couldn't save that. Please try again.");
      const digits = phone.replace(/\D/g, "").slice(-10);
      onDone(name.trim(), `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls = "focus-ring h-10 w-full rounded-lg border border-line bg-white px-3 text-[14px] text-ink placeholder:text-muted/70 transition hover:border-ink/25";

  return (
    <form onSubmit={send} className="animate-rise space-y-3 rounded-2xl bg-white p-4 ring-1 ring-line">
      {kind === "quote" ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl bg-paper px-3 py-2.5 text-[13px]">
          <dt className="text-muted">Item</dt>
          <dd className="truncate font-medium">{lead.need}</dd>
          <dt className="text-muted">Monthly</dt>
          <dd className="truncate font-medium">{lead.quantity}</dd>
          <dt className="text-muted">City</dt>
          <dd className="truncate font-medium">{lead.city}</dd>
        </dl>
      ) : (
        <div>
          <label htmlFor="bt-need" className="mb-1 block text-[13px] font-medium">What's it about?</label>
          <input id="bt-need" value={need} onChange={(e) => setNeed(e.target.value)} maxLength={300} placeholder="e.g. Pricing for 3 items" className={inputCls} />
        </div>
      )}
      <div>
        <label htmlFor="bt-name" className="mb-1 block text-[13px] font-medium">Your name</label>
        <input id="bt-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" className={inputCls} />
      </div>
      <div>
        <label htmlFor="bt-phone" className="mb-1 block text-[13px] font-medium">WhatsApp number</label>
        <div className="flex">
          <span className="grid place-items-center rounded-l-lg border border-r-0 border-line bg-paper px-3 text-[14px] text-muted">+91</span>
          <input
            id="bt-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            inputMode="tel"
            autoComplete="tel-national"
            maxLength={14}
            placeholder="98XXX XXXXX"
            className={cx(inputCls, "rounded-l-none")}
          />
        </div>
      </div>
      {/* Honeypot: hidden from people and screen readers. */}
      <input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" name="website" />
      <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-snug text-ink-soft">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#0A1628]" />
        <span>BhavTaav can message me on WhatsApp about this request. No spam, and my number isn't shared with suppliers.</span>
      </label>
      {error ? <p className="rounded-lg bg-coral-soft px-3 py-2 text-[13px] text-coral">{error}</p> : null}
      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={busy} className="focus-ring inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-ink text-[14px] font-semibold text-white transition hover:bg-ink-3 disabled:opacity-60">
          {busy ? <Spinner /> : <CheckCircle weight="fill" className="h-4 w-4 text-marigold" />}
          {kind === "quote" ? "Send my quote request" : "Ask them to message me"}
        </button>
        <button type="button" onClick={onCancel} className="text-[13px] font-medium text-muted hover:text-ink">Cancel</button>
      </div>
    </form>
  );
}
