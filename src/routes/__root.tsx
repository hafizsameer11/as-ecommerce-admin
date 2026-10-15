import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorRouteComponent,
} from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-4">
      <div className="max-w-md text-center">
        <div className="font-display font-bold text-[17px] tracking-[0.22em] text-gold whitespace-nowrap">
          ASL ORIGINALS
        </div>
        <div className="text-[10px] tracking-[0.4em] text-muted-foreground mt-0.5">ADMIN</div>
        <h1 className="mt-8 text-6xl font-display font-bold text-foreground">404</h1>
        <h2 className="mt-3 text-lg font-semibold">This page has moved on</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or is no longer available.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            to="/"
            className="inline-flex h-10 px-5 items-center rounded-md bg-ink text-white text-[13px] font-semibold"
          >
            Go to dashboard
          </Link>
          <Link
            to="/login"
            className="inline-flex h-10 px-5 items-center rounded-md border border-border text-[13px] font-semibold"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-4">
      <div className="max-w-md text-center">
        <div className="font-display font-bold text-[17px] tracking-[0.22em] text-gold whitespace-nowrap">
          ASL ORIGINALS
        </div>
        <div className="text-[10px] tracking-[0.4em] text-muted-foreground mt-0.5">ADMIN</div>
        <h1 className="mt-8 text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page couldn't load. Please try again or head back to the dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex h-10 px-5 items-center rounded-md bg-ink text-white text-[13px] font-semibold"
          >
            Try again
          </button>
          <Link
            to="/"
            className="inline-flex h-10 px-5 items-center rounded-md border border-border text-[13px] font-semibold"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ASL Admin - Operational Cockpit" },
      {
        name: "description",
        content: "ASL ORIGINALS admin portal for orders, concierge, catalog and operations.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap",
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent as ErrorRouteComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function ClientToaster() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <Toaster position="top-center" /> : null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    void import("@/lib/admin-role-store").then(({ useAdmin }) => {
      void import("@/lib/api/client").then(({ setApiUnauthorizedHandler }) => {
        setApiUnauthorizedHandler(() => {
          void import("@/lib/api/client").then(({ saveTokens }) => saveTokens(null));
          void useAdmin.getState().signOut();
          window.location.assign("/login");
        });
      });
      void useAdmin.getState().bootstrap();
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
      <ClientToaster />
    </QueryClientProvider>
  );
}
