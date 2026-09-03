import { type Insertable, sql } from "kysely";
import type { QueryParams } from "../../types/query-params.js";
import type { LucidDatabase } from "../db/client/index.js";
import queryBuilder from "../db/query-builder/index.js";
import type { LucidJobs } from "../db/tables/index.js";
import { jobsTable } from "../db/tables/jobs.js";
import type { Select } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class JobsRepository extends StaticRepository<"lucid_jobs"> {
	constructor(db: LucidDatabase) {
		super(db, jobsTable);
	}

	// ----------------------------------------
	// queries

	async selectSingleById<
		K extends keyof Select<LucidJobs>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				id: number;
				select: K[];
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_jobs")
			.select(props.select)
			.where("id", "=", props.id);

		const exec = await this.executeQuery(
			() =>
				query.executeTakeFirst() as Promise<
					Pick<Select<LucidJobs>, K> | undefined
				>,
			{ method: "selectSingleById" },
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.select as string[],
		});
	}
	async selectMultipleFilteredFixed<
		K extends keyof Select<LucidJobs>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				select: K[];
				queryParams: Partial<QueryParams>;
			}
		>,
	) {
		const exec = await this.executeQuery(
			async () => {
				const mainQuery = this.db.selectFrom("lucid_jobs").select(props.select);
				const countQuery = this.db
					.selectFrom("lucid_jobs")
					.select((eb) => eb.fn.countAll().as("count"));

				const { main, count } = queryBuilder.main(
					{ main: mainQuery, count: countQuery },
					{
						queryParams: props.queryParams,
						database: this.dbAdapter.config,
						meta: this.config.queryConfig,
					},
				);

				const [mainResult, countResult] = await Promise.all([
					main.execute() as unknown as Promise<Pick<Select<LucidJobs>, K>[]>,
					count?.executeTakeFirst() as Promise<{ count: string } | undefined>,
				]);

				return [mainResult, countResult] as const;
			},
			{ method: "selectMultipleFilteredFixed" },
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple-count",
			select: props.select as string[],
		});
	}
	/** Returns the latest job created for each supplied schedule. */
	async selectLatestByScheduleKeys(scheduleKeys: readonly string[]) {
		const latestJob = this.db
			.selectFrom("lucid_jobs")
			.select(["schedule_key", (eb) => eb.fn.max("id").as("latest_id")])
			.where("schedule_key", "in", [...scheduleKeys])
			.groupBy("schedule_key")
			.as("latest_job");

		const query = this.db
			.selectFrom("lucid_jobs as job")
			.innerJoin(latestJob, (join) =>
				join
					.onRef("job.schedule_key", "=", "latest_job.schedule_key")
					.onRef("job.id", "=", "latest_job.latest_id"),
			)
			.select([
				"job.schedule_key",
				"job.scheduled_for",
				"job.job_id",
				"job.status",
				"job.attempts",
				"job.max_attempts",
				"job.started_at",
				"job.completed_at",
				"job.failed_at",
				"job.cancelled_at",
				"job.error_message",
			]);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectLatestByScheduleKeys",
		});
		return exec.response;
	}
	/** Returns the stored receipt for one idempotent enqueue. */
	async selectSingleByIdempotencyKey(idempotencyKey: string) {
		const query = this.db
			.selectFrom("lucid_jobs")
			.select(["job_id", "job_name", "job_version"])
			.where("idempotency_key", "=", idempotencyKey);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSingleByIdempotencyKey",
		});
		return exec.response;
	}
	/** Returns queued jobs whose delivery notification is ready. */
	async selectPendingDispatch(props: {
		createdBefore?: string;
		jobIds?: readonly string[];
		limit: number;
		now: string;
	}) {
		let query = this.db
			.selectFrom("lucid_jobs")
			.select(["job_id", "available_at", "dispatch_attempts"])
			.where("status", "=", "queued")
			.where("dispatch_status", "=", "pending")
			.where((eb) =>
				eb.or([
					eb("next_dispatch_at", "is", null),
					eb("next_dispatch_at", "<=", props.now),
				]),
			)
			.orderBy("available_at", "asc")
			.orderBy("created_at", "asc")
			.orderBy("id", "asc")
			.limit(props.limit);

		if (props.jobIds) {
			query = query.where("job_id", "in", [...props.jobIds]);
		}
		if (props.createdBefore) {
			query = query.where("created_at", "<=", props.createdBefore);
		}

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectPendingDispatch",
		});
		return exec.response;
	}
	/** Returns ready jobs in the order workers should claim them. */
	async selectReadyJobIds(props: { limit: number; now: string }) {
		const query = this.db
			.selectFrom("lucid_jobs")
			.select("job_id")
			.where("cancel_requested_at", "is", null)
			.whereRef("attempts", "<", "max_attempts")
			.where((eb) =>
				eb.or([
					eb.and([
						eb("status", "=", "queued"),
						eb("available_at", "<=", props.now),
					]),
					eb.and([
						eb("status", "=", "running"),
						eb("lease_expires_at", "<=", props.now),
					]),
				]),
			)
			.orderBy("available_at", "asc")
			.orderBy("created_at", "asc")
			.orderBy("id", "asc")
			.limit(props.limit);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectReadyJobIds",
		});
		return exec.response;
	}
	/** Returns the state needed to retry or ignore an unclaimed delivery. */
	async selectDeliveryState(jobId: string) {
		const query = this.db
			.selectFrom("lucid_jobs")
			.select(["status", "available_at", "lease_expires_at"])
			.where("job_id", "=", jobId);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectDeliveryState",
		});
		return exec.response;
	}
	/** Returns a queued or running job for the same schedule. */
	async selectActiveScheduleJob(props: {
		before?: string;
		scheduleKey: string;
	}) {
		let query = this.db
			.selectFrom("lucid_jobs")
			.select("job_id")
			.where("schedule_key", "=", props.scheduleKey)
			.where("status", "in", ["queued", "running"]);
		if (props.before) {
			query = query.where("scheduled_for", "<", props.before);
		}

		const exec = await this.executeQuery(
			() => query.limit(1).executeTakeFirst(),
			{ method: "selectActiveScheduleJob" },
		);
		return exec.response;
	}

	// ----------------------------------------
	// inserts

	/** Stores jobs while allowing an existing idempotency key to win. */
	async createMultipleIdempotent(data: readonly Insertable<LucidJobs>[]) {
		const query = this.db
			.insertInto("lucid_jobs")
			.values([...data])
			.onConflict((conflict) => conflict.column("idempotency_key").doNothing());

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "createMultipleIdempotent",
		});
		return exec.response;
	}

	// ----------------------------------------
	// updates

	/** Claims a ready job and assigns its worker lease. */
	async claimReady(props: {
		jobId: string;
		leaseExpiresAt: string;
		leaseToken: string;
		now: string;
	}) {
		const query = this.db
			.updateTable("lucid_jobs")
			.set({
				status: "running",
				attempts: sql<number>`attempts + 1`,
				lease_token: props.leaseToken,
				lease_expires_at: props.leaseExpiresAt,
				heartbeat_at: props.now,
				started_at: props.now,
				dispatch_status: "dispatched",
				dispatched_at: props.now,
				next_dispatch_at: null,
				dispatch_error: null,
				updated_at: props.now,
			})
			.where("job_id", "=", props.jobId)
			.where("cancel_requested_at", "is", null)
			.whereRef("attempts", "<", "max_attempts")
			.where((eb) =>
				eb.or([
					eb.and([
						eb("status", "=", "queued"),
						eb("available_at", "<=", props.now),
					]),
					eb.and([
						eb("status", "=", "running"),
						eb("lease_expires_at", "<=", props.now),
					]),
				]),
			)
			.returning([
				"job_id",
				"job_name",
				"job_version",
				"trigger_type",
				"schedule_key",
				"scheduled_for",
				"payload",
				"attempts",
				"max_attempts",
				"lease_token",
			]);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "claimReady",
		});
		if (exec.response.error) return exec.response;
		if (!exec.response.data) return { error: undefined, data: undefined };

		return {
			error: undefined,
			data: {
				...exec.response.data,
				lease_token: props.leaseToken,
			},
		};
	}
	/** Completes a cancellation while the caller still owns the lease. */
	async cancelClaimed(props: {
		jobId: string;
		leaseToken: string;
		now: string;
	}) {
		const query = this.db
			.updateTable("lucid_jobs")
			.set({
				status: "cancelled",
				cancelled_at: props.now,
				lease_token: null,
				lease_expires_at: null,
				heartbeat_at: null,
				updated_at: props.now,
			})
			.where("job_id", "=", props.jobId)
			.where("lease_token", "=", props.leaseToken)
			.where("status", "=", "running")
			.where("cancel_requested_at", "is not", null)
			.returning("job_id");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "cancelClaimed",
		});
		return exec.response;
	}
	/** Extends a lease while the job remains owned and uncancelled. */
	async renewLease(props: {
		jobId: string;
		leaseExpiresAt: string;
		leaseToken: string;
		now: string;
	}) {
		const query = this.db
			.updateTable("lucid_jobs")
			.set({
				heartbeat_at: props.now,
				lease_expires_at: props.leaseExpiresAt,
				updated_at: props.now,
			})
			.where("job_id", "=", props.jobId)
			.where("lease_token", "=", props.leaseToken)
			.where("status", "=", "running")
			.where("cancel_requested_at", "is", null)
			.returning("job_id");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "renewLease",
		});
		return exec.response;
	}
	/** Marks an owned job as completed. */
	async completeClaimed(props: {
		jobId: string;
		leaseToken: string;
		now: string;
	}) {
		const query = this.db
			.updateTable("lucid_jobs")
			.set({
				status: "completed",
				completed_at: props.now,
				error_message: null,
				lease_token: null,
				lease_expires_at: null,
				heartbeat_at: null,
				updated_at: props.now,
			})
			.where("job_id", "=", props.jobId)
			.where("lease_token", "=", props.leaseToken)
			.where("status", "=", "running")
			.where("cancel_requested_at", "is", null)
			.returning("job_id");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "completeClaimed",
		});
		return exec.response;
	}
	/** Returns an owned job to the queue for another attempt. */
	async retryClaimed(props: {
		availableAt: string;
		jobId: string;
		leaseToken: string;
		message: string;
		now: string;
	}) {
		const query = this.db
			.updateTable("lucid_jobs")
			.set({
				status: "queued",
				available_at: props.availableAt,
				error_message: props.message,
				lease_token: null,
				lease_expires_at: null,
				heartbeat_at: null,
				dispatch_status: "pending",
				next_dispatch_at: props.now,
				dispatched_at: null,
				dispatch_error: null,
				updated_at: props.now,
			})
			.where("job_id", "=", props.jobId)
			.where("lease_token", "=", props.leaseToken)
			.where("status", "=", "running")
			.where("cancel_requested_at", "is", null)
			.returning("job_id");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "retryClaimed",
		});
		return exec.response;
	}
	/** Marks an owned job as permanently failed. */
	async failClaimed(props: {
		jobId: string;
		leaseToken: string;
		message: string;
		now: string;
	}) {
		const query = this.db
			.updateTable("lucid_jobs")
			.set({
				status: "failed",
				failed_at: props.now,
				error_message: props.message,
				lease_token: null,
				lease_expires_at: null,
				heartbeat_at: null,
				updated_at: props.now,
			})
			.where("job_id", "=", props.jobId)
			.where("lease_token", "=", props.leaseToken)
			.where("status", "=", "running")
			.where("cancel_requested_at", "is", null)
			.returning("job_id");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "failClaimed",
		});
		return exec.response;
	}
	/** Marks a queued job as cancelled. */
	async cancelQueued(props: { jobId: string; now: string }) {
		const query = this.db
			.updateTable("lucid_jobs")
			.set({
				status: "cancelled",
				cancelled_at: props.now,
				updated_at: props.now,
			})
			.where("job_id", "=", props.jobId)
			.where("status", "=", "queued")
			.returning("job_id");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "cancelQueued",
		});
		return exec.response;
	}
	/** Records a cancellation request for a running job. */
	async requestCancellation(props: { jobId: string; now: string }) {
		const query = this.db
			.updateTable("lucid_jobs")
			.set({ cancel_requested_at: props.now, updated_at: props.now })
			.where("job_id", "=", props.jobId)
			.where("status", "=", "running")
			.returning("job_id");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "requestCancellation",
		});
		return exec.response;
	}
	/** Marks delivery notifications as published. */
	async markDispatched(props: { jobIds: readonly string[]; now: string }) {
		const query = this.db
			.updateTable("lucid_jobs")
			.set({
				dispatch_status: "dispatched",
				dispatched_at: props.now,
				dispatch_error: null,
				next_dispatch_at: null,
				updated_at: props.now,
			})
			.where("job_id", "in", [...props.jobIds])
			.where("dispatch_status", "=", "pending");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "markDispatched",
		});
		return exec.response;
	}
	/** Records a failed delivery notification and its next retry time. */
	async recordDispatchFailure(props: {
		jobIds: readonly string[];
		message: string;
		nextDispatchAt: string;
		now: string;
	}) {
		const query = this.db
			.updateTable("lucid_jobs")
			.set({
				dispatch_attempts: sql<number>`dispatch_attempts + 1`,
				dispatch_error: props.message,
				next_dispatch_at: props.nextDispatchAt,
				updated_at: props.now,
			})
			.where("job_id", "in", [...props.jobIds])
			.where("dispatch_status", "=", "pending");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "recordDispatchFailure",
		});
		return exec.response;
	}
	/** Cancels running jobs whose lease expired after cancellation was requested. */
	async cancelExpiredLeases(now: string) {
		const query = this.db
			.updateTable("lucid_jobs")
			.set({
				status: "cancelled",
				cancelled_at: now,
				lease_token: null,
				lease_expires_at: null,
				heartbeat_at: null,
				updated_at: now,
			})
			.where("status", "=", "running")
			.where("lease_expires_at", "<=", now)
			.where("cancel_requested_at", "is not", null);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "cancelExpiredLeases",
		});
		return exec.response;
	}
	/** Fails expired leases that have used every allowed attempt. */
	async failExhaustedLeases(props: { message: string; now: string }) {
		const query = this.db
			.updateTable("lucid_jobs")
			.set({
				status: "failed",
				failed_at: props.now,
				error_message: props.message,
				lease_token: null,
				lease_expires_at: null,
				heartbeat_at: null,
				updated_at: props.now,
			})
			.where("status", "=", "running")
			.where("lease_expires_at", "<=", props.now)
			.where("cancel_requested_at", "is", null)
			.whereRef("attempts", ">=", "max_attempts")
			.returning(["job_id", "job_name", "job_version", "payload", "attempts"]);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "failExhaustedLeases",
		});
		return exec.response;
	}
	/** Requeues expired leases that still have attempts remaining. */
	async requeueExpiredLeases(props: { message: string; now: string }) {
		const query = this.db
			.updateTable("lucid_jobs")
			.set({
				status: "queued",
				available_at: props.now,
				error_message: props.message,
				lease_token: null,
				lease_expires_at: null,
				heartbeat_at: null,
				dispatch_status: "pending",
				next_dispatch_at: props.now,
				dispatched_at: null,
				dispatch_error: null,
				updated_at: props.now,
			})
			.where("status", "=", "running")
			.where("lease_expires_at", "<=", props.now)
			.where("cancel_requested_at", "is", null)
			.whereRef("attempts", "<", "max_attempts")
			.returning("job_id");

		const exec = await this.executeQuery(() => query.execute(), {
			method: "requeueExpiredLeases",
		});
		return exec.response;
	}

	// ----------------------------------------
	// deletes

	/** Deletes completed jobs older than the configured retention date. */
	async deleteCompletedBefore(date: string) {
		const query = this.db
			.deleteFrom("lucid_jobs")
			.where("status", "=", "completed")
			.where("completed_at", "<", date);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "deleteCompletedBefore",
		});
		return exec.response;
	}
	/** Deletes failed and cancelled jobs older than the configured retention date. */
	async deleteFailedBefore(date: string) {
		const query = this.db
			.deleteFrom("lucid_jobs")
			.where("status", "in", ["failed", "cancelled"])
			.where((eb) =>
				eb.or([eb("failed_at", "<", date), eb("cancelled_at", "<", date)]),
			);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "deleteFailedBefore",
		});
		return exec.response;
	}
}
