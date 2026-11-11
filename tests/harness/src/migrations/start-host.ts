import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { createInterface } from "node:readline";
import { paths } from "../utils/paths.ts";

/**
 * Starts a setup's CMS in a process of its own and waits until it answers. See `serve-host.ts`
 * for why migration tests do not run it in the test process.
 */
const startHost = async (options: {
	configPath: string;
	databaseUrl: string;
	schemaStep?: string;
}): Promise<{ url: string; stop(): Promise<void> }> => {
	const child = spawn(
		process.execPath,
		[
			path.join(paths.harness, "migrations/serve-host.ts"),
			options.configPath,
			options.databaseUrl,
			...(options.schemaStep ? [options.schemaStep] : []),
		],
		{ cwd: paths.root, stdio: ["ignore", "pipe", "pipe"] },
	);
	const exited = once(child, "close");
	let errors = "";
	child.stderr.on("data", (chunk: Buffer) => {
		errors += chunk.toString();
	});

	//* the first line it prints is its port
	const lines = createInterface({ input: child.stdout });
	const port = await Promise.race([
		once(lines, "line").then(([line]) => Number(line)),
		exited.then(() => undefined),
	]);
	if (!port) {
		throw new Error(`The CMS did not start.\n${errors}`);
	}

	return {
		url: `http://127.0.0.1:${port}`,
		stop: async () => {
			child.kill("SIGTERM");
			await exited;
		},
	};
};

export default startHost;
