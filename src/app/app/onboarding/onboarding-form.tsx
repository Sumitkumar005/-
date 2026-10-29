"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, Input, Label, Select, Spinner } from "@/components/ui";

const TYPES = [
  ["cafe", "Café"],
  ["restaurant", "Restaurant"],
  ["cloud_kitchen", "Cloud kitchen"],
  ["bakery", "Bakery / sweets"],
  ["retail", "Retail shop"],
  ["boutique", "Boutique"],
  ["d2c_brand", "D2C brand"],
  ["manufacturer", "Manufacturer"],
  ["other", "Other"],
];

export function OnboardingForm({ states, defaultName }: { states: string[]; defaultName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_name: f.get("business_name"),
        business_type: f.get("business_type"),
        contact_name: f.get("contact_name") || null,
        phone: f.get("phone") || null,
        gstin: f.get("gstin") || null,
        city: f.get("city"),
        state: f.get("state"),
        pincode: f.get("pincode"),
      }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(j.error ?? "Could not save");
    router.replace("/app/briefs/new");
    router.refresh();
  }

  return (
    <Card className="mt-8 p-6">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="business_name">Business name</Label>
          <Input id="business_name" name="business_name" required maxLength={120} />
        </div>
        <div>
          <Label htmlFor="business_type">Type of business</Label>
          <Select id="business_type" name="business_type" defaultValue="cafe">
            {TYPES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="contact_name">Your name</Label>
          <Input id="contact_name" name="contact_name" defaultValue={defaultName} />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" required placeholder="Gurugram" />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Select id="state" name="state" required defaultValue="Haryana">
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="pincode" hint="(deliveries go here)">Pincode</Label>
          <Input id="pincode" name="pincode" required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} placeholder="122002" />
        </div>
        <div>
          <Label htmlFor="phone" hint="(optional)">WhatsApp number</Label>
          <Input id="phone" name="phone" inputMode="tel" placeholder="98xxxxxx10" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="gstin" hint="(optional, for GST invoices)">Your GSTIN</Label>
          <Input id="gstin" name="gstin" maxLength={15} className="uppercase" placeholder="06ABCDE1234F1Z5" />
        </div>
        {error ? <div className="sm:col-span-2"><Alert tone="bad">{error}</Alert></div> : null}
        <div className="sm:col-span-2">
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Spinner /> : null} Continue
          </Button>
        </div>
      </form>
    </Card>
  );
}
