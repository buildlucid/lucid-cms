import type { LucidDatabase } from "../db/client/index.js";
import type { LucidNotificationPreferences } from "../db/tables/index.js";
import { notificationPreferencesTable } from "../db/tables/notification-preferences.js";
import type { Insert } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class NotificationPreferencesRepository extends StaticRepository<"lucid_notification_preferences"> {
	constructor(db: LucidDatabase) {
		super(db, notificationPreferencesTable);
	}

	async upsertMultiple(props: {
		data: Insert<LucidNotificationPreferences>[];
	}) {
		const query = this.db
			.insertInto("lucid_notification_preferences")
			.values(props.data.map((row) => this.asInsertData(row)))
			.onConflict((conflict) =>
				conflict.columns(["user_id", "type"]).doUpdateSet((eb) => ({
					email_enabled: eb.ref("excluded.email_enabled"),
				})),
			);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "upsertMultiple",
		});
		return exec.response;
	}
}
