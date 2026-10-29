import { ArrowRight, BadgeCheck, Ban, Check, Clock, FileText, Handshake, IndianRupee, Languages, ListChecks, Lock, Phone, PhoneOff, RefreshCw, Scale, Search, ShieldCheck, TrendingDown, X } from "lucide-react";
import { Logo } from "@/components/brand";
import { Badge, ButtonLink, cx } from "@/components/ui";

const STEPS = [
  { icon: FileText, title: "Brief", body: "Type or speak what you need, in Hindi or English. We turn it into a spec suppliers can quote on." },
  { icon: Search, title: "Scout", body: "We pick wholesalers near you from our network, the open web and maps, closest and most reliable first." },
  { icon: ShieldCheck, title: "Vet", body: "GSTIN checksum and state, filing record, reviews and how they behaved with past buyers." },
  { icon: Phone, title: "Call", body: "Our AI agent calls each supplier and asks the same eight questions. It says it is an AI in the first sentence." },
  { icon: Scale, title: "Compare", body: "Per kg, per thousand, plus GST, to-pay freight: every quote becomes one number at your door." },
  { icon: Handshake, title: "Negotiate", body: "We go back to the best three with real competing prices. Never invented ones, never names." },
];

const RAW_QUOTES = [
  { raw: "₹990 per 1000 + 18% GST, transport to-pay, MOQ 10,000", landed: "₹1.38", note: "MOQ is twice your order", tone: "warn" as const },
  { raw: "₹1.05 per piece, GST included, free delivery, 5 days", landed: "₹1.50", note: "Recommended", tone: "good" as const },
  { raw: "₹182 per kg, about 170 pieces in a kg, plate ₹1,500 once", landed: "₹1.43", note: "Includes one-time plate cost", tone: "neutral" as const },
  { raw: "₹0.55 per piece, 100% advance", landed: "Blocked", note: "GSTIN fails checksum", tone: "bad" as const },
];

const COMPARE = [
  ["Who the platform works for", "The seller who bought your lead", "You, the buyer"],
  ["Who makes the calls", "Thirty sellers call you", "Our agent calls them"],
  ["Your phone number", "Shared with every seller", "Hidden until you choose"],
  ["Quotes", "Per kg, per 1000, GST extra, freight extra", "One landed cost per unit"],
  ["Supplier checks", "Paid badge", "GSTIN checksum, state, history, outcomes"],
  ["Negotiation", "You haggle", "Done for you, within your limits"],
  ["You pay for", "Nothing, sellers pay for your lead", "A shortlist you can order from"],
];

const FAQ = [
  ["Is this a marketplace?", "No. We do not hold stock or take a cut from suppliers. We work for the buyer, you pay us for the sourcing work, and you order directly from the supplier you pick."],
  ["Will suppliers know who I am?", "Not until you choose them. Our agent says it is calling for a café in Gurugram or a D2C brand in Noida, never your name or number."],
  ["Is calling suppliers with AI allowed?", "Every call opens by saying it is an AI assistant and that the call is recorded. We call only in business hours, at most once a day per supplier, and anyone who says stop is never called again. Automated calls go through a registered telephony provider."],
  ["How do you check a supplier is real?", "Every GSTIN is checked for format, checksum and state on our side. With a GST data provider connected we also check active status and filing regularity. Then our own records: did they honour the quote, deliver on time, pass quality."],
  ["What does landed cost mean?", "What one unit costs at your door: price converted to your unit, plus GST if extra, plus freight, plus any one-time plate or setup cost spread over the order."],
  ["Which categories do you cover?", "We launch with food and D2C packaging in Delhi NCR: paper cups, food boxes, carry bags, pouches, mono cartons, labels, and fabric for boutiques. Anything else, we source by hand while we build the network."],
];

export default function Landing() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <header className="relative overflow-hidden bg-ink text-white">
        <div className="grid-bg absolute inset-0 opacity-60" />
        <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-marigold/20 blur-3xl" />
        <div className="absolute -left-32 bottom-0 h-[380px] w-[380px] rounded-full bg-sky/10 blur-3xl" />
        <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Logo dark />
          <div className="hidden items-center gap-7 text-sm text-white/70 md:flex">
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#compare" className="hover:text-white">Quote sheet</a>
            <a href="#trust" className="hover:text-white">Trust</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <ButtonLink href="/login" variant="ghost" className="text-white hover:bg-white/10">Sign in</ButtonLink>
            <ButtonLink href="/login?mode=signup" variant="primary">Start sourcing</ButtonLink>
          </div>
        </nav>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-24 pt-12 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div className="animate-rise">
            <Badge tone="gold" className="mb-6">Buyer-side AI sourcing for Indian wholesale</Badge>
            <h1 className="text-[2.6rem] font-bold leading-[1.05] sm:text-6xl">
              Your requirement in.
              <br />
              <span className="text-marigold">Best three suppliers</span> out.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
              BhavTaav calls wholesalers for you in Hindi and English, checks their GST, compares every quote rupee for rupee at your door, and negotiates. You only talk to the two or three worth talking to.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/login?mode=signup" variant="primary" size="lg">
                Start your first brief, free <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="#how" variant="outline" size="lg" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                See how it works
              </ButtonLink>
            </div>
            <ul className="mt-10 grid max-w-xl grid-cols-1 gap-3 text-sm text-white/75 sm:grid-cols-2">
              {[
                [Languages, "Calls in Hindi, English and Hinglish"],
                [BadgeCheck, "GSTIN checked on every supplier"],
                [IndianRupee, "Landed cost with GST and freight"],
                [Lock, "Your number stays private"],
              ].map(([Icon, text], i) => {
                const I = Icon as typeof Check;
                return (
                  <li key={i} className="flex items-center gap-2.5">
                    <I className="h-4 w-4 text-marigold" /> {text as string}
                  </li>
                );
              })}
            </ul>
          </div>
          <HeroMock />
        </div>
      </header>

      {/* Problem */}
      <section className="border-b border-line bg-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-3">
          {[
            ["The list is the easy part.", "Post a requirement on a lead marketplace and your phone rings for days. Half the callers are traders, some are three states away."],
            ["Quotes don't line up.", "One says per piece plus GST, one says per thousand with free delivery, one says per kg with transport to-pay. Which is cheaper?"],
            ["Nobody checks who's real.", "Is the GSTIN active? Do they deliver on time? You find out after paying the advance."],
          ].map(([h, b]) => (
            <div key={h}>
              <h3 className="text-xl font-semibold">{h}</h3>
              <p className="mt-2 leading-relaxed text-muted">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-24">
        <SectionHead eyebrow="How it works" title="A purchase manager that works the phones for you" body="One brief starts six agents. You watch every call, quote and counter-offer live, and step in whenever you want." />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="group relative rounded-2xl border border-line bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-marigold">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="font-mono text-xs text-muted">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4 rounded-2xl bg-marigold-soft p-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-marigold text-ink">
            <ListChecks className="h-5 w-5" />
          </span>
          <p className="text-ink">
            <span className="font-semibold">Shortlist in your WhatsApp and dashboard.</span> <span className="text-ink-soft">Two or three suppliers, landed cost, terms and reasons side by side. Tap one, get their number and a ready message.</span>
          </p>
        </div>
      </section>

      {/* Quote sheet */}
      <section id="compare" className="bg-ink py-24 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-marigold">Like-for-like quote sheet</p>
            <h2 className="mt-3 text-4xl font-bold leading-tight">Four ways of quoting. One number to compare.</h2>
            <p className="mt-5 text-lg leading-relaxed text-white/70">
              We convert every quote to landed cost per unit at your door: price basis, GST, freight, plate charges and MOQ all accounted for. Every assumption is shown, never hidden.
            </p>
            <ul className="mt-8 space-y-3 text-white/80">
              {["Unit price, MOQ, GST, freight and lead time", "Payment terms, advance and sample cost", "Defect and replacement policy", "Flags when a price looks too good to be true"].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-marigold" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2">
            <div className="rounded-xl bg-white p-5 text-ink">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <p className="font-semibold">250 ml printed paper cups, 5,000 / month</p>
                <span className="text-xs text-muted">Landed per cup</span>
              </div>
              <ul className="divide-y divide-line">
                {RAW_QUOTES.map((q) => (
                  <li key={q.raw} className="flex items-center gap-4 py-3.5">
                    <p className="flex-1 text-sm text-ink-soft">“{q.raw}”</p>
                    <div className="text-right">
                      <p className={cx("tabular font-display text-xl font-semibold", q.tone === "bad" && "text-coral", q.tone === "good" && "text-mint-deep")}>{q.landed}</p>
                      <p className={cx("text-xs", q.tone === "good" ? "text-mint-deep" : q.tone === "bad" ? "text-coral" : q.tone === "warn" ? "text-[#8A5A00]" : "text-muted")}>{q.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-lift">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">Okhla Cupcraft</p>
                <p className="text-sm text-muted">Manufacturer, New Delhi, since 2012</p>
              </div>
              <div className="text-right">
                <p className="tabular font-display text-4xl font-bold text-mint-deep">87</p>
                <Badge tone="good">Trusted</Badge>
              </div>
            </div>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                ["pass", "GSTIN format and checksum valid"],
                ["pass", "Registered in Delhi, matches address"],
                ["pass", "4 orders delivered cleanly via BhavTaav"],
                ["minus", "Late delivery once", "-8"],
                ["minus", "Trader for one product line", "-5"],
                ["info", "GST filing history: not checked yet"],
              ].map(([k, t, p]) => (
                <li key={t} className="flex items-center gap-3">
                  <span className={cx("grid h-5 w-5 place-items-center rounded-full", k === "pass" ? "bg-mint-soft text-mint-deep" : k === "minus" ? "bg-coral-soft text-coral" : "bg-ink/5 text-muted")}>
                    {k === "pass" ? <Check className="h-3 w-3" /> : k === "minus" ? <X className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  </span>
                  <span className="flex-1">{t}</span>
                  {p ? <span className="tabular font-mono text-coral">{p}</span> : null}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHead eyebrow="Trust ledger" title="Every supplier starts at 100. Every point lost has a reason." body="No black-box ratings. You see exactly why a supplier is trusted, worth a check, or blocked. Checks we could not run are marked as not checked, never quietly scored." align="left" />
            <p className="mt-6 leading-relaxed text-muted">
              The part nobody else has: what happened after the quote. Did the supplier honour the price, deliver on time, pass quality? Every order you record makes the next buyer's shortlist better.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-y border-line bg-paper py-24">
        <div className="mx-auto max-w-5xl px-5">
          <SectionHead eyebrow="Why buyer-side" title="A lead marketplace gives you a list. We give you a decision." />
          <div className="mt-12 overflow-hidden rounded-2xl border border-line bg-white">
            <div className="grid grid-cols-[1.1fr_1fr_1fr] bg-ink text-sm font-semibold text-white">
              <div className="px-5 py-3.5" />
              <div className="px-5 py-3.5 text-white/70">Lead marketplace</div>
              <div className="px-5 py-3.5 text-marigold">BhavTaav</div>
            </div>
            {COMPARE.map(([k, a, b], i) => (
              <div key={k} className={cx("grid grid-cols-[1.1fr_1fr_1fr] text-sm", i % 2 && "bg-paper/60")}>
                <div className="px-5 py-4 font-medium">{k}</div>
                <div className="px-5 py-4 text-muted">{a}</div>
                <div className="px-5 py-4 font-medium text-ink">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flywheel + responsible calling */}
      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-24 lg:grid-cols-2">
        <div className="rounded-2xl bg-ink p-8 text-white">
          <TrendingDown className="h-6 w-6 text-marigold" />
          <h3 className="mt-5 text-2xl font-semibold">Every call makes the next one cheaper</h3>
          <p className="mt-3 leading-relaxed text-white/70">Each call adds a verified price, and each order adds a delivery record. Over time we know what a printed 250 ml cup really costs in NCR this month, and which suppliers keep their word. Fewer calls per brief, faster shortlists, sharper prices.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
            {["Verified price index", "Supplier behaviour scores", "Reorder in one tap", "Pooled demand (soon)"].map((t) => (
              <div key={t} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2.5">
                <RefreshCw className="h-4 w-4 text-marigold" /> {t}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-line p-8">
          <PhoneOff className="h-6 w-6 text-ink" />
          <h3 className="mt-5 text-2xl font-semibold">AI calling, done responsibly</h3>
          <ul className="mt-5 space-y-3.5 text-ink-soft">
            {[
              "First sentence of every call: it's an AI assistant, and the call is recorded.",
              "Business hours only, Monday to Saturday, never more than once a day per supplier.",
              "Say stop once and that number is never called again, by anyone on BhavTaav.",
              "Negotiation cites only real quotes from other verified suppliers. Enforced in code.",
              "Demo suppliers can never be dialled. Real calls go through a registered telephony provider.",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <Ban className="mt-1 h-4 w-4 shrink-0 text-marigold-deep" /> <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-line bg-paper py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHead eyebrow="Pilot pricing" title="Pay for a shortlist, never for leads" body="Suppliers pay us nothing. That is the point: we can only earn by getting you a better deal." />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { name: "First brief", price: "Free", per: "", items: ["Full sourcing run", "Calls, vetting, quote sheet", "Negotiation on top three"], cta: "Start free", hi: false },
              { name: "Per brief", price: "₹1,499", per: "per brief", items: ["Up to 15 suppliers called", "Shortlist within 48 hours", "Search again once, free"], cta: "Start sourcing", hi: true },
              { name: "Repeat buyer", price: "₹4,999", per: "per month", items: ["Up to 6 briefs a month", "One-tap reorders", "Price alerts on your items"], cta: "Talk to us", hi: false },
            ].map((p) => (
              <div key={p.name} className={cx("flex flex-col rounded-2xl border p-7", p.hi ? "border-ink bg-ink text-white shadow-lift" : "border-line bg-white")}>
                <p className={cx("text-sm font-semibold", p.hi ? "text-marigold" : "text-muted")}>{p.name}</p>
                <p className="mt-3 font-display text-4xl font-bold">
                  {p.price} <span className={cx("text-base font-normal", p.hi ? "text-white/60" : "text-muted")}>{p.per}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {p.items.map((i) => (
                    <li key={i} className="flex gap-2">
                      <Check className={cx("h-4 w-4 shrink-0", p.hi ? "text-marigold" : "text-mint-deep")} /> {i}
                    </li>
                  ))}
                </ul>
                <ButtonLink href="/login?mode=signup" variant={p.hi ? "primary" : "outline"} className="mt-7">
                  {p.cta}
                </ButtonLink>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-24">
        <SectionHead eyebrow="FAQ" title="Questions buyers ask us" />
        <div className="mt-10 divide-y divide-line rounded-2xl border border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {q}
                <span className="text-xl text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-ink px-8 py-16 text-center text-white">
          <div className="absolute inset-x-0 -top-32 mx-auto h-64 w-[36rem] rounded-full bg-marigold/25 blur-3xl" />
          <h2 className="relative text-4xl font-bold sm:text-5xl">Stop calling. Start choosing.</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-white/70">Your first sourcing brief is on us. Tell us what you buy every month and see what it should cost.</p>
          <ButtonLink href="/login?mode=signup" variant="primary" size="lg" className="relative mt-8">
            Start your first brief <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted sm:flex-row">
          <Logo />
          <p>Made for India&apos;s small buyers. Launching in Delhi NCR.</p>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ eyebrow, title, body, align = "center" }: { eyebrow: string; title: string; body?: string; align?: "center" | "left" }) {
  return (
    <div className={cx("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p className="text-sm font-semibold uppercase tracking-wider text-marigold-deep">{eyebrow}</p>
      <h2 className="mt-3 text-4xl font-bold leading-tight">{title}</h2>
      {body ? <p className="mt-4 text-lg leading-relaxed text-muted">{body}</p> : null}
    </div>
  );
}

function HeroMock() {
  const steps = [
    ["Scout", "10 found", true],
    ["Vet", "9 cleared", true],
    ["Call", "7 quotes", true],
    ["Compare", "Done", true],
    ["Negotiate", "2 came down", false],
  ] as const;
  return (
    <div className="relative animate-rise [animation-delay:120ms]">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-2 shadow-2xl backdrop-blur">
        <div className="rounded-xl bg-white p-5 text-ink">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Live brief</p>
              <p className="mt-1 font-semibold">250 ml printed paper cups</p>
              <p className="text-sm text-muted">5,000 a month · Gurugram 122002</p>
            </div>
            <Badge tone="warn" dot>Negotiating</Badge>
          </div>
          <div className="mt-5 grid grid-cols-5 gap-1.5">
            {steps.map(([name, n, done]) => (
              <div key={name}>
                <div className={cx("h-1.5 rounded-full", done ? "bg-ink" : "animate-pulseDot bg-marigold")} />
                <p className="mt-2 text-[11px] font-semibold">{name}</p>
                <p className="text-[11px] text-muted">{n}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2">
            {[
              ["Gurgaon Cup House", "₹1.50", "92", "5 days", true],
              ["Bawana Paper Cups", "₹1.38", "85", "10 days", false],
              ["Okhla Cupcraft", "₹1.65", "88", "7 days", false],
            ].map(([n, l, t, d, best]) => (
              <div key={n as string} className={cx("flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm", best ? "border-mint/40 bg-mint-soft/60" : "border-line")}>
                <div>
                  <p className="font-medium">{n}</p>
                  <p className="text-xs text-muted">Trust {t} · {d}</p>
                </div>
                <div className="text-right">
                  <p className="tabular font-display text-lg font-semibold">{l}</p>
                  <p className="text-[11px] text-muted">landed / cup</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute -bottom-16 -left-6 hidden max-w-[300px] rounded-xl border border-line bg-white p-3.5 text-ink shadow-lift sm:block">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <Phone className="h-3 w-3" /> Call with Okhla Cupcraft
        </p>
        <p className="mt-1.5 text-sm">“Rate ₹1.06 per piece padega, GST 18% alag se. 7 din mein delivery.”</p>
      </div>
    </div>
  );
}
