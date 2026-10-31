import type { LucidDatabase } from "../db/client/index.js";
import {
	type PasskeyChallengePurpose,
	passkeyChallengesTable,
} from "../db/tables/passkey-challenges.js";
import StaticRepository from "./parents/static-repository.js";

export default class PasskeyChallengesRepository extends StaticRepository<"lucid_passkey_challenges"> {
	constructor(db: LucidDatabase) {
		super(db, passkeyChallengesTable);
	}

	// ----------------------------------------
	// updates
	/** Consumes an unexpired challenge once, matching its user when bound. Returns false if unavailable. */
	async consume(props: {
		challenge: string;
		purpose: PasskeyChallengePurpose;
		/** The user adding a passkey or finishing a two-factor step. Left out for sign-ins. */
		userId?: number;
	}) {
		const now = new Date().toISOString();

		let query = this.db
			.updateTable("lucid_passkey_challenges")
			.set({ consumed_at: now })
			.where("challenge", "=", props.challenge)
			.where("purpose", "=", props.purpose)
			.where("expiry_date", ">", now)
			.where("consumed_at", "is", null)
			.returning("id");

		query =
			props.userId === undefined
				? query.where("user_id", "is", null)
				: query.where("user_id", "=", props.userId);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "consume",
		});
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data !== undefined };
	}
}
