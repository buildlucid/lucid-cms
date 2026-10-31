import type { LucidDatabase } from "../db/client/index.js";
import { userRecoveryCodesTable } from "../db/tables/user-recovery-codes.js";
import StaticRepository from "./parents/static-repository.js";

export default class UserRecoveryCodesRepository extends StaticRepository<"lucid_user_recovery_codes"> {
	constructor(db: LucidDatabase) {
		super(db, userRecoveryCodesTable);
	}

	// ----------------------------------------
	// updates
	/** Uses up one of a user's recovery codes by its hash. Returns false when it isn't an unused code of theirs. */
	async useCode(props: { userId: number; code: string }) {
		const query = this.db
			.updateTable("lucid_user_recovery_codes")
			.set({ used_at: new Date().toISOString() })
			.where("user_id", "=", props.userId)
			.where("code", "=", props.code)
			.where("used_at", "is", null)
			.returning("id");

		const exec = await this.executeQuery(() => query.execute(), {
			method: "useCode",
		});
		if (exec.response.error) return exec.response;

		return {
			error: undefined,
			data: (exec.response.data ?? []).length > 0,
		};
	}
}
