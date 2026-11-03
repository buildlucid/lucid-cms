import type { LucidDatabase } from "../db/client/index.js";
import { deployTriggersTable } from "../db/tables/deploy-triggers.js";
import StaticRepository from "./parents/static-repository.js";

export default class DeployTriggersRepository extends StaticRepository<"lucid_deploy_triggers"> {
	constructor(db: LucidDatabase) {
		super(db, deployTriggersTable);
	}

	// ----------------------------------------
	// queries

	/** Summarises waiting triggers per deploy, with `last_id` bounding what a run claims. */
	async selectPending(props?: { deployKeys?: string[] }) {
		const query = this.db
			.selectFrom("lucid_deploy_triggers")
			.select((eb) => [
				"deploy_key",
				eb.fn.countAll<number | string>().as("count"),
				eb.fn.min("created_at").as("first_at"),
				eb.fn.max("created_at").as("last_at"),
				eb.fn.max("id").as("last_id"),
			])
			.$if(props?.deployKeys !== undefined, (qb) =>
				qb.where("deploy_key", "in", props?.deployKeys ?? []),
			)
			.groupBy("deploy_key");

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectPending",
		});

		return exec.response;
	}

	// ----------------------------------------
	// deletes

	/**
	 * Claims a deploy's triggers up to and including `lastId`, leaving any that arrived since.
	 * @remarks Returns the rows this call removed, so concurrent claims never count a trigger twice.
	 */
	async claimThrough(props: { deployKey: string; lastId: number }) {
		const query = this.db
			.deleteFrom("lucid_deploy_triggers")
			.where("deploy_key", "=", props.deployKey)
			.where("id", "<=", props.lastId)
			.returning("id");

		const exec = await this.executeQuery(() => query.execute(), {
			method: "claimThrough",
		});

		return exec.response;
	}
}
