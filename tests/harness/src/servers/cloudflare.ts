import path from "node:path";
import { paths } from "../utils/paths.ts";
import { startCommand } from "../utils/run-command.ts";
import type { ServerLauncher } from "./types.ts";

/**
 * Runs the built Worker in workerd through `lucidcms serve`, which also builds it.
 * The setup's config reads its port from `HARNESS_PORT`.
 */
const OUTPUT = ".cloudflare/output/v0/workers/default";

const MINUTE_MS = 60_000;

/**
 * Fires the Worker's cron trigger at the start of every minute, as Cloudflare does once deployed.
 * workerd never fires cron triggers by itself; it only runs `scheduled` when asked at this path.
 * Its local queue sends one batch at a time, so a job that runs for long holds up every other
 * test's jobs on the served Worker.
 */
const startCronTrigger = (port: number) => {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const next = () => {
		timer = setTimeout(fire, MINUTE_MS - (Date.now() % MINUTE_MS));
	};
	const fire = () => {
		const time = Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
		//* before the server is ready, or while it stops, there is nothing to tell
		fetch(
			`http://127.0.0.1:${port}/cdn-cgi/local/scheduled?cron=${encodeURIComponent("* * * * *")}&time=${time}`,
		).catch(() => undefined);
		next();
	};
	next();
	return () => clearTimeout(timer);
};

const cloudflareLauncher: ServerLauncher = {
	output: { root: OUTPUT, assets: `${OUTPUT}/assets` },
	build: async () => {},
	start: async (options) => {
		const running = await startCommand({
			command: path.join(paths.bin, "lucidcms"),
			args: ["serve"],
			cwd: options.setup.directory,
			env: {
				...options.env,
				HARNESS_PORT: String(options.port),
				CI: "true",
			},
			output: options.log,
		});
		const stopCron = startCronTrigger(options.port);
		return {
			exit: running.exit.finally(stopCron),
			stop: async () => {
				stopCron();
				await running.stop();
			},
		};
	},
};

export default cloudflareLauncher;
