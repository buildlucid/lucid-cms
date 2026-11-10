import path from "node:path";
import type {
	FullResult,
	Reporter,
	TestCase,
	TestError,
	TestResult,
} from "@playwright/test/reporter";
import { isNotApplicable } from "../../capabilities/find-missing.ts";
import loadContext from "../../environment/load-context.ts";
import createTestId from "../../report/create-test-id.ts";
import type { TestRecord, TestStatus } from "../../report/types.ts";
import writeLaneResult from "../../report/write-lane-result.ts";
import { paths } from "../../utils/paths.ts";

const formatError = (error: TestError): string =>
	error.stack ?? error.message ?? String(error.value);

/** Turns Playwright's results into the harness's report shape when a run ends. */
class HarnessReporter implements Reporter {
	//* a retried test reports more than once, so the last result for each test wins
	#results = new Map<TestCase, TestResult>();
	#errors: string[] = [];

	onTestEnd(test: TestCase, result: TestResult): void {
		this.#results.set(test, result);
	}

	onError(error: TestError): void {
		this.#errors.push(formatError(error));
	}

	async onEnd(_result: FullResult): Promise<void> {
		const { lane } = loadContext();
		const laneDirectory = path.join(paths.suites, lane);

		const toRecord = ([test, result]: [TestCase, TestResult]): TestRecord => {
			const file = path.relative(laneDirectory, test.location.file);
			//* the title path starts with the root, project and file, which the ID already covers
			const groups = test.titlePath().slice(3, -1);
			const skipReason = test.annotations.find(
				(annotation) => annotation.type === "skip",
			)?.description;
			let status: TestStatus = "failed";
			if (result.status === "passed") {
				status = "passed";
			} else if (result.status === "skipped") {
				status = isNotApplicable(skipReason) ? "notApplicable" : "skipped";
			}

			return {
				id: createTestId({ lane, file, groups, name: test.title }),
				file,
				groups,
				name: test.title,
				status,
				durationMs: Math.round(result.duration),
				skipReason,
				flaky: test.outcome() === "flaky",
				errors: result.errors.map(formatError),
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
