import { ArrowRight, ArrowsClockwise, Check, Clock, CurrencyInr, LockKey, PhoneSlash, Prohibit, SealCheck, Translate, TrendDown, X } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/brand";
import { ButtonLink, cx } from "@/components/ui";
import { HeroDemo } from "@/components/landing/hero-demo";
import { BeforeAfter, HowItWorks } from "@/components/landing/how-it-works";
import { PRODUCTS } from "@/components/landing/illustrations";
import { FreeTools } from "@/components/landing/free-tools";
import { computeLanded, type QuoteTerms } from "@/lib/domain/landed-cost";

// Example quotes for 5,000 cups. Landed costs are computed from the stated terms, not typed in.
const QTY = 5000;
const EXAMPLES: { raw: string; terms: QuoteTerms | null; note: string; tone: "warn" | "good" | "neutral" | "bad" }[] = [
  { raw: "₹990 per 1000 + 18% GST, transport to-pay, MOQ 10,000", terms: { unitPrice: 990, priceBasis: "per_1000", gstIncluded: false, gstRate: 0.18, freightMode: "to_pay", moq: 10000, leadTimeDays: 10 }, note: "MOQ is twice your order", tone: "warn" },
  { raw: "₹1.05 per piece, GST included, free delivery, plate ₹2,000 once", terms: { unitPrice: 1.05, priceBasis: "per_unit", gstIncluded: true, freightMode: "included", setupCost: 2000, leadTimeDays: 5 }, note: "Recommended: trusted, 5 days", tone: "good" },
  { raw: "₹182 per kg, about 170 pieces a kg, freight ₹450, plate ₹1,500", terms: { unitPrice: 182, priceBasis: "per_kg", unitsPerBasis: 170, gstIncluded: false, gstRate: 0.18, freightMode: "fixed", freightAmount: 450, setupCost: 1500, leadTimeDays: 6 }, note: "Per kg looked cheap. It isn't.", tone: "neutral" },
  { raw: "₹0.55 per piece, 100% advance", terms: null, note: "GSTIN fails checksum", tone: "bad" },
];
const RAW_QUOTES = EXAMPLES.map((e) => {
  if (!e.terms) return { ...e, landed: "Blocked" };
  const r = computeLanded(e.terms, { quantity: QTY, unit: "pieces", defaultGstRate: 0.18 });
  return { ...e, landed: r.comparable ? `₹${r.landedUnit.toFixed(2)}` : "–" };
});

const COMPARE = [
  ["Works for", "The seller who bought your lead", "You, the buyer"],
  ["Who makes the calls", "Thirty sellers call you", "Our agent calls them"],
  ["Your phone number", "Shared with every seller", "Hidden until you choose"],
  ["Quotes", "Per kg, per 1000, GST extra, freight extra", "One landed cost per unit"],
  ["Supplier checks", "A badge the seller paid for", "GSTIN checks, history, delivery record"],
  ["Negotiation", "You haggle", "Done for you, within your limits"],
  ["You pay for", "Nothing. Sellers pay for your lead", "A shortlist you can order from"],
];

const FAQ = [
  ["Is this a marketplace?", "No. We don't hold stock or take a cut from suppliers. We work for the buyer, you pay us for the sourcing work, and you order directly from the supplier you pick."],
  ["Will suppliers know who I am?", "Not until you choose them. Our agent says it is calling for a café in Gurugram or a D2C brand in Noida, never your name or number."],
  ["Is calling suppliers with AI allowed?", "Every call opens by saying it's an AI assistant and that the call is recorded. We call only in business hours, at most once a day per supplier, and anyone who says stop is never called again. Calls go through a registered telephony provider."],
  ["How do you check a supplier is real?", "Every GSTIN is checked for format, checksum and state. With a GST data provider connected we also check active status and filing. Then our own records: did they honour the quote, deliver on time, pass quality."],
  ["What does landed cost mean?", "What one unit costs at your door: price converted to your unit, plus GST if extra, plus freight, plus any one-time plate or setup cost spread over the order."],
  ["Which categories do you cover?", "Food and D2C packaging in Delhi NCR first: paper cups, food boxes, carry bags, pouches, mono cartons, labels, and fabric for boutiques. Anything else we source by hand while we build the network."],
];

export default function Landing() {
  return (
    <div className="bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink/85 backdrop-blur-lg">
        <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Logo dark />
          <div className="hidden items-center gap-1 text-[14px] text-white/65 md:flex">
            {[["How it works", "#how"], ["Free tools", "#tools"], ["Trust", "#trust"], ["Pricing", "#pricing"], ["FAQ", "#faq"]].map(([l, h]) => (
              <a key={h} href={h} className="rounded-md px-3 py-1.5 transition hover:bg-white/5 hover:text-white">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <ButtonLink href="/login" variant="ghost" size="sm" className="text-white/80 hover:bg-white/10 hover:text-white">Sign in</ButtonLink>
            <ButtonLink href="/login?mode=signup" variant="primary" size="sm">Start sourcing</ButtonLink>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative -mt-16 overflow-hidden bg-ink pt-16 text-white">
        <div className="grid-bg absolute inset-0 [mask-image:linear-gradient(to_bottom,black_70%,transparent)]" />
        <div className="absolute right-[-8%] top-[-25%] h-[620px] w-[620px] rounded-full bg-marigold/[0.16] blur-[130px]" />
        <div className="absolute bottom-[-30%] left-[-10%] h-[520px] w-[520px] rounded-full bg-[#14B8A6]/[0.12] blur-[130px]" />
        <div className="absolute left-1/2 top-0 h-px w-[60%] -translate-x-1/2 bg-gradient-to-r from-transparent via-marigold/50 to-transparent" />
        <div className="relative mx-auto grid max-w-[1440px] items-center gap-12 px-5 sm:px-8 lg:px-12 pb-16 pt-12 lg:grid-cols-[1fr_460px] lg:gap-16 xl:grid-cols-[1fr_520px] xl:gap-24 lg:pb-16 lg:pt-14">
          <div className="animate-rise">
            <a href="#how" className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-[13px] text-white/75 transition hover:border-white/20">
              <span className="rounded-full bg-marigold px-2 py-0.5 text-[11px] font-semibold text-ink">New</span>
              <span className="sm:hidden">AI sourcing for wholesale</span>
              <span className="hidden sm:inline">Buyer-side AI sourcing for Indian wholesale</span>
              <ArrowRight weight="bold" className="h-3 w-3 transition group-hover:translate-x-0.5" />
            </a>
            <h1 className="mt-6 text-[34px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[52px] xl:text-[64px]">
              Your requirement in.
              <br />
              <span className="bg-gradient-to-r from-marigold to-[#FFD37A] bg-clip-text text-transparent">Best 3 suppliers out.</span>
            </h1>
            <p lang="hi" className="mt-4 font-hindi text-[20px] font-semibold leading-snug text-white/85 xl:text-[24px]">
              भाव-ताव हम करेंगे,{" "}
              <span className="relative inline-block text-marigold">
                आप बस चुनिए।
                <svg viewBox="0 0 120 10" preserveAspectRatio="none" className="absolute -bottom-1.5 left-0 h-2 w-full" aria-hidden>
                  <path d="M2 7c30-5 76-6 116-2" fill="none" stroke="#FFB21E" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
                </svg>
              </span>
              <span className="sr-only"> (We do the haggling, you just choose.)</span>
            </p>
            <p className="mt-5 max-w-[560px] text-[17px] leading-relaxed text-white/65 xl:text-[19px]">
              BhavTaav calls wholesalers for you in Hindi and English, checks their GST, compares every quote rupee for rupee at your door and negotiates. You only talk to the ones worth talking to.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/login?mode=signup" variant="primary" size="lg" className="shadow-[0_8px_30px_-6px_rgba(255,178,30,0.55)]">
                Start your first brief, free <ArrowRight weight="bold" className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="#how" variant="ghost" size="lg" className="text-white/80 hover:bg-white/5 hover:text-white">
                See how it works
              </ButtonLink>
            </div>
            <div className="mt-10 grid max-w-[600px] grid-cols-2 gap-x-6 gap-y-3 text-[13.5px] text-white/70">
              {[
                [Translate, "Calls in Hindi, English, Hinglish"],
                [SealCheck, "GSTIN checked on every supplier"],
                [CurrencyInr, "Landed cost with GST and freight"],
                [LockKey, "Your number stays private"],
              ].map(([Icon, text], i) => {
                const I = Icon as typeof Check;
                return (
                  <p key={i} className="flex items-center gap-2.5">
                    <I weight="duotone" className="h-[18px] w-[18px] shrink-0 text-marigold" /> {text as string}
                  </p>
                );
              })}
            </div>
          </div>
          <HeroDemo />
        </div>

        {/* What we source */}
        <div className="relative border-t border-white/[0.06] bg-white/[0.02]">
          <div className="mx-auto flex max-w-[1440px] items-center gap-6 overflow-x-auto px-5 sm:px-8 lg:px-12 py-6 [scrollbar-width:none] lg:justify-between">
            <p className="shrink-0 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/40">Launching with</p>
            {PRODUCTS.map(({ name, art: Art }) => (
              <div key={name} className="flex shrink-0 items-center gap-2.5 text-[13px] text-white/75">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white p-1">
                  <Art />
                </span>
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before / after */}
      <section className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 py-20 lg:py-24">
        <SectionHead eyebrow="The problem" title="The list is the easy part" body="Post a requirement and your phone rings for days. Every seller quotes a different way, and nobody tells you who is real." />
        <div className="mt-12">
          <BeforeAfter />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-16 border-t border-line bg-paper/60 py-20 lg:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <SectionHead eyebrow="How it works" title="A purchase manager that works the phones for you" body="One brief sets seven steps in motion. You watch every call, quote and counter-offer live, and step in whenever you want." />
          <div className="mt-12">
            <HowItWorks />
          </div>
        </div>
      </section>

      {/* Quote sheet */}
      <section id="compare" className="scroll-mt-16 bg-ink py-20 text-white lg:py-24">
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 sm:px-8 lg:px-12 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-marigold">Like-for-like quote sheet</p>
            <h2 className="mt-3 text-[32px] font-bold leading-tight sm:text-[38px]">Four ways of quoting. One number to compare.</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-white/65">Price basis, GST, freight, plate charges and MOQ, all converted to landed cost per unit at your door. Every assumption is shown.</p>
            <p className="mt-4 text-[14px] text-white/55">
              Wherever you see a price in <span className="landed-dark font-semibold">green</span>, it&apos;s landed cost: what one unit costs at your door, GST and delivery included.
            </p>
            <ul className="mt-7 space-y-3 text-[15px] text-white/80">
              {["Unit price, MOQ, GST, freight and lead time", "Payment terms, advance and sample cost", "Defect and replacement policy", "A flag when a price is too good to be true"].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check weight="bold" className="mt-0.5 h-4 w-4 shrink-0 text-marigold" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/[0.05] p-1.5">
            <div className="rounded-[18px] bg-white p-5 text-ink">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <p className="text-[15px] font-semibold">250 ml printed paper cups · 5,000 a month</p>
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Landed / cup</span>
              </div>
              <ul className="divide-y divide-line">
                {RAW_QUOTES.map((q) => (
                  <li key={q.raw} className="flex items-center gap-4 py-3.5">
                    <p className="flex-1 font-mono text-[12.5px] leading-relaxed text-ink-soft">{q.raw}</p>
                    <div className="w-[128px] text-right">
                      <p className={cx("tabular font-display text-xl font-semibold", q.tone === "bad" && "text-coral")}>{q.tone === "bad" ? q.landed : <span className="landed">{q.landed}</span>}</p>
                      <p className={cx("text-[11px]", q.tone === "good" ? "text-mint-deep" : q.tone === "bad" ? "text-coral" : q.tone === "warn" ? "text-[#8A5A00]" : "text-muted")}>{q.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Free tools */}
      <section id="tools" className="scroll-mt-16 border-b border-line bg-paper/60 py-20 lg:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <SectionHead eyebrow="Free tools, no sign-up" title="Already have quotes? Compare them now." body="The same landed-cost maths and GSTIN check our agent uses, in your browser. Nothing is saved or sent anywhere." />
          <div className="mx-auto mt-10 max-w-[1180px]">
            <FreeTools />
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="scroll-mt-16 mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[28px] bg-gradient-to-br from-marigold-soft to-mint-soft opacity-70 blur-2xl" />
            <div className="rounded-[22px] border border-line bg-white p-6 shadow-lift">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[15px] font-semibold">Okhla Cupcraft</p>
                  <p className="text-[13px] text-muted">Manufacturer, New Delhi, since 2012</p>
                </div>
                <div className="flex items-center gap-3">
                  <Gauge value={87} />
                </div>
              </div>
              <ul className="mt-5 space-y-2.5 text-[14px]">
                {[
                  ["pass", "GSTIN format and checksum valid"],
                  ["pass", "Registered in Delhi, matches address"],
                  ["pass", "4 orders delivered cleanly via BhavTaav"],
                  ["minus", "Late delivery once", "−8"],
                  ["minus", "Trader for one product line", "−5"],
                  ["info", "GST filing history: not checked yet"],
                ].map(([k, t, p]) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className={cx("grid h-5 w-5 place-items-center rounded-full", k === "pass" ? "bg-mint-soft text-mint-deep" : k === "minus" ? "bg-coral-soft text-coral" : "bg-ink/5 text-muted")}>
                      {k === "pass" ? <Check weight="bold" className="h-3 w-3" /> : k === "minus" ? <X weight="bold" className="h-3 w-3" /> : <Clock weight="bold" className="h-3 w-3" />}
                    </span>
                    <span className="flex-1">{t}</span>
                    {p ? <span className="tabular font-mono text-[13px] text-coral">{p}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <SectionHead align="left" eyebrow="Trust ledger" title="Every supplier starts at 100. Every point lost has a reason." body="No black-box ratings. You see exactly why a supplier is trusted, worth a check, or blocked. Checks we couldn't run say so." />
            <p className="mt-5 text-[15px] leading-relaxed text-muted">The part nobody else has: what happened after the quote. Did they honour the price, deliver on time, pass quality? Every order you record sharpens the next buyer's shortlist.</p>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-y border-line bg-paper/60 py-20 lg:py-24">
        <div className="mx-auto max-w-[1080px] px-5 sm:px-8">
          <SectionHead eyebrow="Why buyer-side" title="A lead marketplace gives you a list. We give you a decision." />
          <div className="mt-10 overflow-hidden rounded-[20px] border border-line bg-white shadow-card">
            <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-line text-[13px] font-semibold">
              <div className="px-5 py-3.5" />
              <div className="px-5 py-3.5 text-muted">Lead marketplace</div>
              <div className="bg-ink px-5 py-3.5 text-marigold">BhavTaav</div>
            </div>
            {COMPARE.map(([k, a, b], i) => (
              <div key={k} className={cx("grid grid-cols-[1fr_1fr_1fr] text-[14px]", i < COMPARE.length - 1 && "border-b border-line")}>
                <div className="px-5 py-3.5 font-medium">{k}</div>
                <div className="flex items-start gap-2 px-5 py-3.5 text-muted"><X weight="bold" className="mt-1 h-3 w-3 shrink-0 text-coral/70" />{a}</div>
                <div className="flex items-start gap-2 bg-ink/[0.025] px-5 py-3.5 font-medium"><Check weight="bold" className="mt-1 h-3 w-3 shrink-0 text-mint-deep" />{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flywheel + responsible calling */}
      <section className="mx-auto grid max-w-[1440px] gap-4 px-5 sm:px-8 lg:px-12 py-20 lg:grid-cols-2 lg:py-24">
        <div className="relative overflow-hidden rounded-[22px] bg-ink p-8 text-white">
          <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-marigold/15 blur-3xl" />
          <TrendDown weight="duotone" className="h-7 w-7 text-marigold" />
          <h3 className="mt-5 text-[22px] font-semibold">Every call makes the next one cheaper</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-white/65">Each call adds a verified price; each order adds a delivery record. Soon we know what a printed 250 ml cup really costs in NCR this month, and who keeps their word.</p>
          <div className="relative mt-7 grid grid-cols-2 gap-2.5 text-[13px]">
            {["Verified price index", "Supplier behaviour scores", "One-tap reorders", "Pooled demand (soon)"].map((t) => (
              <div key={t} className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2.5">
                <ArrowsClockwise weight="bold" className="h-4 w-4 text-marigold" /> {t}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[22px] border border-line p-8">
          <PhoneSlash weight="duotone" className="h-7 w-7 text-ink" />
          <h3 className="mt-5 text-[22px] font-semibold">AI calling, done responsibly</h3>
          <ul className="mt-5 space-y-3 text-[14.5px] text-ink-soft">
            {[
              "First sentence of every call: it's an AI assistant, and the call is recorded.",
              "Business hours only, Monday to Saturday, never more than once a day per supplier.",
              "Say stop once and that number is never called again.",
              "Negotiation cites only real quotes from verified suppliers. Enforced in code.",
              "Real calls only through a registered telephony provider.",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <Prohibit weight="bold" className="mt-1 h-4 w-4 shrink-0 text-marigold-deep" /> <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-16 border-t border-line bg-paper/60 py-20 lg:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <SectionHead eyebrow="Pilot pricing" title="Pay for a shortlist, never for leads" body="Suppliers pay us nothing. We only earn by getting you a better deal." />
          <div className="mx-auto mt-12 grid max-w-[1120px] gap-4 md:grid-cols-3">
            {[
              { name: "First brief", price: "Free", per: "", items: ["Full sourcing run", "Calls, vetting, quote sheet", "Negotiation on top three"], cta: "Start free", hi: false },
              { name: "Per brief", price: "₹1,499", per: "/ brief", items: ["Up to 15 suppliers called", "Shortlist within 48 hours", "Search again once, free"], cta: "Start sourcing", hi: true },
              { name: "Repeat buyer", price: "₹4,999", per: "/ month", items: ["Up to 6 briefs a month", "One-tap reorders", "Price alerts on your items"], cta: "Talk to us", hi: false },
            ].map((p) => (
              <div key={p.name} className={cx("relative flex flex-col rounded-[22px] border p-7", p.hi ? "border-ink bg-ink text-white shadow-lift" : "border-line bg-white")}>
                {p.hi ? <span className="absolute -top-3 left-7 rounded-full bg-marigold px-2.5 py-0.5 text-[11px] font-semibold text-ink">Most picked</span> : null}
                <p className={cx("text-[13px] font-semibold", p.hi ? "text-white/60" : "text-muted")}>{p.name}</p>
                <p className="mt-3 font-display text-[38px] font-bold leading-none">
                  {p.price} <span className={cx("text-[14px] font-normal", p.hi ? "text-white/50" : "text-muted")}>{p.per}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5 text-[14px]">
                  {p.items.map((i) => (
                    <li key={i} className="flex gap-2">
                      <Check weight="bold" className={cx("mt-0.5 h-4 w-4 shrink-0", p.hi ? "text-marigold" : "text-mint-deep")} /> {i}
                    </li>
                  ))}
                </ul>
                <ButtonLink href="/login?mode=signup" variant={p.hi ? "primary" : "outline"} className="mt-7">{p.cta}</ButtonLink>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 mx-auto max-w-[880px] px-5 sm:px-8 py-20 lg:py-24">
        <SectionHead eyebrow="FAQ" title="Questions buyers ask us" />
        <div className="mt-10 divide-y divide-line rounded-[20px] border border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-6 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold">
                {q}
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-20">
        <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[28px] bg-ink px-8 py-16 text-center text-white">
          <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_85%)]" />
          <div className="absolute inset-x-0 -top-32 mx-auto h-64 w-[34rem] rounded-full bg-marigold/25 blur-3xl" />
          <p lang="hi" className="relative font-hindi text-[18px] font-semibold text-marigold">भाव-ताव हम करेंगे</p>
          <h2 className="relative mt-2 text-[34px] font-bold sm:text-[44px]">Stop calling. Start choosing.</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-[16px] text-white/65">Your first sourcing brief is on us. Tell us what you buy every month and see what it should cost.</p>
          <ButtonLink href="/login?mode=signup" variant="primary" size="lg" className="relative mt-8 shadow-[0_8px_30px_-6px_rgba(255,178,30,0.55)]">
            Start your first brief <ArrowRight weight="bold" className="h-4 w-4" />
          </ButtonLink>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-5 sm:px-8 lg:px-12 py-8 text-[13px] text-muted sm:flex-row">
          <Logo />
          <p>Made for India&apos;s small buyers. Launching in Delhi NCR.</p>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ eyebrow, title, body, align = "center" }: { eyebrow: string; title: string; body?: string; align?: "center" | "left" }) {
  return (
    <div className={cx("max-w-[640px]", align === "center" && "mx-auto text-center")}>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-marigold-deep">{eyebrow}</p>
      <h2 className="mt-3 text-[30px] font-bold leading-[1.12] sm:text-[38px]">{title}</h2>
      {body ? <p className="mt-4 text-[16px] leading-relaxed text-muted">{body}</p> : null}
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-16 w-16">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#E3F8EC" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="#12B76A" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <span className="tabular absolute inset-0 grid place-items-center font-display text-lg font-bold">{value}</span>
    </div>
  );
}
