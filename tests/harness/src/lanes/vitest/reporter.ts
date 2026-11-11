import path from "node:path";
import type {
	Reporter,
	TestCase,
	TestModule,
	TestSpecification,
} from "vitest/node";
import { isNotApplicable } from "../../capabilities/find-missing.ts";
import loadContext from "../../environment/load-context.ts";
import emitProgress from "../../progress/emit-progress.ts";
import createTestId from "../../report/create-test-id.ts";
import type { TestRecord, TestStatus } from "../../report/types.ts";
import writeLaneResult from "../../report/write-lane-result.ts";
import { paths } from "../../utils/paths.ts";

type SerializedError = { message: string; stack?: string; cause?: unknown };

const isError = (value: unknown): value is SerializedError =>
	typeof value === "object" && value !== null && "message" in value;

/** Formats an error with the chain of causes behind it, which is where a simulation's real failure sits. */
const formatError = (error: SerializedError): string =>
	[
		error.stack ?? error.message,
		...(isError(error.cause) ? [`Caused by: ${formatError(error.cause)}`] : []),
	].join("\n");

/** Maps a runner's own state to a report status. A test that never ran, such as after a failed hook, counts as failed. */
const toStatus = (
	state: string,
	skipReason: string | undefined,
): TestStatus => {
	if (state === "passed") {
		return "passed";
	}
	if (state === "skipped") {
		return isNotApplicable(skipReason) ? "notApplicable" : "skipped";
	}
	return "failed";
};

/** Lists the describe blocks around a test, outermost first. */
const getGroups = (test: TestCase): string[] => {
	const groups: string[] = [];
	let parent = test.parent;
	while (parent.type === "suite") {
		groups.unshift(parent.name);
		parent = parent.parent;
	}
	return groups;
};

/** A test file's path relative to the lane's folder, as reports and progress events name it. */
const toFile = (module: TestModule): string =>
	path.relative(path.join(paths.suites, loadContext().lane), module.moduleId);

/**
 * Turns Vitest's results into the harness's report shape when a run ends, and reports progress
 * while it runs.
 */
class HarnessReporter implements Reporter {
	onTestRunStart(specifications: ReadonlyArray<TestSpecification>): void {
		emitProgress({ type: "files", total: specifications.length });
	}

	onTestModuleCollected(module: TestModule): void {
		emitProgress({
			type: "collected",
			file: toFile(module),
			tests: [...module.children.allTests()].length,
		});
	}

	onTestCaseReady(test: TestCase): void {
		emitProgress({
			type: "test-start",
			file: toFile(test.module),
			name: test.fullName,
		});
	}

	onTestCaseResult(test: TestCase): void {
		const result = test.result();
		const skipReason = result.state === "skipped" ? result.note : undefined;
		emitProgress({
			type: "test-end",
			file: toFile(test.module),
			name: test.fullName,
			status: toStatus(result.state, skipReason),
			durationMs: Math.round(test.diagnostic()?.duration ?? 0),
			error: result.errors?.[0]?.message.split("\n")[0],
		});
	}

	onTestModuleEnd(module: TestModule): void {
		emitProgress({ type: "file-end", file: toFile(module) });
	}

	async onTestRunEnd(
		modules: ReadonlyArray<TestModule>,
		unhandledErrors: ReadonlyArray<SerializedError>,
	): Promise<void> {
		const { lane } = loadContext();

		const toRecord = (test: TestCase): TestRecord => {
			const result = test.result();
			const file = toFile(test.module);
			const groups = getGroups(test);
			const skipReason = result.state === "skipped" ? result.note : undefined;
			const status = toStatus(result.state, skipReason);

			return {
				id: createTestId({ lane, file, groups, name: test.name }),
				file,
				groups,
				name: test.name,
				status,
				durationMs: Math.round(test.diagnostic()?.duration ?? 0),
				skipReason,
				flaky: test.diagnostic()?.flaky ?? false,
				errors: (result.errors ?? []).map(formatError),
				meta: test.meta().harness,
			};
		};

		await writeLaneResult({
			tests: modules.flatMap((module) =>
				[...module.children.allTests()].map(toRecord),
			),
			measurements: [],
			errors: [
				...unhandledErrors.map(formatError),
				...modules.flatMap((module) => module.errors().map(formatError)),
			],
		});
	}
}

export default HarnessReporter;
