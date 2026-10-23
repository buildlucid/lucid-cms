import { bindings, defineConfig } from "cf/config";

// Lucid adds its own entry, bindings, triggers and secrets on top of this, so only declare what Lucid doesn't manage.
export default defineConfig({
	worker: {
		name: "lucid-cloudflare",
		compatibilityDate: "2026-06-30",
		env: {
			LUCID_DB: bindings.hyperdrive({
				id: "HYPERDRIVE_ID",
				dev: {
					connectionString: "postgres://postgres:postgres@localhost:5432/lucid",
				},
			}),
		},
	},
});
