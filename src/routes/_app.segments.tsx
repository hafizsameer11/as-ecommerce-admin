import { createFileRoute } from "@tanstack/react-router";
import { AdminSegments } from "@/components/admin/AdminSegments";

export const Route = createFileRoute("/_app/segments")({
  head: () => ({
    meta: [
      { title: "Segments · ASL Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSegments,
});
