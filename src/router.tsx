import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();
  const convexUrl = import.meta.env["VITE_CONVEX_URL"];
  const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    Wrap: ({ children }) =>
      convexClient ? (
        <ConvexAuthProvider client={convexClient}>{children}</ConvexAuthProvider>
      ) : (
        children
      ),
  });

  return router;
};
