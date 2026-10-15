import { createFileRoute } from "@tanstack/react-router";
import { OrderDetail } from "@/components/admin/OrderDetail";

export const Route = createFileRoute("/_app/orders/$id")({
  head: ({ params }) => ({
    meta: [{ title: `${params.id} · ASL Admin` }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: OrderDetailRoute,
});

function OrderDetailRoute() {
  const { id } = Route.useParams();
  return <OrderDetail id={id} />;
}
