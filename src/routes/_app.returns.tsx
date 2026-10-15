import { createFileRoute } from "@tanstack/react-router";
import { ReturnsPage } from "@/components/admin/Returns";

export const Route = createFileRoute("/_app/returns")({
  head: () => ({ meta: [{ title: "Returns · ASL Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: ReturnsPage,
});
