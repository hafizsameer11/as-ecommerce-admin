import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ChevronLeft,
  Printer,
  Mail,
  MapPin,
  Truck,
  CreditCard,
  User,
  Clock,
  MessageSquare,
  Package,
  Loader2,
} from "lucide-react";
import { useOrderById, useOrders } from "@/lib/orders-store";
import { ordersAdminApi } from "@/lib/api/orders";
import { apiBaseUrl, errorMessage, loadTokens } from "@/lib/api/client";
import { Card, Chip, StatusPill, naira } from "./ui";

function paymentLabel(order: NonNullable<ReturnType<typeof useOrderById>>) {
  const ps = (order.paymentStatus || "").toLowerCase();
  if (ps.includes("pending") || ps.includes("await")) return "Awaiting payment";
  if (ps.includes("refund")) return "Refunded";
  if (ps.includes("partial")) return "Partially paid";
  if (ps.includes("paid") || ps.includes("capture")) return "Paid";
  if (order.rawStatus?.toLowerCase().includes("pending_payment")) return "Awaiting payment";
  if (order.status === "Cancelled") return "Cancelled";
  return order.paymentStatus || "Unknown";
}

function paymentTone(label: string): "green" | "red" | "amber" | "neutral" {
  if (label === "Paid") return "green";
  if (label === "Awaiting payment" || label === "Partially paid") return "amber";
  if (label === "Refunded" || label === "Cancelled") return "red";
  return "neutral";
}

async function openOrderPdf(apiId: string, suffix: string, filename: string) {
  const url = `${apiBaseUrl()}/api/v1/admin/orders/${encodeURIComponent(apiId)}${suffix}`;
  const tokens = loadTokens();
  const headers: Record<string, string> = {};
  if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`;
  const res = await fetch(url, { credentials: "include", headers });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j?.error?.message ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg || "Could not download PDF");
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

export function OrderDetail({ id }: { id: string }) {
  const ensureOrder = useOrders((s) => s.ensureOrder);
  const order = useOrderById(id);
  const [loading, setLoading] = useState(true);
  const [noteDraft, setNoteDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void ensureOrder(id)
      .catch((err: unknown) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Failed to load order");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ensureOrder, id]);

  const apiId = order?.apiId ?? id;

  const run = async (key: string, fn: () => Promise<void>, success: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(success);
      await ensureOrder(id);
    } catch (err) {
      toast.error(errorMessage(err, "Action failed"));
    } finally {
      setBusy(null);
    }
  };

  if (loading && !order) {
    return (
      <div className="p-10 max-w-[900px] mx-auto text-center text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading order…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-10 max-w-[900px] mx-auto text-center">
        <div className="font-display text-2xl font-bold mb-2">Order not found</div>
        <p className="text-muted-foreground mb-6">
          We couldn't locate <span className="font-sans">{id}</span>.
        </p>
        <Link to="/orders" className="text-gold underline underline-offset-4">
          Back to orders
        </Link>
      </div>
    );
  }

  const payLabel = paymentLabel(order);
  const payTone = paymentTone(payLabel);
  const showMarkPaid =
    payLabel === "Awaiting payment" ||
    (order.rawStatus || "").toLowerCase().includes("pending_payment");

  const timeline =
    order.timeline.length > 0
      ? order.timeline
      : [
          { at: order.date, label: "Order placed", done: true },
          ...(payLabel === "Paid"
            ? [{ at: order.date, label: "Payment confirmed", done: true }]
            : []),
        ];

  const primaryPayment = order.payments[0];

  return (
    <div className="p-6 max-w-[1300px] mx-auto">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <Link to="/orders" className="text-[12px] text-muted-foreground flex items-center gap-1 hover:text-ink mb-2">
            <ChevronLeft className="h-3 w-3" /> All orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-[26px]">{order.id}</h1>
            <StatusPill status={order.status} />
            <Chip tone={payTone}>{payLabel}</Chip>
          </div>
          <div className="text-[12px] text-muted-foreground mt-1">
            Placed on {order.date} · {order.itemsCount} item{order.itemsCount === 1 ? "" : "s"} · via {order.payment}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            disabled={!!busy}
            onClick={() =>
              void run("print", () => openOrderPdf(apiId, "/packing-slip.pdf", `${order.id}-packing-slip.pdf`), "Packing slip downloaded")
            }
            className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] flex items-center gap-1.5 hover:bg-black/[0.04] disabled:opacity-50"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() =>
              void run("email", async () => {
                await ordersAdminApi.emailInvoice(apiId);
              }, "Invoice email queued")
            }
            className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] flex items-center gap-1.5 hover:bg-black/[0.04] disabled:opacity-50"
          >
            <Mail className="h-3.5 w-3.5" /> Email invoice
          </button>
          {showMarkPaid && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() =>
                void run("markPaid", async () => {
                  await ordersAdminApi.markPaid(apiId);
                }, "Order marked as paid")
              }
              className="h-9 px-3 rounded-md border border-gold bg-gold/10 text-[13px] font-medium hover:bg-gold/20 disabled:opacity-50"
            >
              Mark paid
            </button>
          )}
          <button
            type="button"
            disabled={!!busy}
            onClick={() =>
              void run("fulfil", async () => {
                await ordersAdminApi.fulfill(apiId);
              }, "Fulfilment started")
            }
            className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
          >
            Fulfil order
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card padded={false}>
            <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <div className="font-medium">Items · {order.itemsCount}</div>
              <Chip tone={order.delivery === "ship" ? "blue" : "gold"}>
                {order.delivery === "ship" ? "Shipping" : "Store pickup"}
              </Chip>
            </div>
            <div className="divide-y divide-black/[0.06]">
              {order.items.map((it, idx) => (
                <div key={idx} className="p-4 flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg bg-[#f2f2f2] overflow-hidden shrink-0 grid place-items-center">
                    {it.image ? (
                      <img src={it.image} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {it.brand && (
                      <div className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
                        {it.brand}
                      </div>
                    )}
                    <div className="font-medium truncate">{it.name}</div>
                    <div className="text-[12px] text-muted-foreground truncate">{it.variant}</div>
                    {it.sku && (
                      <div className="text-[11px] text-muted-foreground mt-1">SKU · {it.sku}</div>
                    )}
                  </div>
                  <div className="text-right text-[13px]">
                    <div>
                      {naira(it.price)} × {it.qty}
                    </div>
                    <div className="font-semibold">{naira(it.price * it.qty)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 bg-black/[0.02] border-t border-black/[0.06] space-y-1.5 text-[13px]">
              <Row label="Subtotal" value={naira(order.subtotal)} />
              {order.discount > 0 && (
                <Row
                  label={`Discount ${order.couponCode ? `· ${order.couponCode}` : ""}`}
                  value={`− ${naira(order.discount)}`}
                  accent="red"
                />
              )}
              <Row label="Shipping" value={order.shipping ? naira(order.shipping) : "Free"} />
              {order.tax > 0 && <Row label="Tax" value={naira(order.tax)} muted />}
              <div className="border-t border-black/[0.06] my-2" />
              <Row label="Total" value={naira(order.total)} bold />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="font-medium">Fulfilment timeline</div>
              {order.tracking && <Chip tone="blue">{order.tracking}</Chip>}
            </div>
            <ol className="space-y-4">
              {timeline.map((t, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div
                    className={`h-8 w-8 rounded-full grid place-items-center shrink-0 ${
                      t.done !== false ? "bg-ink text-white" : "bg-black/[0.06] text-muted-foreground"
                    }`}
                  >
                    {i === 0 ? <Clock className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <div
                      className={`text-[13px] ${t.done !== false ? "font-medium text-ink" : "text-muted-foreground"}`}
                    >
                      {t.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t.at}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <div className="font-medium mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Internal notes
            </div>
            {order.notes.length > 0 && (
              <ul className="mb-3 space-y-2 max-h-40 overflow-y-auto">
                {order.notes.map((n) => (
                  <li key={n.id} className="text-[12px] bg-black/[0.03] rounded-md p-2">
                    <div className="text-muted-foreground text-[11px]">
                      {n.author} · {new Date(n.at).toLocaleString()}
                    </div>
                    <div className="mt-0.5">{n.body}</div>
                  </li>
                ))}
              </ul>
            )}
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Add a note visible only to the team…"
              className="w-full min-h-[80px] p-3 rounded-md border border-black/10 bg-white text-[13px] focus:outline-none focus:border-ink"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={!noteDraft.trim() || !!busy}
                onClick={() =>
                  void run(
                    "note",
                    async () => {
                      await ordersAdminApi.addOrderNote(apiId, noteDraft.trim());
                      setNoteDraft("");
                    },
                    "Note saved",
                  )
                }
                className="h-8 px-3 rounded-md bg-ink text-white text-[12px] font-medium disabled:opacity-50"
              >
                Save note
              </button>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <div className="font-medium mb-3 flex items-center gap-2">
              <User className="h-4 w-4" /> Customer
            </div>
            <div className="text-[13px] font-medium truncate">
              {order.customer?.name ?? order.contact?.email?.split("@")[0] ?? "Guest checkout"}
            </div>
            <div className="text-[12px] text-muted-foreground truncate">
              {order.customer?.email ?? order.contact?.email ?? "—"}
            </div>
            <div className="text-[12px] text-muted-foreground">
              {order.customer?.phone ?? order.contact?.phone ?? "—"}
            </div>
            {(order.customer?.tier || order.customer?.orders != null) && (
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                {order.customer?.tier && <Chip tone="gold">{order.customer.tier}</Chip>}
                {order.customer?.orders != null && (
                  <Chip tone="neutral">{order.customer.orders} orders lifetime</Chip>
                )}
              </div>
            )}
          </Card>

          <Card>
            <div className="font-medium mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Shipping address
            </div>
            {order.address ? (
              <div className="text-[13px] leading-relaxed">
                <div className="font-medium">{order.address.fullName}</div>
                <div>{order.address.address}</div>
                {order.address.apartment && <div>{order.address.apartment}</div>}
                <div>
                  {order.address.city}, {order.address.state} {order.address.postal}
                </div>
                <div>{order.address.country}</div>
              </div>
            ) : (
              <div className="text-[12px] text-muted-foreground">No address on file.</div>
            )}
          </Card>

          <Card>
            <div className="font-medium mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Payment
            </div>
            <div className="text-[13px] space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="capitalize">{primaryPayment?.method ?? order.payment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Chip tone={payTone}>{payLabel}</Chip>
              </div>
              {primaryPayment?.ref && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ref</span>
                  <span className="font-sans text-[11px]">{primaryPayment.ref}</span>
                </div>
              )}
              {order.amountPaid != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span>{naira(order.amountPaid)}</span>
                </div>
              )}
              {order.due != null && order.due > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due</span>
                  <span>{naira(order.due)}</span>
                </div>
              )}
              {order.amountRefunded != null && order.amountRefunded > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Refunded</span>
                  <span>{naira(order.amountRefunded)}</span>
                </div>
              )}
              {primaryPayment?.capturedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Captured</span>
                  <span>{new Date(primaryPayment.capturedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
            {order.payments.length > 1 && (
              <ul className="mt-3 pt-3 border-t border-black/[0.06] text-[11px] space-y-1">
                {order.payments.slice(1).map((p, i) => (
                  <li key={p.id ?? i} className="flex justify-between text-muted-foreground">
                    <span>{p.method ?? "Payment"}</span>
                    <span>{naira(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                disabled={!!busy}
                onClick={() => {
                  const reason = window.prompt("Refund reason (required, min 3 characters):", "Customer requested refund");
                  if (!reason?.trim()) return;
                  if (reason.trim().length < 3) {
                    toast.error("Refund reason must be at least 3 characters.");
                    return;
                  }
                  const toWallet = window.confirm("Refund to ASL Wallet?\n\nOK = wallet\nCancel = original payment method");
                  void run(
                    "refund",
                    async () => {
                      await ordersAdminApi.refund(apiId, {
                        reason: reason.trim(),
                        to: toWallet ? "wallet" : "original",
                        restock: ["paid", "processing"].includes((order.rawStatus || "").toLowerCase()),
                      });
                    },
                    "Refund submitted",
                  );
                }}
                className="w-full h-9 rounded-md border border-black/10 bg-white text-[13px] hover:bg-black/[0.04] disabled:opacity-50"
              >
                Refund order
              </button>
              <button
                type="button"
                disabled={!!busy || order.status === "Cancelled"}
                onClick={() => {
                  const reason = window.prompt("Cancellation reason (shown to customer):", "Cancelled by admin");
                  if (!reason?.trim()) return;
                  void run(
                    "cancel",
                    async () => {
                      await ordersAdminApi.cancel(apiId, { reason: reason.trim(), refundTo: "original" });
                    },
                    "Order cancelled",
                  );
                }}
                className="w-full h-9 rounded-md border border-rose-200 text-rose-700 text-[13px] hover:bg-rose-50 disabled:opacity-50"
              >
                Cancel order
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  accent?: "red";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`${bold ? "font-semibold text-[15px]" : ""} ${accent === "red" ? "text-rose-600" : ""}`}>
        {value}
      </span>
    </div>
  );
}
