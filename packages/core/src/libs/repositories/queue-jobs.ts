import type { QueryParams } from "../../types/query-params.js";
import type { LucidDatabase } from "../db/client/index.js";
import queryBuilder from "../db/query-builder/index.js";
import type { LucidQueueJobs } from "../db/tables/index.js";
import { queueJobsTable } from "../db/tables/queue-jobs.js";
import type { Select } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class QueueJobsRepository extends StaticRepository<"lucid_queue_jobs"> {
	constructor(db: LucidDatabase) {
		super(db, queueJobsTable);
	}

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
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_queue_jobs")
			.select(props.select)
			.where("id", "=", props.id);

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
			}
		>,
	) {
		const exec = await this.executeQuery(
			async () => {
				const mainQuery = this.db
					.selectFrom("lucid_queue_jobs")
					.select(props.select);
				const countQuery = this.db
					.selectFrom("lucid_queue_jobs")
					.select((eb) => eb.fn.countAll().as("count"));

				const { main, count } = queryBuilder.main(
					{
						main: mainQuery,
						count: countQuery,
					},
					{
						queryParams: props.queryParams,
						database: this.dbAdapter.config,
						meta: this.config.queryConfig,
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
}
