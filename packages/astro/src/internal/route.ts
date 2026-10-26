import lucid from "lucid:hosted";
import type { APIRoute } from "astro";

/** Serves Lucid's paths, which the integration routes here, with Lucid. */
export const ALL: APIRoute = ({ request }) => lucid.handle(request);
export const prerender = false;
