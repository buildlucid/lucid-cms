import type { LucidDatabase } from "../db/client/index.js";
import { notificationRecipientsTable } from "../db/tables/notification-recipients.js";
import StaticRepository from "./parents/static-repository.js";

export default class NotificationRecipientsRepository extends StaticRepository<"lucid_notification_recipients"> {
	constructor(db: LucidDatabase) {
		super(db, notificationRecipientsTable);
	}

	/** People still to be emailed about a revision, with their address and email preference for the type. */
	async selectEmailCandidates(props: {
		notificationId: number;
		revision: number;
		type: string;
	}) {
		const falseValue = this.dbAdapter.getDefault("boolean", "false");
		const query = this.db
			.selectFrom("lucid_notification_recipients")
			.innerJoin(
				"lucid_users",
				"lucid_users.id",
				"lucid_notification_recipients.user_id",
			)
			.leftJoin("lucid_notification_preferences", (join) =>
				join
					.onRef(
						"lucid_notification_preferences.user_id",
						"=",
						"lucid_notification_recipients.user_id",
					)
					.on("lucid_notification_preferences.type", "=", props.type),
			)
			.select([
				"lucid_notification_recipients.user_id",
				"lucid_users.email",
				"lucid_notification_preferences.email_enabled",
			])
			.where(
				"lucid_notification_recipients.notification_id",
				"=",
				props.notificationId,
			)
			.where((eb) =>
				eb.or([
					eb("lucid_notification_recipients.emailed_revision", "is", null),
					eb(
						"lucid_notification_recipients.emailed_revision",
						"<",
						props.revision,
					),
				]),
			)
			.where("lucid_users.is_deleted", "=", falseValue)
			.where("lucid_users.is_locked", "=", falseValue);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectEmailCandidates",
		});
		return exec.response;
	}
	/** Marks a person as handled for a revision. Returns nothing when another job already did, so nobody is emailed twice. */
	async claimEmail(props: {
		notificationId: number;
		userId: number;
		revision: number;
	}) {
		const query = this.db
			.updateTable("lucid_notification_recipients")
			.set({ emailed_revision: props.revision })
			.where("notification_id", "=", props.notificationId)
			.where("user_id", "=", props.userId)
			.where((eb) =>
				eb.or([
					eb("emailed_revision", "is", null),
					eb("emailed_revision", "<", props.revision),
				]),
			)
			.returning(["user_id"]);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "claimEmail",
		});
		return exec.response;
	}
}
