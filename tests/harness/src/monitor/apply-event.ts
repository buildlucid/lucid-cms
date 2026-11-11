import type { ProgressEvent } from "../progress/types.ts";
import type { FinishedTest, JobState } from "./types.ts";

/**
 * Updates a job with one event from its events file. Returns the test that finished, if the
 * event ended one, so the monitor can record failures and slow tests.
 */
const applyEvent = (
	job: JobState,
	event: ProgressEvent,
): Omit<FinishedTest, "previousMs"> | undefined => {
	job.activeAt = event.at;
	const isTest = (test: { file: string; name: string }) =>
		"name" in event && test.file === event.file && test.name === event.name;

	switch (event.type) {
		case "files": {
			job.files.total = event.total;
			return undefined;
		}
		case "collected": {
			job.files.collected++;
			job.tests.total += event.tests;
			return undefined;
		}
		case "test-start": {
			job.running.push({
				file: event.file,
				name: event.name,
				startedAt: event.at,
			});
			return undefined;
		}
		case "test-progress": {
			//* a worker can report progress before the runner reports the start
			let test = job.running.find(isTest);
			if (!test) {
				test = { file: event.file, name: event.name, startedAt: event.at };
				job.running.push(test);
			}
			test.progress = { done: event.done, total: event.total };
			return undefined;
		}
		case "test-end": {
			job.running = job.running.filter((test) => !isTest(test));
			job.tests.done++;
			if (event.status === "failed") {
				job.tests.failed++;
			}
			return {
				job: job.key,
				file: event.file,
				name: event.name,
				status: event.status,
				durationMs: event.durationMs,
				error: event.error,
			};
		}
		case "file-end": {
			job.files.done++;
			return undefined;
		}
	}
};

export default applyEvent;
