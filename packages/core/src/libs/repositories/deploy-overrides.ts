import type { LucidDatabase } from "../db/client/index.js";
import { deployOverridesTable } from "../db/tables/deploy-overrides.js";
import StaticRepository from "./parents/static-repository.js";

export default class DeployOverridesRepository extends StaticRepository<"lucid_deploy_overrides"> {
	constructor(db: LucidDatabase) {
		super(db, deployOverridesTable);
	}

	// ----------------------------------------
	// creates

	/** Turns a deploy off, keeping the first time it was turned off when repeated. */
	async upsertDisabled(props: {
		deployKey: string;
		disabledAt: string;
		disabledByUserId: number | null;
	}) {
		const query = this.db
			.insertInto("lucid_deploy_overrides")
			.values({
				deploy_key: props.deployKey,
				disabled_at: props.disabledAt,
				disabled_by_user_id: props.disabledByUserId,
			})
			.onConflict((conflict) => conflict.column("deploy_key").doNothing());

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "upsertDisabled",
		});

		return exec.response;
	}
}
