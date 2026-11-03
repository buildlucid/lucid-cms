import z from "zod";
import packageJson from "../../../package.json" with { type: "json" };
import type { LatestPackage } from "./types.js";

const REGISTRY_URL = "https://registry.npmjs.org";
const TIMEOUT_MS = 3000;

const manifestSchema = z.object({
	version: z.string(),
	peerDependencies: z.record(z.string(), z.string()).optional(),
});

/** Reads a package's `latest` version on npm and the core range it needs. Returns null when npm can't be reached or doesn't have the package. */
const fetchLatestPackage = async (
	name: string,
): Promise<LatestPackage | null> => {
	try {
		const response = await fetch(`${REGISTRY_URL}/${name}/latest`, {
			headers: { accept: "application/json" },
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
		if (!response.ok) return null;

		const manifest = manifestSchema.safeParse(await response.json());
		if (!manifest.success) return null;

		return {
			version: manifest.data.version,
			requiresCore: manifest.data.peerDependencies?.[packageJson.name] ?? null,
		};
	} catch {
		return null;
	}
};

export default fetchLatestPackage;
