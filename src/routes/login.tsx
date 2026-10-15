import { useState } from "react";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { ADMIN_ROLES, useAdmin } from "@/lib/admin-role-store";
import { Lock } from "lucide-react";
import wordmarkWhite from "@/assets/ASL_wordmark_white.png.asset.json";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · ASL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (useAdmin.getState().isSignedIn) throw redirect({ to: "/" });
  },
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const nav = useNavigate();
  const { signIn, setRole } = useAdmin();
  const [email, setEmail] = useState("admin@asloriginals.com");
  const [password, setPassword] = useState("ChangeMe123!");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      nav({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-[#f7f5ef]">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-ink text-white relative overflow-hidden">
        <div className="relative z-10">
          <img src={wordmarkWhite.url} alt="ASL ORIGINALS" className="h-[18px] w-auto object-contain" />
          <div className="text-[10px] tracking-[0.4em] text-white/60 mt-1">ADMIN</div>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="font-display font-bold text-4xl leading-tight">
            The operational cockpit for a luxury house.
          </h1>
          <p className="mt-4 text-white/70 text-sm leading-relaxed">
            Orders, concierge sourcing, catalog, marketing, finance - all in one place.
            Calm surfaces, dense data, gold where it matters.
          </p>
        </div>
        <div className="relative z-10 text-[11px] text-white/40 tracking-[0.15em] uppercase">
          Prototype · v1.0
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-gold/10 to-transparent" />
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm bg-white border border-border rounded-lg p-8">
          <div className="mb-6">
            <div className="h-10 w-10 rounded-lg bg-gold/15 text-gold grid place-items-center mb-4">
              <Lock className="h-4 w-4" />
            </div>
            <h2 className="font-display font-bold text-2xl">Sign in to Admin</h2>
            <p className="text-[12.5px] text-muted-foreground mt-1">
              Prototype - any email works. Pick a persona to shape your view.
            </p>
          </div>

          <label className="block mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/40"
              type="email"
              required
            />
          </label>

          <label className="block mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/40"
              type="password"
              required
            />
          </label>

          <label className="block mb-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Sign in as</span>
            <select
              onChange={(e) => setRole(e.target.value as any)}
              defaultValue="super_admin"
              className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              {ADMIN_ROLES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </label>

          {error && (
            <p className="mb-3 text-[12px] text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-md bg-ink text-white font-semibold text-[13px] hover:bg-ink/90 disabled:opacity-50"
          >
            Sign in
          </button>

          <div className="mt-6 text-[11px] text-muted-foreground text-center">
            ASL ORIGINALS admin console
          </div>
        </form>
      </div>
    </div>
  );
}
