// Landing copy shared by the page and the chat widget, so the bot never drifts from what the site says.

export const FAQ: [string, string][] = [
  ["Is this a marketplace?", "No. We don't hold stock or take a cut from suppliers. We work for the buyer, you pay us for the sourcing work, and you order directly from the supplier you pick."],
  ["Will suppliers know who I am?", "Not until you choose them. Our agent says it is calling for a café in Gurugram or a D2C brand in Noida, never your name or number."],
  ["Is calling suppliers with AI allowed?", "Every call opens by saying it's an AI assistant and that the call is recorded. We call only in business hours, at most once a day per supplier, and anyone who says stop is never called again. Calls go through a registered telephony provider."],
  ["How do you check a supplier is real?", "Every GSTIN is checked for format, checksum and state. With a GST data provider connected we also check active status and filing. Then our own records: did they honour the quote, deliver on time, pass quality."],
  ["What does landed cost mean?", "What one unit costs at your door: price converted to your unit, plus GST if extra, plus freight, plus any one-time plate or setup cost spread over the order."],
  ["Which categories do you cover?", "Food and D2C packaging in Delhi NCR first: paper cups, food boxes, carry bags, pouches, mono cartons, labels, and fabric for boutiques. Anything else we source by hand while we build the network."],
];

export const PLANS = [
  { name: "First brief", price: "Free", per: "", items: ["Full sourcing run", "Calls, vetting, quote sheet", "Negotiation on top three"], cta: "Start free", hi: false },
  { name: "Per brief", price: "₹1,499", per: "/ brief", items: ["Up to 15 suppliers called", "Shortlist within 48 hours", "Search again once, free"], cta: "Start sourcing", hi: true },
  { name: "Repeat buyer", price: "₹4,999", per: "/ month", items: ["Up to 6 briefs a month", "One-tap reorders", "Price alerts on your items"], cta: "Talk to us", hi: false },
];
