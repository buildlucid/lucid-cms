import { bindings, defineConfig } from "cf/config";

// Lucid adds its own entry, bindings, triggers and secrets on top of this.
export default defineConfig({
	worker: {
		name: "lucid-harness-cloudflare-postgres",
		compatibilityDate: "2026-06-30",
		env: {
			LUCID_DB: bindings.hyperdrive({
				id: "HARNESS_HYPERDRIVE",
				dev: {
					connectionString: process.env.HARNESS_DATABASE_URL ?? "",
				},
			}),
		},
	},
});
