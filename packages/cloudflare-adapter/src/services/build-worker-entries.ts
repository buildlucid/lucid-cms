import { build } from "rolldown";
import {
	stripAdapterExportPlugin,
	stripImportsPlugin,
} from "@lucidcms/core/helpers";

const buildWorkerEntries = async (
	inputs: Record<string, string>,
	outputPath: string,
): Promise<void> => {
	await Promise.all(
		Object.entries(inputs).map(([key, inputPath]) =>
			build({
				input: { [key]: inputPath },
				output: {
					dir: outputPath,
					format: "esm" as const,
					minify: true,
					inlineDynamicImports: true,
				},
				treeshake: true,
				platform: "node" as const,
				plugins: [
					{
						name: "import-meta-polyfill",
						renderChunk(code: string) {
							return code.replace(/import\.meta\.url/g, '"file:///server.js"');
						},
					},
					stripAdapterExportPlugin("cloudflareAdapter"),
					stripImportsPlugin("cloudflare-adapter", [
						"wrangler",
						"@hono/node-server",
						"@hono/node-server/serve-static",
						"rolldown",
					]),
				],
				external: ["sharp", "ws", "better-sqlite3", "file-type"],
			}),
		),
	);
};

export default buildWorkerEntries;
