import type { SiteMode, SitePluginOptions } from "@lucidcms/plugin-site";
import { react } from "@lucidcms/site-react";
import { solid } from "@lucidcms/site-solid";
import { svelte } from "@lucidcms/site-svelte";
import { vue } from "@lucidcms/site-vue";
import { functions } from "./functions/index.js";

declare module "@lucidkiln/core" {
	interface KilnGlobals {
		/** The site's public origin, such as for the OAuth client ID and redirect URIs. */
		siteUrl: string;
	}
}

const siteConfig = (env: { SITE_URL: string; SITE_MODE: SiteMode }) =>
	({
		mode: env.SITE_MODE,
		environment: "production",
		locales: ["en", "fr"],
		locale: ({ path }) => (path.split("/")[1] === "fr" ? "fr" : "en"),
		kiln: {
			timeZone: "Europe/London",
			functions,
			globals: { siteUrl: env.SITE_URL },
		},
		ui: [react(), solid({ include: ["ui/solid/**"] }), vue(), svelte()],
	}) satisfies SitePluginOptions;

export default siteConfig;
