import { createFileRoute } from "@tanstack/react-router";
import { AdminWallets } from "@/components/admin/AdminWallets";

export const Route = createFileRoute("/_app/wallets")({
  head: () => ({
    meta: [
      { title: "Wallets & Credits · Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminWallets,
});
