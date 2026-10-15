import { createFileRoute } from "@tanstack/react-router";
import { AdminCollections } from "@/components/admin/AdminCollections";

export const Route = createFileRoute("/_app/collections")({
  head: () => ({
    meta: [
      { title: "Collections · ASL Admin" },
      { name: "description", content: "Curate collections, hero slots and smart product groupings." },
    ],
  }),
  component: AdminCollections,
});
