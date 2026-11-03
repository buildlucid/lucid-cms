import { type SqlBool, sql } from "kysely";
import type { DeployRunSource, DeployRunStatus } from "../../types/response.js";
import type { LucidDatabase } from "../db/client/index.js";
import { deployRunsTable } from "../db/tables/deploy-runs.js";
import StaticRepository from "./parents/static-repository.js";

export default class DeployRunsRepository extends StaticRepository<"lucid_deploy_runs"> {
	constructor(db: LucidDatabase) {
		super(db, deployRunsTable);
	}

	// ----------------------------------------
	// queries

	/** Each deploy's latest runs among `statuses`, newest first, such as its recent finished runs. */
	async selectRecent(props: {
		deployKeys: string[];
		statuses: DeployRunStatus[];
		limit: number;
	}) {
		const ranked = this.db
			.selectFrom("lucid_deploy_runs")
			.select((eb) => [
				"id",
				"deploy_key",
				"status",
				"source",
				"trigger_count",
				"started_by_user_id",
				"agent_run_id",
				"url",
				"message",
				"created_at",
				"started_at",
				"finished_at",
				eb.fn
					.agg<number>("row_number")
					.over((ob) => ob.partitionBy("deploy_key").orderBy("id", "desc"))
					.as("position"),
			])
			.where("deploy_key", "in", props.deployKeys)
			.where("status", "in", props.statuses);
		const query = this.db
			.selectFrom(ranked.as("ranked"))
			.select([
				"id",
				"deploy_key",
				"status",
				"source",
				"trigger_count",
				"started_by_user_id",
				"agent_run_id",
				"url",
				"message",
				"created_at",
				"started_at",
				"finished_at",
			])
			.where("position", "<=", props.limit)
			.orderBy("id", "desc");

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectRecent",
		});

		return exec.response;
	}

	/** A later run of the deploy that reached its host, which then owns the deploy's failure notification. */
	async selectNewerReached(props: { deployKey: string; id: number }) {
		const query = this.db
			.selectFrom("lucid_deploy_runs")
			.select("id")
			.where("deploy_key", "=", props.deployKey)
			.where("id", ">", props.id)
			.where("status", "not in", ["queued", "starting", "cancelled"])
			.limit(1);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectNewerReached",
		});

		return exec.response;
	}

	// ----------------------------------------
	// creates

	/**
	 * Adds to the deploy's queued run, creating it when there isn't one. Manual, scheduled, toolkit
	 * and agent runs take over the queued run's source, person and agent.
	 */
	async upsertQueued(props: {
		deployKey: string;
		source: DeployRunSource;
		triggerCount: number;
		startedByUserId: number | null;
		agentRunId: string | null;
	}) {
		const query = this.db
			.insertInto("lucid_deploy_runs")
			.values({
				deploy_key: props.deployKey,
				status: "queued",
				source: props.source,
				trigger_count: props.triggerCount,
				started_by_user_id: props.startedByUserId,
				agent_run_id: props.agentRunId,
			})
			.onConflict((conflict) =>
				conflict
					.column("deploy_key")
					.where(sql<SqlBool>`status = 'queued'`)
					.doUpdateSet((eb) => ({
						trigger_count: eb(
							"lucid_deploy_runs.trigger_count",
							"+",
							eb.ref("excluded.trigger_count"),
						),
						source: eb
							.case()
							.when(eb.ref("excluded.source"), "=", "trigger")
							.then(eb.ref("lucid_deploy_runs.source"))
							.else(eb.ref("excluded.source"))
							.end(),
						started_by_user_id: eb
							.case()
							.when(eb.ref("excluded.source"), "=", "trigger")
							.then(eb.ref("lucid_deploy_runs.started_by_user_id"))
							.else(eb.ref("excluded.started_by_user_id"))
							.end(),
						agent_run_id: eb
							.case()
							.when(eb.ref("excluded.source"), "=", "trigger")
							.then(eb.ref("lucid_deploy_runs.agent_run_id"))
							.else(eb.ref("excluded.agent_run_id"))
							.end(),
					})),
			)
			.returning("id");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "upsertQueued",
		});

		return exec.response;
	}

	// ----------------------------------------
	// updates

	/** Moves a queued run to starting, unless its deploy already has a starting or running run. */
	async markStarting(props: {
		id: number;
		deployKey: string;
		startedAt: string;
		expiresAt: string;
	}) {
		const query = this.db
			.updateTable("lucid_deploy_runs")
			.set({
				status: "starting",
				started_at: props.startedAt,
				expires_at: props.expiresAt,
			})
			.where("id", "=", props.id)
			.where("status", "=", "queued")
			.where((eb) =>
				eb.not(
					eb.exists(
						eb
							.selectFrom("lucid_deploy_runs as active")
							.select("active.id")
							.where("active.deploy_key", "=", props.deployKey)
							.where("active.status", "in", ["starting", "running"]),
					),
				),
			)
			.returning("id");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "markStarting",
		});

		return exec.response;
	}

	// ----------------------------------------
	// deletes

	/** Deletes runs that finished before the configured retention date. */
	async deleteFinishedBefore(date: string) {
		const query = this.db
			.deleteFrom("lucid_deploy_runs")
			.where("finished_at", "<", date);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "deleteFinishedBefore",
		});

		return exec.response;
	}
}
