"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Mic, Sparkles } from "lucide-react";
import { Alert, Button, Card, Spinner, Textarea, cx } from "@/components/ui";

const EXAMPLES = [
  "Need 5000 printed 250ml single wall paper cups, 2 colour logo, every month. Paying Rs 1.6 today. Deliver to 122002.",
  "3000 kraft paper biryani boxes 750 ml with 1 colour print, need in 2 weeks",
  "10,000 stand-up zip pouches for 250 g coffee, metallised, digital print",
  "500 metres cotton cambric fabric, printed, 44 inch width, for kurtis",
  "5000 kraft carry bags 10x12 inch with twisted handle, 1 colour logo",
];

type SpeechRec = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null };

export function NewBrief() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    setCanSpeak(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition));
  }, []);

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Rec = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Rec) return;
    const rec = new Rec();
    rec.lang = "hi-IN"; // understands Hindi, English and the mix
    rec.interimResults = false;
    rec.continuous = true;
    const base = text ? text.trim() + " " : "";
    rec.onresult = (e) => {
      const said = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setText(base + said);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/briefs/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(j.error ?? "Could not read that");
    }
    router.push(`/app/briefs/${j.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl animate-rise">
      <p className="text-sm font-semibold uppercase tracking-wider text-marigold-deep">New brief</p>
      <h1 className="mt-2 text-3xl font-bold">What do you need to buy?</h1>
      <p className="mt-2 text-muted">Write it the way you would tell a supplier on WhatsApp. Hindi, English or both. We will turn it into a spec and ask about anything missing.</p>

      <Card className="mt-8 p-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          maxLength={4000}
          placeholder="e.g. 5000 printed paper cups 250 ml, 2 colour logo, every month, deliver to 122002"
          className="border-0 text-base shadow-none hover:border-0"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim().length >= 8) submit();
          }}
        />
        <div className="flex items-center justify-between gap-3 border-t border-line px-2 pt-2">
          {canSpeak ? (
            <button type="button" onClick={toggleMic} className={cx("focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition", listening ? "bg-coral-soft text-coral" : "text-muted hover:bg-paper")}>
              <Mic className={cx("h-4 w-4", listening && "animate-pulseDot")} /> {listening ? "Listening... tap to stop" : "Speak instead"}
            </button>
          ) : (
            <span />
          )}
          <Button variant="primary" onClick={submit} disabled={busy || text.trim().length < 8}>
            {busy ? <Spinner /> : <Sparkles className="h-4 w-4" />} {busy ? "Reading your brief" : "Create brief"}
            {!busy ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
        </div>
      </Card>
      {error ? <div className="mt-4"><Alert tone="bad">{error}</Alert></div> : null}

      <p className="mt-10 text-sm font-medium text-muted">Try one of these</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button key={e} type="button" onClick={() => setText(e)} className="focus-ring rounded-full border border-line bg-white px-3.5 py-1.5 text-left text-sm text-ink-soft transition hover:border-ink/30 hover:text-ink">
            {e.length > 70 ? e.slice(0, 68) + "..." : e}
          </button>
        ))}
      </div>
    </div>
  );
}
