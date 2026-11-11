import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import loadContext from "../../environment/load-context.ts";
import { paths } from "../../utils/paths.ts";
import { STORAGE_STATE_FILE } from "./global-setup.ts";

const context = loadContext();
if (context.target.mode !== "served") {
	throw new Error("Browser tests need a served CMS.");
}

/** The config every Playwright lane runs with. Tests start signed in as the seeded admin. */
export default defineConfig({
	testDir: path.join(paths.suites, context.lane),
	outputDir: path.join(context.paths.work, "playwright"),
	globalSetup: path.join(import.meta.dirname, "global-setup.ts"),
	reporter: [["list"], [path.join(import.meta.dirname, "reporter.ts")]],
	fullyParallel: true,
	//* lanes run side by side, so each one keeps to its share of the machine
	workers: context.workers,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	use: {
		baseURL: context.target.url,
		storageState: path.join(context.paths.work, STORAGE_STATE_FILE),
		trace: "retain-on-failure",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
