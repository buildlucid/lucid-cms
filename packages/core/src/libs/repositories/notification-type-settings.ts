import type { LucidDatabase } from "../db/client/index.js";
import type { LucidNotificationTypeSettings } from "../db/tables/index.js";
import { notificationTypeSettingsTable } from "../db/tables/notification-type-settings.js";
import type { Insert } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class NotificationTypeSettingsRepository extends StaticRepository<"lucid_notification_type_settings"> {
	constructor(db: LucidDatabase) {
		super(db, notificationTypeSettingsTable);
	}

	async upsertSingle(props: { data: Insert<LucidNotificationTypeSettings> }) {
		const query = this.db
			.insertInto("lucid_notification_type_settings")
			.values(this.asInsertData(props.data))
			.onConflict((conflict) =>
				conflict.column("type").doUpdateSet((eb) => ({
					enabled: eb.ref("excluded.enabled"),
					email_enabled: eb.ref("excluded.email_enabled"),
					role_ids: eb.ref("excluded.role_ids"),
					updated_by: eb.ref("excluded.updated_by"),
					updated_at: eb.ref("excluded.updated_at"),
				})),
			);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "upsertSingle",
		});

		return exec.response;
	}
}
