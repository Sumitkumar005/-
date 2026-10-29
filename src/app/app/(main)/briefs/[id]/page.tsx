import { notFound } from "next/navigation";
import { HttpError } from "@/lib/api";
import { loadBriefView } from "@/lib/views/brief-view";
import { CATEGORIES } from "@/lib/domain/categories";
import { BriefScreen } from "./brief-screen";

export const dynamic = "force-dynamic";

export default async function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  try {
    const view = await loadBriefView(id);
    return <BriefScreen initial={view} categories={CATEGORIES} />;
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
}
