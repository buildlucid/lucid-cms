import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import type {
	JobCancelResult,
	JobConsumptionResult,
	JobDetails,
} from "@lucidcms/core/types";
import type { ApiResponse, Lucid } from "#harness/client";
import {
	HARNESS_JOB_ROUTES,
	type LedgerEntry,
	PROBE_JOBS,
	type ProbeInput,
} from "../config/fragments/jobs.ts";

/** A job's statuses, as the API reports them. */
export type JobStatus =
	| "queued"
	| "running"
	| "completed"
	| "failed"
	| "cancelled";

/** What a test asks the probe route for. See `shared/fragments/jobs.ts`. */
export type ProbeRequest = ProbeInput & {
	/** Uses the probe that commits its writes with its completion. */
	transaction?: boolean;
	/** Uses a probe that retries a minute later. See `PROBE_JOBS`. */
	slowRetry?: boolean;
	runAt?: Date;
	idempotencyKey?: string;
	/** Enqueues inside a transaction that then rolls back. */
	rollback?: boolean;
};

const POLL_MS = 100;
/** How often `waitForJob` runs a scheduler tick while it waits, as a runtime's timer would. */
const TICK_EVERY_MS = 1_000;
const TIMEOUT_MS = 20_000;

const expectOk = (action: string, response: ApiResponse<unknown>) => {
	if (!response.ok) {
		throw new Error(
			`${action} answered ${response.status}: ${JSON.stringify(response.body)}`,
		);
	}
};

/** A tag no other test uses, so a test finds only its own jobs in a shared ledger. */
export const uniqueTag = (name: string) =>
	`${name}-${randomUUID().slice(0, 8)}`;

/** Asks the probe route for a job, and returns its answer as it is, for tests of refusals. */
export const requestProbe = async (lucid: Lucid, request: ProbeRequest) => {
	const admin = await lucid.admin();
	return admin.request<{ data: { jobId: string | null; rolledBack: boolean } }>(
		{
			method: "POST",
			path: HARNESS_JOB_ROUTES.enqueue,
			body: { ...request, runAt: request.runAt?.toISOString() },
		},
	);
};

/**
 * Enqueues a probe job as the admin through a harness-only route and returns its ID. On an inline
 * queue the job has already run by then, and a hanging one holds the response until it stops.
 */
export const enqueueProbe = async (
	lucid: Lucid,
	request: ProbeRequest,
): Promise<string> => {
	const response = await requestProbe(lucid, request);
	expectOk(`Enqueueing probe ${request.tag}`, response);
	const jobId = response.body.data.jobId;
	if (!jobId) {
		throw new Error(`Enqueueing probe ${request.tag} gave no job.`);
	}
	return jobId;
};

/** Reads a job as the admin. */
export const readJob = async (
	lucid: Lucid,
	jobId: string,
): Promise<JobDetails> => {
	const admin = await lucid.admin();
	const response = await admin.request<{ data: JobDetails }>({
		path: `/api/v1/jobs/${jobId}`,
	});
	expectOk(`Reading job ${jobId}`, response);
	return response.body.data;
};

/**
 * Ticks the scheduler to recover leases, retry dispatches and enqueue schedules. `at` advances the
 * cursor and requires host mode; otherwise uses the current clock.
 */
export const tick = async (lucid: Lucid, at?: Date): Promise<void> => {
	if (at && lucid.mode !== "host") {
		throw new Error(
			'A tick at a chosen time moves the shared scheduler, so it is host mode only. Call requires("mode:host").',
		);
	}
	const admin = await lucid.admin();
	const response = await admin.request({
		method: "POST",
		path: HARNESS_JOB_ROUTES.tick,
		body: { scheduledAt: at?.toISOString() },
	});
	expectOk("Running a scheduler tick", response);
};

/**
 * Waits for a matching status. Ticks every second for queues without delayed delivery; other
 * queues receive ticks only when requested.
 */
export const waitForJob = async (
	lucid: Lucid,
	jobId: string,
	statuses: JobStatus | readonly JobStatus[],
	options: { timeout?: number; tick?: boolean } = {},
): Promise<JobDetails> => {
	const wanted = typeof statuses === "string" ? [statuses] : statuses;
	const deadline = performance.now() + (options.timeout ?? TIMEOUT_MS);
	const ticks =
		options.tick ?? !lucid.capabilities.includes("queue.delayedDelivery");
	let nextTick = performance.now() + TICK_EVERY_MS;
	let job = await readJob(lucid, jobId);

	while (!wanted.includes(job.status)) {
		if (performance.now() > deadline) {
			throw new Error(
				`Job ${jobId} was still ${job.status} after ${(options.timeout ?? TIMEOUT_MS) / 1000}s, waiting for ${wanted.join(" or ")}. Last error: ${job.errorMessage}`,
			);
		}
		if (ticks && performance.now() > nextTick) {
			await tick(lucid);
			nextTick = performance.now() + TICK_EVERY_MS;
		}
		await sleep(POLL_MS);
		job = await readJob(lucid, jobId);
	}
	return job;
};

/** Cancels a job as the admin, and returns what happened. */
export const cancelJob = async (
	lucid: Lucid,
	jobId: string,
): Promise<JobCancelResult> => {
	const admin = await lucid.admin();
	const response = await admin.request<{ data: JobCancelResult }>({
		method: "POST",
		path: HARNESS_JOB_ROUTES.cancel,
		body: { jobId },
	});
	expectOk(`Cancelling job ${jobId}`, response);
	return response.body.data;
};

/**
 * Delivers a job's queue message `times` times at once, as a queue that delivers more than once
 * would, and returns what each delivery was told to do.
 */
export const deliverJob = async (
	lucid: Lucid,
	jobId: string,
	times = 1,
): Promise<JobConsumptionResult[]> => {
	const admin = await lucid.admin();
	const response = await admin.request<{ data: JobConsumptionResult[] }>({
		method: "POST",
		path: HARNESS_JOB_ROUTES.deliver,
		body: { jobId, times },
	});
	expectOk(`Delivering job ${jobId}`, response);
	return response.body.data;
};

/** Which ledger entries to look for. Every field given must match. */
export type LedgerMatch<Event extends LedgerEntry["event"]> = {
	event?: Event;
	tag?: string;
	jobId?: string;
	attempt?: number;
};

/** The kinds of entry that can have `event`, or every kind without one. */
type EntryFor<
	Event extends LedgerEntry["event"],
	Entry = LedgerEntry,
> = Entry extends { event: infer Has }
	? [Extract<Has, Event>] extends [never]
		? never
		: Entry
	: never;

/** What probe jobs did that match, oldest first. */
export const executions = async <Event extends LedgerEntry["event"]>(
	lucid: Lucid,
	match: LedgerMatch<Event>,
): Promise<EntryFor<Event>[]> => {
	const files = await readdir(lucid.ledger).catch((): string[] => []);
	const entries: EntryFor<Event>[] = [];
	//* file names start with when they were written, so they sort oldest first
	for (const file of files.toSorted()) {
		const entry = await readFile(path.join(lucid.ledger, file), "utf8")
			.then((text) => JSON.parse(text) as EntryFor<Event>)
			.catch(() => undefined);
		const values = new Map(Object.entries(entry ?? {}));
		if (
			entry &&
			Object.entries(match).every(([key, value]) => values.get(key) === value)
		) {
			entries.push(entry);
		}
	}
	return entries;
};

/** Waits for a probe job to do something that matches, and returns the newest match. */
export const waitForExecution = async <Event extends LedgerEntry["event"]>(
	lucid: Lucid,
	match: LedgerMatch<Event>,
	options: { timeout?: number } = {},
): Promise<EntryFor<Event>> => {
	const timeout = options.timeout ?? TIMEOUT_MS;
	const deadline = performance.now() + timeout;
	while (performance.now() < deadline) {
		const found = (await executions(lucid, match)).at(-1);
		if (found) {
			return found;
		}
		await sleep(POLL_MS);
	}
	throw new Error(
		`No probe did ${JSON.stringify(match)} within ${timeout / 1000}s.`,
	);
};

/**
 * Resets the scheduler cursor, unpauses schedules and clears scheduled probe jobs. Host tests that
 * tick ahead call this after each test so the cursor does not outpace the clock.
 */
export const resetScheduler = async (lucid: Lucid): Promise<void> => {
	await lucid.query(async (db) => {
		await db.deleteFrom("lucid_job_scheduler").execute();
		await db.deleteFrom("lucid_job_schedule_overrides").execute();
		await db
			.deleteFrom("lucid_jobs")
			.where("job_key", "=", PROBE_JOBS.scheduled)
			.execute();
	});
};
