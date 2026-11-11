import pc from "picocolors";
import stringWidth from "string-width";
import fitText from "../utils/fit-text.ts";
import formatDuration from "../utils/format-duration.ts";
import type { FinishedTest, JobState, RunState } from "./types.ts";

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
/** A running job that has reported nothing for this long is flagged, as it may be stuck. */
export const QUIET_MS = 30_000;
/** Below this width the two columns stack. */
const SIDE_BY_SIDE_WIDTH = 110;
const LEFT_WIDTH = 62;
const DIVIDER = pc.dim(" │ ");
const MAX_FAILURES = 4;

type Frame = {
	/** The terminal's size. */
	width: number;
	height: number;
	now: number;
};

const spin = (now: number): string =>
	SPINNER[Math.floor(now / 80) % SPINNER.length] ?? "·";

/** A test's file and full name as people read them. */
export const describeTest = (test: { file: string; name: string }): string =>
	`${test.file} › ${test.name.replaceAll(" > ", " › ")}`;

/** A test's name with its file's short name before it, for narrow columns. */
const describeTestBriefly = (test: { file: string; name: string }): string => {
	const file = test.file
		.split("/")
		.at(-1)
		?.replace(/\.(test|spec|bench)\.ts$/, "");
	return `${pc.dim(`${file} ›`)} ${test.name.split(" > ").at(-1)}`;
};

/** A job's test count, marked while some files' tests are still unknown. */
const describeCount = (job: JobState): string => {
	const total = job.tests.total > 0 ? String(job.tests.total) : "?";
	const more =
		job.files.total === undefined || job.files.collected < job.files.total;
	return `${job.tests.done}/${total}${more && job.tests.total > 0 ? "+" : ""}`;
};

const elapsed = (from: number | undefined, to: number): string =>
	from === undefined ? "" : formatDuration(to - from);

const isActive = (job: JobState) =>
	job.status === "preparing" || job.status === "running";

const icon = (job: JobState, now: number): string => {
	switch (job.status) {
		case "waiting": {
			return pc.dim("◌");
		}
		case "preparing": {
			return pc.dim(spin(now));
		}
		case "running": {
			return pc.cyan(spin(now));
		}
		case "passed": {
			return pc.green("✓");
		}
		case "failed": {
			return pc.red("✗");
		}
	}
};

/** What a finished job's results came to, such as `71 passed · 3 n/a`. */
export const describeResult = (job: JobState): string => {
	const { result } = job;
	if (!result) {
		return "";
	}
	const { summary } = result;
	return [
		summary.failed > 0 ? pc.red(`${summary.failed} failed`) : null,
		summary.applicable > 0 ? `${summary.passed} passed` : null,
		summary.skipped > 0 ? pc.yellow(`${summary.skipped} skipped`) : null,
		summary.notApplicable > 0 ? pc.dim(`${summary.notApplicable} n/a`) : null,
		result.measurements > 0 ? `${result.measurements} measurements` : null,
		result.errors.length > 0
			? pc.red(
					`${result.errors.length} error${result.errors.length > 1 ? "s" : ""}`,
				)
			: null,
	]
		.filter((part) => part !== null)
		.join(pc.dim(" · "));
};

/** The counts and time beside a job, which say how far it has got. */
const describeJob = (job: JobState, now: number): string => {
	switch (job.status) {
		case "waiting": {
			return pc.dim("waiting");
		}
		case "preparing": {
			return pc.dim(job.phase ?? "preparing");
		}
		case "running": {
			const quiet = job.activeAt !== undefined && now - job.activeAt > QUIET_MS;
			return [
				describeCount(job),
				job.tests.failed > 0 ? pc.red(`${job.tests.failed} failed`) : null,
				quiet
					? pc.yellow(`quiet for ${elapsed(job.activeAt, now)}`)
					: pc.dim(
							`${elapsed(job.startedAt, now)}${job.previousMs ? ` of ~${formatDuration(job.previousMs)}` : ""}`,
						),
			]
				.filter((part) => part !== null)
				.join(pc.dim(" · "));
		}
		case "passed":
		case "failed": {
			return `${describeResult(job)} ${pc.dim(elapsed(job.startedAt, job.finishedAt ?? now))}`;
		}
	}
};

const setupIcon = (jobs: readonly JobState[], now: number): string => {
	if (jobs.some((job) => job.status === "failed")) {
		return pc.red("✗");
	}
	if (jobs.some(isActive)) {
		return pc.cyan(spin(now));
	}
	if (jobs.every((job) => job.status === "passed")) {
		return pc.green("✓");
	}
	return pc.dim("◌");
};

/** The left column: each setup and its lanes. */
const renderRun = (state: RunState, now: number, width: number): string[] => {
	const lines: string[] = [];
	for (const [setup, jobs] of Map.groupBy(state.jobs, (job) => job.setup)) {
		const started = Math.min(...jobs.map((job) => job.startedAt ?? Infinity));
		const done = jobs.every((job) => job.finishedAt !== undefined);
		const ended = done
			? Math.max(...jobs.map((job) => job.finishedAt ?? 0))
			: now;
		lines.push(
			`${setupIcon(jobs, now)} ${fitText(pc.bold(setup), width - 12)}${pc.dim(Number.isFinite(started) ? elapsed(started, ended).padStart(9) : "")}`,
		);
		for (const job of jobs) {
			lines.push(
				`  ${icon(job, now)} ${fitText(`${job.lane} ${pc.dim(job.mode)}`, 20)} ${fitText(describeJob(job, now), width - 25)}`,
			);
		}
		lines.push("");
	}
	return lines;
};

/** How much faster or slower a test ran than last time, when the change is worth showing. */
const describeChange = (test: FinishedTest): string => {
	if (test.previousMs === undefined) {
		return "";
	}
	const change = test.durationMs - test.previousMs;
	if (Math.abs(change) < 1000 || Math.abs(change) < test.previousMs * 0.2) {
		return "";
	}
	const text = `${change > 0 ? "+" : "−"}${formatDuration(Math.abs(change))} vs last run`;
	return change > 0 ? pc.yellow(text) : pc.green(text);
};

const heading = (text: string) => pc.bold(pc.dim(text.toUpperCase()));

/** Breaks plain text into lines no wider than `width`, at spaces. */
const wrap = (text: string, width: number): string[] => {
	const lines: string[] = [];
	let line = "";
	for (const word of text.split(" ")) {
		if (line && line.length + word.length + 1 > width) {
			lines.push(line);
			line = word;
		} else {
			line = line ? `${line} ${word}` : word;
		}
	}
	return [...lines, line];
};

/** The right column: what is running now, what failed and what was slow. */
const renderDetail = (
	state: RunState,
	now: number,
	width: number,
	rows: number,
): string[] => {
	const running = state.jobs
		.flatMap((job) => job.running.map((test) => ({ job, test })))
		.sort((a, b) => a.test.startedAt - b.test.startedAt);
	const failures = state.jobs.flatMap((job) =>
		(job.result?.errors ?? []).map((error) => ({
			title: `${job.setup} ${job.lane} ${job.mode}`,
			error,
		})),
	);
	failures.push(
		...state.failures.map((test) => ({
			title: `${test.job.split("/")[0]} ${describeTest(test)}`,
			error: test.error ?? "",
		})),
	);

	const failed: string[] = [];
	if (failures.length > 0) {
		failed.push("", heading(`Failed (${failures.length})`));
		for (const failure of failures.slice(-MAX_FAILURES)) {
			failed.push(
				`${pc.red("✗")} ${fitText(failure.title, width - 2, "middle")}`,
				`  ${pc.dim(fitText(failure.error, width - 2))}`,
			);
		}
	}

	const slowest: string[] = [];
	if (state.slowest.length > 0) {
		slowest.push("", heading("Slowest so far"));
		for (const test of state.slowest) {
			const change = describeChange(test);
			const time = formatDuration(test.durationMs).padStart(6);
			slowest.push(
				`${time}  ${fitText(describeTestBriefly(test), width - 8 - (change ? stringWidth(change) + 2 : 0))}${change ? `  ${change}` : ""}`,
			);
		}
	}

	//* running tests fill whatever room the other sections leave
	const room = Math.max(1, rows - 1 - failed.length - slowest.length);
	const active: string[] = [heading(`Running now (${running.length})`)];
	if (running.length === 0) {
		active.push(pc.dim("nothing yet"));
	}
	for (const { job, test } of running.slice(0, room)) {
		const progress = test.progress
			? `${test.progress.done}/${test.progress.total} `
			: "";
		const time = `${progress}${elapsed(test.startedAt, now)}`;
		active.push(
			`${pc.dim(fitText(job.setup, 20))} ${fitText(describeTestBriefly(test), width - 32)} ${pc.dim(time.padStart(10))}`,
		);
	}
	if (running.length > room) {
		active.push(pc.dim(`… and ${running.length - room} more`));
	}

	return [...active, ...failed, ...slowest];
};

/** The first lines: what is running, for how long, and how long is left. */
const renderHeader = (
	state: RunState,
	now: number,
	width: number,
): string[] => {
	const done = state.jobs.filter((job) => job.finishedAt !== undefined).length;
	const ran = now - state.startedAt;
	const left =
		state.previousMs !== undefined && !state.finishedAt
			? state.previousMs - ran
			: undefined;
	const title = `${pc.bold("Lucid harness")} ${pc.dim(`· ${state.profile} · seed ${state.seed}`)}`;
	const timing = [
		`${formatDuration(ran)} elapsed`,
		left === undefined
			? null
			: left > 0
				? `about ${formatDuration(left)} left`
				: pc.yellow(
						`longer than last run's ${formatDuration(state.previousMs ?? 0)}`,
					),
		`${done}/${state.jobs.length} lanes`,
	]
		.filter((part) => part !== null)
		.join(pc.dim(" · "));

	const share =
		state.previousMs !== undefined
			? Math.min(ran / state.previousMs, 0.99)
			: done / Math.max(1, state.jobs.length);
	const barWidth = Math.max(10, width - 2);
	const filled = Math.round((state.finishedAt ? 1 : share) * barWidth);
	const bar = `${pc.cyan("━".repeat(filled))}${pc.dim("─".repeat(barWidth - filled))}`;

	const gap = Math.max(2, width - stringWidth(title) - stringWidth(timing));
	return [
		`${title}${" ".repeat(gap)}${timing}`,
		bar,
		...(state.phase ? [pc.dim(`${spin(now)} ${state.phase}`)] : []),
		...state.warnings.flatMap((warning) =>
			wrap(`! ${warning}`, width).map((line) => pc.yellow(line)),
		),
		"",
	];
};

/**
 * Renders run and test panels side by side, stacking them in narrow terminals. Pure rendering lets
 * `status` display saved state identically.
 */
const renderDashboard = (state: RunState, frame: Frame): string => {
	const { now } = frame;
	const width = Math.max(40, frame.width - 1);
	const header = renderHeader(state, now, width);
	const footer = [
		state.stopping
			? pc.yellow(
					"Stopping: ending lanes and removing their databases and servers. Press Ctrl+C again to quit at once.",
				)
			: pc.dim(
					`Output in .harness/runs/${state.runId} · Ctrl+C stops and cleans up`,
				),
	];
	const rows = Math.max(8, frame.height - header.length - footer.length - 1);

	let body: string[];
	if (width >= SIDE_BY_SIDE_WIDTH) {
		const left = renderRun(state, now, LEFT_WIDTH);
		const rightWidth = width - LEFT_WIDTH - stringWidth(DIVIDER);
		const right = renderDetail(
			state,
			now,
			rightWidth,
			Math.max(left.length, rows),
		);
		body = Array.from(
			{ length: Math.max(left.length, right.length) },
			(_, index) =>
				`${fitText(left[index] ?? "", LEFT_WIDTH)}${DIVIDER}${right[index] ?? ""}`,
		);
	} else {
		const left = renderRun(state, now, width);
		body = [...left, ...renderDetail(state, now, width, rows - left.length)];
	}
	if (body.length > rows) {
		body = [...body.slice(0, rows - 1), pc.dim("…")];
	}

	return [...header, ...body, ...footer].join("\n");
};

export default renderDashboard;
