import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import { afterAll, describe, expect, test } from "vitest";
import QueueJobsRepository from "./queue-jobs";

describe("Tests for the queue jobs repository", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});

	afterAll(() => {
		db.client.destroy();
	});

	await db.migrateToLatest();
	const QueueJobs = new QueueJobsRepository(db.client, db);
	const tables = await db.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find((t) => t.name === QueueJobs.tableName);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			// @ts-expect-error
			expect(QueueJobs.columnFormats[column.name]).toEqual(
				column.dataType.toLowerCase(),
			);
		}
	});

	test("selectJobsForProcessing returns only due pending jobs", async () => {
		const now = new Date("2026-01-01T12:00:00.000Z");
		const past = new Date("2026-01-01T11:59:00.000Z").toISOString();
		const future = new Date("2026-01-01T12:01:00.000Z").toISOString();
		const baseJob = {
			event_type: "email:send" as const,
			event_data: {},
			queue_adapter_key: "worker",
			priority: 0,
			attempts: 0,
			max_attempts: 3,
			error_message: null,
			created_at: past,
			created_by_user_id: null,
			updated_at: past,
		};

		await QueueJobs.createMultiple({
			data: [
				{
					...baseJob,
					job_id: "due-unscheduled",
					status: "pending",
					scheduled_for: null,
					next_retry_at: null,
				},
				{
					...baseJob,
					job_id: "due-scheduled",
					status: "pending",
					scheduled_for: past,
					next_retry_at: null,
				},
				{
					...baseJob,
					job_id: "future-scheduled",
					status: "pending",
					scheduled_for: future,
					next_retry_at: null,
				},
				{
					...baseJob,
					job_id: "future-retry",
					status: "pending",
					scheduled_for: null,
					next_retry_at: future,
				},
				{
					...baseJob,
					job_id: "cancelled-due",
					status: "cancelled",
					scheduled_for: past,
					next_retry_at: null,
				},
			],
		});

		const jobsRes = await QueueJobs.selectJobsForProcessing({
			data: {
				currentTime: now,
				limit: 10,
			},
		});

		expect(jobsRes.error).toBeUndefined();
		expect(jobsRes.data?.map((job) => job.job_id)).toEqual([
			"due-unscheduled",
			"due-scheduled",
		]);
	});
});
