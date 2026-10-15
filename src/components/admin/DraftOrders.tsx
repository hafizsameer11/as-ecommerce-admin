import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "./AdminShell";
import { Card, TableWrap, naira, StatusPill } from "./ui";
import { Send, Copy, Trash2, X } from "lucide-react";
import { commerceAdminApi, koboToNaira, nairaToKobo, type DraftOrderRow } from "@/lib/api/commerce";

type Draft = {
  id: string;
  number: string;
  customer: string;
  items: number;
  total: number;
  status: "Draft" | "Sent to customer" | "Converted";
  note: string;
  created: string;
};

function mapStatus(s: string): Draft["status"] {
  if (s === "sent") return "Sent to customer";
  if (s === "converted") return "Converted";
  return "Draft";
}

function mapRow(d: DraftOrderRow): Draft {
  return {
    id: d.id,
    number: d.number,
    customer: d.customerName || "Guest",
    items: d.itemsCount ?? 0,
    total: koboToNaira(d.total),
    status: mapStatus(d.status),
    note: d.note || "",
    created: new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
  };
}

export function DraftOrders() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ customer: "", note: "", items: "1", total: "" });
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      setLoading(true);
      const { data } = await commerceAdminApi.listDrafts();
      setDrafts(data.map(mapRow));
    } catch (err) {
      console.warn("[drafts]", err);
      toast.error(err instanceof Error ? err.message : "Failed to load drafts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const sendDraft = async (id: string) => {
    try {
      await commerceAdminApi.sendDraft(id);
      toast.success("Draft sent to customer");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    }
  };
  const duplicate = async (id: string) => {
    try {
      const d = await commerceAdminApi.duplicateDraft(id);
      toast.success(`Duplicated as ${d.number}`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Duplicate failed");
    }
  };
  const remove = async (id: string, number: string) => {
    if (!confirm(`Delete draft ${number}?`)) return;
    try {
      await commerceAdminApi.deleteDraft(id);
      toast.success(`Draft ${number} deleted`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };
  const createDraft = async () => {
    const customer = form.customer.trim() || "New customer";
    const qty = Math.max(1, parseInt(form.items, 10) || 1);
    const totalNaira = Math.max(0, parseInt(form.total, 10) || 0);
    try {
      await commerceAdminApi.createDraft({
        customerName: customer,
        note: form.note || undefined,
        items: [
          {
            name: form.note || "Custom line",
            qty,
            unitPrice: nairaToKobo(Math.round(totalNaira / qty) || totalNaira),
          },
        ],
      });
      setShowNew(false);
      setForm({ customer: "", note: "", items: "1", total: "" });
      toast.success("Draft created");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Draft Orders"
        subtitle="Quotes, holds, and manual carts prepared for customers"
        actions={
          <>
            <button onClick={() => void reload()} className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] hover:bg-black/5">Refresh</button>
            <button onClick={() => setShowNew(true)} className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-medium hover:opacity-90">+ New draft</button>
          </>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card className="!p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total drafts</div><div className="font-display text-2xl font-bold mt-1">{loading ? "…" : drafts.length}</div></Card>
        <Card className="!p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Sent to customer</div><div className="font-display text-2xl font-bold mt-1">{drafts.filter(d => d.status === "Sent to customer").length}</div></Card>
        <Card className="!p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Combined value</div><div className="font-display text-2xl font-bold mt-1">{naira(drafts.reduce((n, d) => n + d.total, 0))}</div></Card>
        <Card className="!p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Avg. quote</div><div className="font-display text-2xl font-bold mt-1">{drafts.length ? naira(Math.round(drafts.reduce((n, d) => n + d.total, 0) / drafts.length)) : naira(0)}</div></Card>
      </div>

      <TableWrap>
        <table className="w-full text-[13px]">
          <thead className="bg-black/[0.02] text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-medium">Draft</th>
              <th className="px-4 py-2.5 font-medium">Customer</th>
              <th className="px-4 py-2.5 font-medium">Note</th>
              <th className="px-4 py-2.5 font-medium">Items</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Created</th>
              <th className="px-4 py-2.5 font-medium text-right">Total</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((d) => (
              <tr key={d.id} className="border-t border-black/[0.06] hover:bg-black/[0.02]">
                <td className="px-4 py-3 font-medium">{d.number}</td>
                <td className="px-4 py-3">{d.customer}</td>
                <td className="px-4 py-3 text-muted-foreground max-w-[240px] truncate">{d.note || "—"}</td>
                <td className="px-4 py-3">{d.items}</td>
                <td className="px-4 py-3"><StatusPill status={d.status} /></td>
                <td className="px-4 py-3 text-muted-foreground">{d.created}</td>
                <td className="px-4 py-3 text-right font-medium">{naira(d.total)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    {d.status === "Draft" && (
                      <button onClick={() => void sendDraft(d.id)} className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06]" title="Send"><Send className="h-3.5 w-3.5" /></button>
                    )}
                    <button onClick={() => void duplicate(d.id)} className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06]" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
                    <button onClick={() => void remove(d.id, d.number)} className="h-7 w-7 grid place-items-center rounded hover:bg-black/[0.06]" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && drafts.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No draft orders</td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>

      {showNew && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowNew(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[92vw] bg-white z-50 rounded-lg border border-border shadow-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold text-lg">New draft</div>
              <button onClick={() => setShowNew(false)} className="h-8 w-8 grid place-items-center rounded hover:bg-black/5"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 text-[13px]">
              <input value={form.customer} onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))} placeholder="Customer name" className="w-full h-10 rounded-md border border-border px-3" />
              <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Note" className="w-full h-10 rounded-md border border-border px-3" />
              <div className="grid grid-cols-2 gap-2">
                <input value={form.items} onChange={(e) => setForm((f) => ({ ...f, items: e.target.value }))} placeholder="Items" className="w-full h-10 rounded-md border border-border px-3" />
                <input value={form.total} onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))} placeholder="Total (₦)" className="w-full h-10 rounded-md border border-border px-3" />
              </div>
              <button onClick={() => void createDraft()} className="w-full h-10 rounded-md bg-ink text-white font-semibold">Create</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
