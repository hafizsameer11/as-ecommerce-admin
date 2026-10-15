import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Printer, Mail, MoreHorizontal, MapPin, Truck, CreditCard, User, Clock, MessageSquare, CheckCircle2, Package } from "lucide-react";
import { useOrderById, useOrders } from "@/lib/orders-store";
import { Card, Chip, StatusPill, naira } from "./ui";

export function OrderDetail({ id }: { id: string }) {
  const ensureOrder = useOrders((s) => s.ensureOrder);
  const order = useOrderById(id);

  useEffect(() => {
    void ensureOrder(id);
  }, [ensureOrder, id]);

  if (!order) {
    return (
      <div className="p-10 max-w-[900px] mx-auto text-center">
        <div className="font-display text-2xl font-bold mb-2">Order not found</div>
        <p className="text-muted-foreground mb-6">We couldn't locate <span className="font-sans">{id}</span>.</p>
        <Link to="/orders" className="text-gold underline underline-offset-4">Back to orders</Link>
      </div>
    );
  }

  const timeline = [
    { label: "Order placed", time: order.date, done: true, icon: CheckCircle2 },
    { label: "Payment confirmed", time: order.date, done: true, icon: CreditCard },
    { label: "Preparing shipment", time: order.date, done: order.status !== "Processing" || true, icon: Package },
    { label: "Shipped", time: order.eta ? "In transit" : " - ", done: ["Shipped", "Delivered"].includes(order.status), icon: Truck },
    { label: "Delivered", time: order.eta ?? " - ", done: order.status === "Delivered", icon: CheckCircle2 },
  ];

  const paymentStatus = order.status === "Cancelled" ? "Refunded" : "Paid";

  return (
    <div className="p-6 max-w-[1300px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <Link to="/orders" className="text-[12px] text-muted-foreground flex items-center gap-1 hover:text-ink mb-2">
            <ChevronLeft className="h-3 w-3" /> All orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-[26px]">{order.id}</h1>
            <StatusPill status={order.status} />
            <Chip tone={paymentStatus === "Paid" ? "green" : "red"}>{paymentStatus}</Chip>
          </div>
          <div className="text-[12px] text-muted-foreground mt-1">
            Placed on {order.date} · {order.itemsCount} item{order.itemsCount === 1 ? "" : "s"} · via {order.payment}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] flex items-center gap-1.5 hover:bg-black/[0.04]">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] flex items-center gap-1.5 hover:bg-black/[0.04]">
            <Mail className="h-3.5 w-3.5" /> Email invoice
          </button>
          <button className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-medium hover:opacity-90">
            Fulfil order
          </button>
          <button className="h-9 w-9 grid place-items-center rounded-md border border-black/10 bg-white hover:bg-black/[0.04]">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT - items + timeline */}
        <div className="lg:col-span-2 space-y-5">
          {/* Items */}
          <Card padded={false}>
            <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <div className="font-medium">Items · {order.itemsCount}</div>
              <Chip tone={order.delivery === "ship" ? "blue" : "gold"}>{order.delivery === "ship" ? "Shipping" : "Store pickup"}</Chip>
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
                    {it.brand && <div className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{it.brand}</div>}
                    <div className="font-medium truncate">{it.name}</div>
                    <div className="text-[12px] text-muted-foreground truncate">{it.variant}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">SKU · ASL-{(idx + 1).toString().padStart(5, "0")}</div>
                  </div>
                  <div className="text-right text-[13px]">
                    <div>{naira(it.price)} × {it.qty}</div>
                    <div className="font-semibold">{naira(it.price * it.qty)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 bg-black/[0.02] border-t border-black/[0.06] space-y-1.5 text-[13px]">
              <Row label="Subtotal" value={naira(order.subtotal)} />
              {order.discount > 0 && <Row label={`Discount ${order.couponCode ? `· ${order.couponCode}` : ""}`} value={`− ${naira(order.discount)}`} accent="red" />}
              <Row label="Shipping" value={order.shipping ? naira(order.shipping) : "Free"} />
              <Row label="VAT (incl.)" value={naira(Math.round(order.total * 0.075))} muted />
              <div className="border-t border-black/[0.06] my-2" />
              <Row label="Total" value={naira(order.total)} bold />
            </div>
          </Card>

          {/* Timeline */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="font-medium">Fulfilment timeline</div>
              {order.tracking && <Chip tone="blue">DHL · {order.tracking}</Chip>}
            </div>
            <ol className="space-y-4">
              {timeline.map((t, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-full grid place-items-center shrink-0 ${t.done ? "bg-ink text-white" : "bg-black/[0.06] text-muted-foreground"}`}>
                    <t.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className={`text-[13px] ${t.done ? "font-medium text-ink" : "text-muted-foreground"}`}>{t.label}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{t.time}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {/* Notes */}
          <Card>
            <div className="font-medium mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Internal notes</div>
            <textarea
              placeholder="Add a note visible only to the team…"
              className="w-full min-h-[80px] p-3 rounded-md border border-black/10 bg-white text-[13px] focus:outline-none focus:border-ink"
            />
            <div className="mt-2 flex justify-end">
              <button className="h-8 px-3 rounded-md bg-ink text-white text-[12px] font-medium">Save note</button>
            </div>
          </Card>
        </div>

        {/* RIGHT - customer, shipping, payment */}
        <div className="space-y-5">
          <Card>
            <div className="font-medium mb-3 flex items-center gap-2"><User className="h-4 w-4" /> Customer</div>
            <div className="text-[13px] font-medium truncate">
              {order.contact?.email?.split("@")[0].replace(/[._-]+/g, " ") ?? "Guest checkout"}
            </div>
            <div className="text-[12px] text-muted-foreground truncate">{order.contact?.email ?? "no-reply@asl"}</div>
            <div className="text-[12px] text-muted-foreground">{order.contact?.phone ?? " - "}</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <Chip tone="gold">ASL Club</Chip>
              <Chip tone="neutral">12 orders lifetime</Chip>
            </div>
          </Card>

          <Card>
            <div className="font-medium mb-3 flex items-center gap-2"><MapPin className="h-4 w-4" /> Shipping address</div>
            {order.address ? (
              <div className="text-[13px] leading-relaxed">
                <div className="font-medium">{order.address.fullName}</div>
                <div>{order.address.address}</div>
                {order.address.apartment && <div>{order.address.apartment}</div>}
                <div>{order.address.city}, {order.address.state} {order.address.postal}</div>
                <div>{order.address.country}</div>
              </div>
            ) : (
              <div className="text-[12px] text-muted-foreground">No address on file (imported order).</div>
            )}
          </Card>

          <Card>
            <div className="font-medium mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payment</div>
            <div className="text-[13px] space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="capitalize">{order.payment}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Chip tone="green">{paymentStatus}</Chip></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ref</span><span className="font-sans text-[11px]">TXN-{order.id.slice(-6)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Captured</span><span>{order.date}</span></div>
            </div>
            <button className="mt-3 w-full h-9 rounded-md border border-black/10 bg-white text-[13px] hover:bg-black/[0.04]">
              Refund order
            </button>
          </Card>

          <Card>
            <div className="font-medium mb-3">Risk & fraud</div>
            <div className="flex items-center gap-2 mb-2"><Chip tone="green">Low risk</Chip><span className="text-[11px] text-muted-foreground">Signals scanned</span></div>
            <ul className="text-[12px] text-muted-foreground space-y-1">
              <li>✓ AVS match</li>
              <li>✓ Device fingerprint recognised</li>
              <li>✓ IP · billing country match</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, muted, accent }: { label: string; value: string; bold?: boolean; muted?: boolean; accent?: "red" }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`${bold ? "font-semibold text-[15px]" : ""} ${accent === "red" ? "text-rose-600" : ""}`}>{value}</span>
    </div>
  );
}
