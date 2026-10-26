import { withLucid } from "@lucidcms/runtime-cloudflare/config";
import { bindings, defineConfig } from "cf/config";

// `withLucid` wraps Astro's Worker and adds Lucid's triggers, bindings and secrets, so only declare what Lucid doesn't
// manage.
export default defineConfig({
	worker: withLucid({
		name: "lucidcms-astro-cloudflare-playground",
		compatibilityDate: "2026-06-30",
		entrypoint: "@astrojs/cloudflare/entrypoints/server",
		env: {
			BUILDLUCID_CMS_DB: bindings.hyperdrive({
				id: "HYPERDRIVE_ID",
				dev: {
					connectionString:
						"postgres://postgres:postgres@localhost:5432/lucid_astro_cloudflare_playground",
				},
			}),
		},
	}),
});
