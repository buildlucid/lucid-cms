import type { QueryParams } from "../../types/query-params.js";
import type { LucidDatabase } from "../db/client/index.js";
import queryBuilder from "../db/query-builder/index.js";
import { agentRoutinesTable } from "../db/tables/agent-routines.js";
import type { AgentPermissionAction } from "../permission/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class AgentRoutinesRepository extends StaticRepository<"lucid_agent_routines"> {
	constructor(db: LucidDatabase) {
		super(db, agentRoutinesTable);
	}

	async selectMultipleFilteredForAccess(props: {
		userId: number;
		agentKeys: Record<AgentPermissionAction, string[]>;
		queryParams: Partial<QueryParams>;
	}) {
		const accessible = this.db
			.selectFrom("lucid_agent_routines")
			.where((eb) =>
				eb.or([
					...(props.agentKeys["manage-own-routines"].length
						? [
								eb.and([
									eb("source", "=", "database"),
									eb("user_id", "=", props.userId),
									eb("agent_key", "in", props.agentKeys["manage-own-routines"]),
								]),
							]
						: []),
					...(props.agentKeys["manage-code-routines"].length
						? [
								eb.and([
									eb("source", "=", "code"),
									eb(
										"agent_key",
										"in",
										props.agentKeys["manage-code-routines"],
									),
								]),
							]
						: []),
				]),
			);
		const { main, count } = queryBuilder.main(
			{
				main: accessible.select([
					"id",
					"agent_key",
					"key",
					"source",
					"name",
					"instructions",
					"model_selection",
					"conversation_mode",
					"conversation_id",
					"cron",
					"timezone",
					"enabled",
					"user_id",
					"next_run_at",
					"created_at",
					"updated_at",
				]),
				count: accessible.select((eb) => eb.fn.countAll<number>().as("count")),
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
				"model_selection",
				"conversation_mode",
				"conversation_id",
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
		const query = this.db
			.selectFrom("lucid_agent_routines")
			.selectAll()
			.where("enabled", "=", this.dbAdapter.getDefault("boolean", "true"))
			.where("next_run_at", "<=", props.now)
			.orderBy("next_run_at", "asc")
			.limit(props.limit);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectDue",
		});

		return exec.response;
	}
	/** Advances a due occurrence. Only one scheduler can claim it. */
	async claimOccurrence(props: {
		id: string;
		expectedNextRunAt: string;
		nextRunAt: string;
		now: string;
	}) {
		const query = this.db
			.updateTable("lucid_agent_routines")
			.set({ next_run_at: props.nextRunAt, updated_at: props.now })
			.where("id", "=", props.id)
			.where("next_run_at", "=", props.expectedNextRunAt)
			.returning("id");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "claimOccurrence",
		});
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data !== undefined };
	}
}
