import type { UserPreferences } from "../../types/response.js";
import type { LucidDatabase } from "../db/client/index.js";
import { userPreferencesTable } from "../db/tables/user-preferences.js";
import StaticRepository from "./parents/static-repository.js";

export default class UserPreferencesRepository extends StaticRepository<"lucid_user_preferences"> {
	constructor(db: LucidDatabase) {
		super(db, userPreferencesTable);
	}

	/** Creates a preferences row or replaces its entire preferences object. */
	async upsertSingle(props: { userId: number; preferences: UserPreferences }) {
		const query = this.db
			.insertInto("lucid_user_preferences")
			.values(
				this.asInsertData({
					user_id: props.userId,
					preferences: props.preferences,
					updated_at: new Date().toISOString(),
				}),
			)
			.onConflict((conflict) =>
				conflict.column("user_id").doUpdateSet((eb) => ({
					preferences: eb.ref("excluded.preferences"),
					updated_at: eb.ref("excluded.updated_at"),
				})),
			);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "upsertSingle",
		});
		return exec.response;
	}
}
