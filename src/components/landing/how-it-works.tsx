import { ArrowRight, Check, Microphone, Prohibit, WhatsappLogo, X } from "@phosphor-icons/react/dist/ssr";
import { cx } from "@/components/ui";

function Card({ n, title, body, className, children }: { n: string; title: string; body: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cx("group flex flex-col overflow-hidden rounded-[20px] border border-line bg-white transition duration-300 hover:-translate-y-0.5 hover:shadow-lift", className)}>
      <div className="relative h-[200px] overflow-hidden border-b border-line bg-[radial-gradient(circle_at_1px_1px,rgba(10,22,40,0.07)_1px,transparent_0)] [background-size:16px_16px]">{children}</div>
      <div className="p-5">
        <p className="font-mono text-[11px] font-medium text-marigold-deep">{n}</p>
        <h3 className="mt-1 text-[17px] font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  );
}

const chip = "rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-ink shadow-sm";

export function HowItWorks() {
  return (
    <div className="grid gap-4 md:grid-cols-6">
      <Card n="01" title="Brief" body="Type or speak it like a WhatsApp to a supplier. We turn it into a spec every supplier quotes on." className="md:col-span-3">
        <div className="absolute inset-0 flex items-center gap-4 px-6">
          <div className="max-w-[46%] rounded-2xl rounded-bl-md bg-[#DCF8C6] px-3.5 py-2.5 text-[12.5px] leading-snug text-ink shadow-sm">
            bhaiya 5000 printed cups chahiye 250ml, har mahine, logo 2 colour
            <span className="mt-1 flex items-center gap-1 text-[10px] text-ink/50">
              <Microphone weight="fill" className="h-3 w-3" /> voice note · 0:07
            </span>
          </div>
          <ArrowRight weight="bold" className="h-5 w-5 shrink-0 text-marigold-deep" />
          <div className="flex flex-wrap gap-1.5">
            {["Paper cup", "250 ml", "Single wall", "2-colour print", "5,000 / month", "Deliver 122002"].map((c) => (
              <span key={c} className={chip}>{c}</span>
            ))}
          </div>
        </div>
      </Card>

      <Card n="02" title="Scout" body="Wholesalers near your pincode from our network, maps and the open web. Closest and most reliable first." className="md:col-span-3">
        <div className="absolute inset-0 grid place-items-center">
          <div className="relative h-[240px] w-[240px]">
            {[240, 170, 100].map((d) => (
              <span key={d} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink/10" style={{ width: d, height: d }} />
            ))}
            <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-4 ring-ink/10" />
            <span className="absolute left-1/2 top-1/2 mt-3 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold">You · 122002</span>
            {[
              { x: 22, y: 30, l: "Okhla · 24 km" },
              { x: 74, y: 24, l: "Bawana · 38 km" },
              { x: 80, y: 66, l: "Noida · 31 km" },
              { x: 18, y: 72, l: "Manesar · 22 km" },
            ].map((p) => (
              <span key={p.l} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                <span className="block h-2.5 w-2.5 rounded-full bg-marigold ring-4 ring-marigold/25" />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium shadow-sm">{p.l}</span>
              </span>
            ))}
          </div>
        </div>
      </Card>

      <Card n="03" title="Vet" body="GSTIN format, checksum and state on every supplier, plus how they behaved with past buyers." className="md:col-span-2">
        <div className="absolute inset-0 flex flex-col justify-center gap-2.5 px-5">
          <div className="rounded-xl border border-line bg-white p-3 shadow-sm">
            <p className="font-mono text-[11px] tracking-wide">07CAJCC1037V1Z1</p>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-mint-deep">
              {["Checksum", "State: Delhi", "Manufacturer"].map((c) => (
                <span key={c} className="flex items-center gap-1"><Check weight="bold" className="h-3 w-3" />{c}</span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-coral/30 bg-white p-3 shadow-sm">
            <p className="font-mono text-[11px] tracking-wide text-ink/50 line-through">06BHXCK1259R1ZA</p>
            <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-coral"><Prohibit weight="bold" className="h-3 w-3" /> Checksum fails. Blocked before any call.</p>
          </div>
        </div>
      </Card>

      <Card n="04" title="Call" body="Our AI agent calls each supplier in Hinglish and asks the same eight questions. It says it is an AI first." className="md:col-span-2">
        <div className="absolute inset-0 flex flex-col justify-center gap-2 px-5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 items-end gap-[3px]" aria-hidden>
              {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.45, 0.75, 0.55, 0.95, 0.4].map((h, i) => (
                <span key={i} className="w-[3px] origin-bottom animate-wave rounded-full bg-ink" style={{ height: `${h * 100}%`, animationDelay: `${i * 70}ms` }} />
              ))}
            </span>
            <span className="text-[11px] font-medium text-muted">Hinglish · 1:52</span>
          </div>
          <p className="max-w-[88%] rounded-2xl rounded-bl-md bg-ink px-3 py-2 text-[12px] leading-snug text-white">Main AI assistant hoon, call record ho rahi hai. Rate kya hoga?</p>
          <p className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-marigold-soft px-3 py-2 text-[12px] leading-snug">₹1.06 per piece, GST alag. 7 din mein delivery.</p>
        </div>
      </Card>

      <Card n="05" title="Compare" body="Per kg, per thousand, GST extra, to-pay freight. Every quote becomes one landed cost at your door." className="md:col-span-2">
        <div className="absolute inset-0 flex flex-col justify-center gap-2.5 px-5">
          {[
            { raw: "₹990 / 1000 + GST", v: 1.36, w: 72, hi: false },
            { raw: "₹1.14 incl. GST", v: 1.45, w: 77, hi: true },
            { raw: "₹182 / kg", v: 1.53, w: 81, hi: false },
            { raw: "₹1.19 + freight", v: 1.86, w: 98, hi: false },
          ].map((r) => (
            <div key={r.raw}>
              <div className="flex justify-between text-[10.5px]">
                <span className="font-mono text-muted">{r.raw}</span>
                <span className="tabular font-semibold"><span className="landed">₹{r.v.toFixed(2)}</span></span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-line">
                <div className={cx("h-full rounded-full", r.hi ? "bg-mint" : "bg-ink/70")} style={{ width: `${r.w}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card n="06" title="Negotiate" body="We go back to the best three with a real competing price. Never invented, never named, never more than 15% off." className="md:col-span-3">
        <div className="absolute inset-0 flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-wide text-muted">First quote</p>
            <p className="tabular font-display text-4xl font-semibold text-ink/35 line-through decoration-coral/70 decoration-2">₹1.54</p>
          </div>
          <ArrowRight weight="bold" className="h-6 w-6 text-marigold-deep" />
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-wide text-muted">After one call</p>
            <p className="tabular font-display text-5xl font-semibold"><span className="landed">₹1.45</span></p>
          </div>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-[11px] font-medium shadow-sm ring-1 ring-line">−5.8% · cited a verified competing quote</span>
        </div>
      </Card>

      <Card n="07" title="Shortlist" body="Two or three suppliers, terms side by side with reasons. Pick one and get their number and a ready WhatsApp." className="md:col-span-3">
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div className="w-full max-w-[340px] space-y-1.5 py-4">
            {[
              { n: "Gurgaon Cup House", p: "₹1.45", s: "Trust 92 · 5 days", best: true },
              { n: "Okhla Cupcraft", p: "₹1.53", s: "Trust 88 · 7 days" },
              { n: "Chawri Bazar Traders", p: "₹1.78", s: "Trust 83 · 3 days" },
            ].map((r) => (
              <div key={r.n} className={cx("flex items-center justify-between rounded-xl border bg-white px-3 py-2 shadow-sm", r.best ? "border-ink" : "border-line")}>
                <div>
                  <p className="text-[12.5px] font-semibold">{r.n}</p>
                  <p className="text-[10.5px] text-muted">{r.s}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular font-display text-[15px] font-semibold"><span className="landed">{r.p}</span></span>
                  {r.best ? (
                    <span className="flex items-center gap-1 rounded-lg bg-[#25D366] px-2 py-1 text-[10px] font-semibold text-white">
                      <WhatsappLogo weight="fill" className="h-3 w-3" /> Chat
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

export function BeforeAfter() {
  const mess = [
    { k: "Missed call", t: "Unknown number (17)", r: "-rotate-2" },
    { k: "WhatsApp", t: "Sir rate 990 per thousand, GST extra, freight to-pay", r: "rotate-1" },
    { k: "WhatsApp", t: "Madam sample bhej du? 50% advance pehle", r: "-rotate-1" },
    { k: "Missed call", t: "+91 98xxx xx310 (6)", r: "rotate-2" },
    { k: "WhatsApp", t: "Best rate ₹182/kg. Kitne kg chahiye?", r: "-rotate-1" },
  ];
  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
      <div className="relative overflow-hidden rounded-[22px] border border-line bg-paper p-6">
        <p className="text-sm font-semibold text-muted">Buying on a lead marketplace today</p>
        <div className="mt-5 space-y-2">
          {mess.map((m, i) => (
            <div key={i} className={cx("flex items-start gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5 shadow-sm", m.r)}>
              <span className={cx("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full", m.k === "WhatsApp" ? "bg-[#25D366]/15 text-[#128C7E]" : "bg-coral-soft text-coral")}>
                {m.k === "WhatsApp" ? <WhatsappLogo weight="fill" className="h-3.5 w-3.5" /> : <X weight="bold" className="h-3 w-3" />}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-muted">{m.k}</p>
                <p className="truncate text-[13px]">{m.t}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-[12px] font-medium text-ink-soft">
          {["Weeks of calls", "Quotes you can't compare", "No idea who's real"].map((c) => (
            <span key={c} className="rounded-full bg-white px-3 py-1 ring-1 ring-line">{c}</span>
          ))}
        </div>
      </div>

      <div className="hidden items-center lg:flex">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-marigold text-ink shadow-lift">
          <ArrowRight weight="bold" className="h-5 w-5" />
        </span>
      </div>

      <div className="relative overflow-hidden rounded-[22px] bg-ink p-6 text-white">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-marigold/20 blur-3xl" />
        <p className="relative text-sm font-semibold text-white/60">With BhavTaav</p>
        <div className="relative mt-5 rounded-2xl bg-white p-4 text-ink shadow-2xl">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">Shortlist ready · 250 ml cups</p>
            <span className="rounded-full bg-mint-soft px-2 py-0.5 text-[11px] font-semibold text-mint-deep">Saves ₹750 / order</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["₹1.45", "Gurgaon Cup House", true],
              ["₹1.53", "Okhla Cupcraft", false],
              ["₹1.78", "Chawri Bazar", false],
            ].map(([p, n, b]) => (
              <div key={n as string} className={cx("rounded-xl border p-2.5", b ? "border-ink bg-paper" : "border-line")}>
                <p className="tabular font-display text-lg font-semibold"><span className="landed">{p}</span></p>
                <p className="truncate text-[10.5px] text-muted">{n}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted">Landed per cup, GST and delivery included. 9 suppliers called, 1 blocked, 3 negotiated.</p>
        </div>
        <ol className="relative mt-5 space-y-2.5 border-l border-white/10 pl-4 text-[12.5px] text-white/70">
          {[
            ["Brief sent on WhatsApp", "10:02"],
            ["9 suppliers called, 1 blocked on GST", "10:04 to 11:30"],
            ["3 negotiated, best came down ₹0.09 a cup", "11:45"],
            ["Shortlist on your phone", "12:10"],
          ].map(([t, at]) => (
            <li key={t} className="relative flex justify-between gap-3">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-marigold" />
              <span>{t}</span>
              <span className="tabular shrink-0 text-white/40">{at}</span>
            </li>
          ))}
        </ol>
        <div className="relative mt-6 flex flex-wrap gap-2 text-[12px] font-medium">
          {["One brief, under 2 minutes", "Zero calls you make", "One number to compare"].map((c) => (
            <span key={c} className="rounded-full bg-white/10 px-3 py-1 text-white/85">{c}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
