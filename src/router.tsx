import { QueryClient } from "@tanstack/react-query";
import { createRouter, Link, useRouter, type ErrorRouteComponent } from "@tanstack/react-router";
import { useEffect } from "react";
import { routeTree } from "./routeTree.gen";
import { reportLovableError } from "./lib/lovable-error-reporting";

function DefaultNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="font-display font-bold text-[17px] tracking-[0.22em] text-gold whitespace-nowrap">ASL ORIGINALS</div>
        <div className="text-[10px] tracking-[0.4em] text-muted-foreground mt-0.5">ORIGINALS</div>
        <h1 className="mt-8 text-6xl font-display font-bold text-foreground">404</h1>
        <h2 className="mt-3 text-lg font-semibold">This page has moved on</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or is no longer available.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/" className="inline-flex h-10 px-5 items-center rounded-md bg-ink text-white text-[13px] font-semibold">Go to dashboard</Link>
          <Link to="/login" className="inline-flex h-10 px-5 items-center rounded-md border border-border text-[13px] font-semibold">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

function DefaultError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "router_default_error" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="font-display font-bold text-[17px] tracking-[0.22em] text-gold whitespace-nowrap">ASL ORIGINALS</div>
        <div className="text-[10px] tracking-[0.4em] text-muted-foreground mt-0.5">ORIGINALS</div>
        <h1 className="mt-8 text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page couldn't load. Please try again.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="inline-flex h-10 px-5 items-center rounded-md bg-ink text-white text-[13px] font-semibold">Try again</button>
          <Link to="/" className="inline-flex h-10 px-5 items-center rounded-md border border-border text-[13px] font-semibold">Go home</Link>
        </div>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultError as ErrorRouteComponent,
    defaultNotFoundComponent: DefaultNotFound,
  });

  return router;
};

