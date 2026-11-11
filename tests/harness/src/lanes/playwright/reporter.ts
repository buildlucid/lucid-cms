import path from "node:path";
import type {
	FullConfig,
	FullResult,
	Reporter,
	Suite,
	TestCase,
	TestError,
	TestResult,
} from "@playwright/test/reporter";
import { isNotApplicable } from "../../capabilities/find-missing.ts";
import loadContext from "../../environment/load-context.ts";
import emitProgress from "../../progress/emit-progress.ts";
import createTestId from "../../report/create-test-id.ts";
import type { TestRecord, TestStatus } from "../../report/types.ts";
import writeLaneResult from "../../report/write-lane-result.ts";
import { paths } from "../../utils/paths.ts";

const formatError = (error: TestError): string =>
	error.stack ?? error.message ?? String(error.value);

/** A test file's path relative to the lane's folder, as reports and progress events name it. */
const toFile = (test: TestCase): string =>
	path.relative(
		path.join(paths.suites, loadContext().lane),
		test.location.file,
	);

/** The describe blocks around a test, outermost first. The title path starts with the root, project and file. */
const getGroups = (test: TestCase): string[] => test.titlePath().slice(3, -1);

/** The name progress events use, which matches Vitest's full names. */
const getFullName = (test: TestCase): string =>
	[...getGroups(test), test.title].join(" > ");

const toStatus = (test: TestCase, result: TestResult): TestStatus => {
	if (result.status === "skipped") {
		const skipReason = test.annotations.find(
			(annotation) => annotation.type === "skip",
		)?.description;
		return isNotApplicable(skipReason) ? "notApplicable" : "skipped";
	}
	//* a test marked with `test.fail()` is expected to fail, and passes by doing so
	return result.status === test.expectedStatus ? "passed" : "failed";
};

/**
 * Turns Playwright's results into the harness's report shape when a run ends, and reports
 * progress while it runs.
 */
class HarnessReporter implements Reporter {
	//* a retried test reports more than once, so the last result for each test wins
	#results = new Map<TestCase, TestResult>();
	#errors: string[] = [];

	onBegin(_config: FullConfig, suite: Suite): void {
		const byFile = Map.groupBy(suite.allTests(), toFile);
		emitProgress({ type: "files", total: byFile.size });
		for (const [file, tests] of byFile) {
			emitProgress({ type: "collected", file, tests: tests.length });
		}
	}

	onTestBegin(test: TestCase): void {
		emitProgress({
			type: "test-start",
			file: toFile(test),
			name: getFullName(test),
		});
	}

	onTestEnd(test: TestCase, result: TestResult): void {
		this.#results.set(test, result);
		emitProgress({
			type: "test-end",
			file: toFile(test),
			name: getFullName(test),
			status: toStatus(test, result),
			durationMs: Math.round(result.duration),
			error: result.errors[0]?.message?.split("\n")[0],
		});
	}

	onError(error: TestError): void {
		this.#errors.push(formatError(error));
	}

	async onEnd(_result: FullResult): Promise<void> {
		const { lane } = loadContext();

		const toRecord = ([test, result]: [TestCase, TestResult]): TestRecord => {
			const file = toFile(test);
			const groups = getGroups(test);
			const status = toStatus(test, result);

			return {
				id: createTestId({ lane, file, groups, name: test.title }),
				file,
				groups,
				name: test.title,
				status,
				durationMs: Math.round(result.duration),
				skipReason: test.annotations.find(
					(annotation) => annotation.type === "skip",
				)?.description,
				flaky: test.outcome() === "flaky",
				errors: status === "passed" ? [] : result.errors.map(formatError),
			};
		};

		await writeLaneResult({
			tests: [...this.#results].map(toRecord),
			measurements: [],
			errors: this.#errors,
		});
	}
}

export default HarnessReporter;
