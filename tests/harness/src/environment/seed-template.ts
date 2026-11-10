/**
 * Seeds a setup's migrated template database and reports what the setup can do.
 * The runner starts this in its own process, so each setup's config loads in isolation.
 *
 * Usage: node seed-template.ts <setup> <databaseUrl> <outputFile>
 */
import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import deriveCapabilities from "../capabilities/derive-capabilities.ts";
import type { Capability } from "../capabilities/types.ts";
import { ensureAdmin } from "../client/admin.ts";
import createSession from "../client/create-session.ts";
import { loadSetup } from "../setup/load-setups.ts";
import type { Setup } from "../setup/types.ts";
import bootHost, { HOST_URL } from "../targets/boot-host.ts";
import loadSetupConfig from "../targets/load-setup-config.ts";
import { writeJson } from "../utils/json.ts";

export type SeedTemplateResult = {
	capabilities: Capability[];
};

/** Creates the admin through an in-process CMS on the template, and returns the config it ran with. */
const seed = async (
	setup: Setup,
	databaseUrl: string,
): Promise<ResolvedLucidConfig> => {
	const host = await bootHost({ configPath: setup.configPath, databaseUrl });
	try {
		await ensureAdmin(
			createSession({ url: host.url, transport: host.transport }),
		);
		return host.config;
	} finally {
		await host.close();
	}
};

/** Reads the config of a setup that only runs in its own runtime. Its server seeds itself when it starts. */
const inspect = async (
	setup: Setup,
	databaseUrl: string,
): Promise<ResolvedLucidConfig> => {
	const loaded = await loadSetupConfig({
		configPath: setup.configPath,
		env: { HARNESS_DATABASE_URL: databaseUrl, HARNESS_URL: HOST_URL },
		validateEnv: false,
	});
	return loaded.config;
};

const [setupName, databaseUrl, outputFile] = process.argv.slice(2);
if (!setupName || !databaseUrl || !outputFile) {
	throw new Error("Usage: seed-template.ts <setup> <databaseUrl> <outputFile>");
}

const setup = await loadSetup(setupName);
const config = setup.modes.includes("host")
	? await seed(setup, databaseUrl)
	: await inspect(setup, databaseUrl);

await writeJson(outputFile, {
	capabilities: deriveCapabilities(config),
} satisfies SeedTemplateResult);
