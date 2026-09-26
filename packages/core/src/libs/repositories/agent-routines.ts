import type { QueryParams } from "../../types/query-params.js";
import type { LucidDatabase } from "../db/client/index.js";
import queryBuilder from "../db/query-builder/index.js";
import { agentRoutinesTable } from "../db/tables/agent-routines.js";
import StaticRepository from "./parents/static-repository.js";

export default class AgentRoutinesRepository extends StaticRepository<"lucid_agent_routines"> {
	constructor(db: LucidDatabase) {
		super(db, agentRoutinesTable);
	}

	/** Lists a user's own routines for agents they use, and code routines for agents they manage. */
	async selectMultipleFilteredForAccess(props: {
		userId: number;
		agentKeys: { use: string[]; manage: string[] };
		queryParams: Partial<QueryParams>;
	}) {
		const { main, count } = queryBuilder.main(
			{
				main: this.db
					.selectFrom("lucid_agent_routines")
					.select([
						"id",
						"agent_key",
						"key",
						"source",
						"name",
						"instructions",
						"cron",
						"timezone",
						"enabled",
						"user_id",
						"next_run_at",
						"created_at",
						"updated_at",
					])
					.where((eb) =>
						eb.or([
							...(props.agentKeys.use.length
								? [
										eb.and([
											eb("source", "=", "database"),
											eb("user_id", "=", props.userId),
											eb("agent_key", "in", props.agentKeys.use),
										]),
									]
								: []),
							...(props.agentKeys.manage.length
								? [
										eb.and([
											eb("source", "=", "code"),
											eb("agent_key", "in", props.agentKeys.manage),
										]),
									]
								: []),
						]),
					),
				count: this.db
					.selectFrom("lucid_agent_routines")
					.select((eb) => eb.fn.countAll<number>().as("count"))
					.where((eb) =>
						eb.or([
							...(props.agentKeys.use.length
								? [
										eb.and([
											eb("source", "=", "database"),
											eb("user_id", "=", props.userId),
											eb("agent_key", "in", props.agentKeys.use),
										]),
									]
								: []),
							...(props.agentKeys.manage.length
								? [
										eb.and([
											eb("source", "=", "code"),
											eb("agent_key", "in", props.agentKeys.manage),
										]),
									]
								: []),
						]),
					),
			},
			{
				queryParams: props.queryParams,
				database: this.dbAdapter.config,
				meta: this.config.queryConfig,
			},
		);

		const exec = await this.executeQuery(
			() =>
				Promise.all([
					main.execute(),
					count?.executeTakeFirst() as Promise<{ count: number } | undefined>,
				]),
			{ method: "selectMultipleFilteredForAccess" },
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			enabled: true,
			mode: "multiple-count",
			select: [
				"id",
				"agent_key",
				"key",
				"source",
				"name",
				"instructions",
				"cron",
				"timezone",
				"enabled",
				"user_id",
				"next_run_at",
				"created_at",
				"updated_at",
			],
		});
	}
	async selectDue(props: { now: string; limit: number }) {
		const exec = await this.executeQuery(
			() =>
				this.db
					.selectFrom("lucid_agent_routines")
					.selectAll()
					.where("enabled", "=", this.dbAdapter.getDefault("boolean", "true"))
					.where("next_run_at", "<=", props.now)
					.orderBy("next_run_at", "asc")
					.limit(props.limit)
					.execute(),
			{ method: "selectDue" },
		);

		return exec.response;
	}
	/** Advances a due occurrence. Only one scheduler can claim it. */
	async claimOccurrence(props: {
		id: string;
		expectedNextRunAt: string;
		nextRunAt: string;
		now: string;
	}) {
		const exec = await this.executeQuery(
			() =>
				this.db
					.updateTable("lucid_agent_routines")
					.set({ next_run_at: props.nextRunAt, updated_at: props.now })
					.where("id", "=", props.id)
					.where("next_run_at", "=", props.expectedNextRunAt)
					.returning("id")
					.executeTakeFirst(),
			{ method: "claimOccurrence" },
		);
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data !== undefined };
	}
}
