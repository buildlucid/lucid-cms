import type { LucidDatabase } from "../db/client/index.js";
import { notificationRecipientsTable } from "../db/tables/notification-recipients.js";
import StaticRepository from "./parents/static-repository.js";

export default class NotificationRecipientsRepository extends StaticRepository<"lucid_notification_recipients"> {
	constructor(db: LucidDatabase) {
		super(db, notificationRecipientsTable);
	}

	/** People whose notification emails are due, oldest first, with their address and email preference for the type. */
	async selectDueEmails(props: {
		before: string;
		notificationId?: number;
		limit?: number;
	}) {
		const query = this.db
			.selectFrom("lucid_notification_recipients")
			.innerJoin(
				"lucid_notifications",
				"lucid_notifications.id",
				"lucid_notification_recipients.notification_id",
			)
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
					.onRef(
						"lucid_notification_preferences.type",
						"=",
						"lucid_notifications.type",
					),
			)
			.select([
				"lucid_notification_recipients.notification_id",
				"lucid_notification_recipients.user_id",
				"lucid_notification_recipients.read_at",
				"lucid_notification_recipients.archived_at",
				"lucid_users.email",
				"lucid_users.is_deleted",
				"lucid_users.is_locked",
				"lucid_notification_preferences.email_enabled",
			])
			.where("lucid_notification_recipients.email_due_at", "<=", props.before)
			.$if(props.notificationId !== undefined, (qb) =>
				qb.where(
					"lucid_notification_recipients.notification_id",
					"=",
					props.notificationId ?? 0,
				),
			)
			.orderBy("lucid_notification_recipients.email_due_at")
			.$if(props.limit !== undefined, (qb) => qb.limit(props.limit ?? 0));

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectDueEmails",
		});
		return exec.response;
	}
	/** Drops emails that have been due since before the cutoff, so a paused or stalled job doesn't send old news. */
	async clearExpiredEmails(props: { before: string }) {
		const query = this.db
			.updateTable("lucid_notification_recipients")
			.set({ email_due_at: null })
			.where("email_due_at", "<", props.before);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "clearExpiredEmails",
		});
		return exec.response;
	}
	/** Clears a person's due email. Returns nothing when another job already did or it was pushed back, so nobody is emailed twice. */
	async claimEmail(props: {
		notificationId: number;
		userId: number;
		before: string;
	}) {
		const query = this.db
			.updateTable("lucid_notification_recipients")
			.set({ email_due_at: null })
			.where("notification_id", "=", props.notificationId)
			.where("user_id", "=", props.userId)
			.where("email_due_at", "<=", props.before)
			.returning(["user_id"]);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "claimEmail",
		});
		return exec.response;
	}
}
