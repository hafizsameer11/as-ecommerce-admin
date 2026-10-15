import { createFileRoute } from "@tanstack/react-router";
import { AdminBlog } from "@/components/admin/AdminBlog";

export const Route = createFileRoute("/_app/blog")({
  head: () => ({
    meta: [
      { title: "Blog · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminBlog,
});
