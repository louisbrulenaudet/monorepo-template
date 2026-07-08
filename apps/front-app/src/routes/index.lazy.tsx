import { createLazyFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/pages/HomePage";

export const Route = createLazyFileRoute("/")({
  component: HomePage,
});
