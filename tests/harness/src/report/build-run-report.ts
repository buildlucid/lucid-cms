import { execFileSync } from "node:child_process";
import path from "node:path";
import { paths } from "../utils/paths.ts";
import findMismatches from "./find-mismatches.ts";
import findNeverRan from "./find-never-ran.ts";
import summarize from "./summarize.ts";
import { type LaneReport, REPORT_VERSION, type RunReport } from "./types.ts";

/** Asks git a question about the checkout, or returns null outside a repository. */
const git = (...args: string[]): string | null => {
	try {
		return execFileSync("git", args, {
			cwd: paths.root,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		return null;
	}
};

/** Shortens paths inside this repository to start at its root, so reports read the same on any machine. */
const shorten = (text: string): string =>
	text.replaceAll(`${paths.repository}${path.sep}`, "");

const withoutLocalPaths = (lane: LaneReport): LaneReport => ({
	...lane,
	errors: lane.errors.map(shorten),
	tests: lane.tests.map((test) => ({
		...test,
		errors: test.errors.map(shorten),
	})),
});

/** Gathers lane runs into the report for a whole run. */
const buildRunReport = (options: {
	runId: string;
	startedAt: Date;
	/** Defaults to the time since `startedAt`. */
	durationMs?: number;
	seed: number;
	lanes: LaneReport[];
	/** Whether the run was cancelled. */
	stopped?: boolean;
	/** Whether the run covered every setup, lane and mode, so a test that applied nowhere is worth flagging. */
	complete: boolean;
}): RunReport => ({
	version: REPORT_VERSION,
	runId: options.runId,
	startedAt: options.startedAt.toISOString(),
	durationMs: options.durationMs ?? Date.now() - options.startedAt.getTime(),
	seed: options.seed,
	git: {
		commit: git("rev-parse", "HEAD"),
		branch: git("rev-parse", "--abbrev-ref", "HEAD"),
	},
	node: process.version,
	ci: Boolean(process.env.CI),
	...(options.stopped ? { stopped: true } : {}),
	lanes: options.lanes.map(withoutLocalPaths),
	mismatches: findMismatches(options.lanes),
	neverRan: options.complete ? findNeverRan(options.lanes) : [],
	summary: summarize(options.lanes),
});

export default buildRunReport;
