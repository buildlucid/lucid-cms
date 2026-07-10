import type { SelectQueryBuilder } from "kysely";
import z from "zod";
import type { QueryParams } from "../../types/query-params.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import queryBuilder from "../db/query-builder/index.js";
import type { KyselyDB, LucidDB, LucidQueueJobs, Select } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class QueueJobsRepository extends StaticRepository<"lucid_queue_jobs"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_queue_jobs");
	}
	tableSchema = z.object({
		id: z.union([z.string(), z.number()]),
		job_id: z.string(),
		event_type: z.string(),
		event_data: z.record(z.string(), z.unknown()).nullable(),
		status: z.enum([
			"pending",
			"processing",
			"completed",
			"failed",
			"cancelled",
		]),
		queue_adapter_key: z.string(),
		priority: z.number().nullable(),
		attempts: z.number(),
		max_attempts: z.number(),
		error_message: z.string().nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
		scheduled_for: z.union([z.string(), z.date()]).nullable(),
		started_at: z.union([z.string(), z.date()]).nullable(),
		completed_at: z.union([z.string(), z.date()]).nullable(),
		failed_at: z.union([z.string(), z.date()]).nullable(),
		next_retry_at: z.union([z.string(), z.date()]).nullable(),
		created_by_user_id: z.union([z.string(), z.number()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		job_id: this.dbAdapter.getDataType("text"),
		event_type: this.dbAdapter.getDataType("text"),
		event_data: this.dbAdapter.getDataType("json"),
		status: this.dbAdapter.getDataType("text"),
		queue_adapter_key: this.dbAdapter.getDataType("text"),
		priority: this.dbAdapter.getDataType("integer"),
		attempts: this.dbAdapter.getDataType("integer"),
		max_attempts: this.dbAdapter.getDataType("integer"),
		error_message: this.dbAdapter.getDataType("text"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		scheduled_for: this.dbAdapter.getDataType("timestamp"),
		started_at: this.dbAdapter.getDataType("timestamp"),
		completed_at: this.dbAdapter.getDataType("timestamp"),
		failed_at: this.dbAdapter.getDataType("timestamp"),
		next_retry_at: this.dbAdapter.getDataType("timestamp"),
		created_by_user_id: this.dbAdapter.getDataType("integer"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				jobId: "job_id",
				eventType: "event_type",
				status: "status",
				queueAdapterKey: "queue_adapter_key",
				priority: "priority",
				attempts: "attempts",
				maxAttempts: "max_attempts",
				errorMessage: "error_message",
				createdByUserId: "created_by_user_id",
				createdAt: "created_at",
				scheduledFor: "scheduled_for",
				startedAt: "started_at",
				completedAt: "completed_at",
				failedAt: "failed_at",
				nextRetryAt: "next_retry_at",
			},
			sorts: {
				jobId: "job_id",
				eventType: "event_type",
				status: "status",
				queueAdapterKey: "queue_adapter_key",
				priority: "priority",
				attempts: "attempts",
				maxAttempts: "max_attempts",
				createdAt: "created_at",
				scheduledFor: "scheduled_for",
				startedAt: "started_at",
				completedAt: "completed_at",
				failedAt: "failed_at",
				nextRetryAt: "next_retry_at",
				updatedAt: "updated_at",
			},
		},
		operators: {
			eventType: "contains",
			queueAdapterKey: "contains",
			errorMessage: "contains",
		},
	} as const;

	// ----------------------------------------
	// queries
	async selectSingleById<
		K extends keyof Select<LucidQueueJobs>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				id: number;
				select: K[];
				tenantKey?: string | null;
			}
		>,
	) {
		let query = this.db
			.selectFrom("lucid_queue_jobs")
			.select(props.select)
			.where("id", "=", props.id);

		query = this.applyTenantScope(query, props.tenantKey);

		const exec = await this.executeQuery(
			() =>
				query.executeTakeFirst() as Promise<
					Pick<Select<LucidQueueJobs>, K> | undefined
				>,
			{
				method: "selectSingleById",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.select as string[],
		});
	}

	async selectMultipleFilteredFixed<
		K extends keyof Select<LucidQueueJobs>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				select: K[];
				queryParams: Partial<QueryParams>;
				tenantKey?: string | null;
			}
		>,
	) {
		const exec = await this.executeQuery(
			async () => {
				let mainQuery = this.db
					.selectFrom("lucid_queue_jobs")
					.select(props.select);
				let countQuery = this.db
					.selectFrom("lucid_queue_jobs")
					.select((eb) => eb.fn.countAll().as("count"));

				mainQuery = this.applyTenantScope(mainQuery, props.tenantKey);
				countQuery = this.applyTenantScope(countQuery, props.tenantKey);

				const { main, count } = queryBuilder.main(
					{
						main: mainQuery,
						count: countQuery,
					},
					{
						queryParams: props.queryParams,
						database: this.dbAdapter.config,
						meta: this.queryConfig,
					},
				);

				const [mainResult, countResult] = await Promise.all([
					main.execute() as unknown as Promise<
						Pick<Select<LucidQueueJobs>, K>[]
					>,
					count?.executeTakeFirst() as Promise<{ count: string } | undefined>,
				]);

				return [mainResult, countResult] as const;
			},
			{
				method: "selectMultipleFilteredFixed",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple-count",
			select: props.select as string[],
		});
	}

	async selectJobsForProcessing<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				data: {
					limit: number;
					currentTime: Date;
				};
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_queue_jobs")
			.selectAll()
			.where((eb) =>
				eb.and([
					eb("status", "=", "pending"),
					eb.or([
						eb("next_retry_at", "is", null),
						eb("next_retry_at", "<=", props.data.currentTime.toISOString()),
					]),
					eb.or([
						eb("scheduled_for", "is", null),
						eb("scheduled_for", "<=", props.data.currentTime.toISOString()),
					]),
				]),
			)
			.orderBy("priority", "desc")
			.orderBy("created_at", "asc")
			.limit(props.data.limit);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectJobsForProcessing",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			selectAll: true,
		});
	}

	// ----------------------------------------
	// helpers
	private applyTenantScope<O>(
		query: SelectQueryBuilder<LucidDB, "lucid_queue_jobs", O>,
		tenantKey?: string | null,
	): SelectQueryBuilder<LucidDB, "lucid_queue_jobs", O> {
		if (tenantKey == null) return query;

		return query.where((eb) =>
			eb.or([
				eb.exists(
					eb
						.selectFrom("lucid_queue_job_tenants")
						.select("lucid_queue_job_tenants.id")
						.whereRef(
							"lucid_queue_job_tenants.queue_job_id",
							"=",
							"lucid_queue_jobs.id",
						)
						.where("lucid_queue_job_tenants.tenant_key", "=", tenantKey),
				),
				eb.not(
					eb.exists(
						eb
							.selectFrom("lucid_queue_job_tenants")
							.select("lucid_queue_job_tenants.id")
							.whereRef(
								"lucid_queue_job_tenants.queue_job_id",
								"=",
								"lucid_queue_jobs.id",
							),
					),
				),
			]),
		);
	}
}
