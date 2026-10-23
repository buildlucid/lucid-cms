import { handle } from "virtual:lucid/astro-runtime";
import type { APIRoute } from "astro";

/** Serves Lucid's paths, which the integration routes here, with Lucid. */
export const ALL: APIRoute = (context) => handle(context);
export const prerender = false;
