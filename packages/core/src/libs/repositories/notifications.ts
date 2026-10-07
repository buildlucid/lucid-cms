import { sql } from "kysely";
import type { QueryParams } from "../../types/query-params.js";
import type { LucidDatabase } from "../db/client/index.js";
import queryBuilder from "../db/query-builder/index.js";
import type { LucidNotifications } from "../db/tables/index.js";
import { notificationsTable } from "../db/tables/notifications.js";
import type { Insert, Select } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class NotificationsRepository extends StaticRepository<"lucid_notifications"> {
	constructor(db: LucidDatabase) {
		super(db, notificationsTable);
	}

	/** One person's notifications with their read state. The status filter picks inbox, unread, attention or archived. */
	async selectMultipleForUser<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				userId: number;
				queryParams: Partial<QueryParams>;
			}
		>,
	) {
		const trueValue = this.dbAdapter.getDefault("boolean", "true");
		const base = this.db
			.selectFrom("lucid_notifications")
			.innerJoin(
				"lucid_notification_recipients",
				"lucid_notification_recipients.notification_id",
				"lucid_notifications.id",
			)
			.where("lucid_notification_recipients.user_id", "=", props.userId)
			//* without a status filter the inbox is shown
			.$if(props.queryParams.filter?.status === undefined, (qb) =>
				qb.where("lucid_notification_recipients.archived_at", "is", null),
			);

		const { main, count } = queryBuilder.main(
			{
				main: base.select([
					"lucid_notifications.id",
					"lucid_notifications.type",
					"lucid_notifications.key",
					"lucid_notifications.category",
					"lucid_notifications.level",
					"lucid_notifications.action_required",
					"lucid_notifications.title",
					"lucid_notifications.body",
					"lucid_notifications.href",
					"lucid_notifications.data",
					"lucid_notifications.actor_user_id",
					"lucid_notifications.resolved_at",
					"lucid_notifications.created_at",
					"lucid_notifications.updated_at",
					"lucid_notification_recipients.read_at",
					"lucid_notification_recipients.archived_at",
				]),
				count: base.select(sql`count(*)`.as("count")),
			},
			{
				queryParams: props.queryParams,
				database: this.dbAdapter.config,
				meta: {
					...this.config.queryConfig,
					customFilters: {
						status: ({ eb, filter }) => {
							const inbox = eb(
								"lucid_notification_recipients.archived_at",
								"is",
								null,
							);
							switch (filter.value) {
								case "unread":
									return eb.and([
										inbox,
										eb("lucid_notification_recipients.read_at", "is", null),
									]);
								case "attention":
									return eb.and([
										inbox,
										eb("lucid_notifications.action_required", "=", trueValue),
										eb("lucid_notifications.resolved_at", "is", null),
									]);
								case "archived":
									return eb(
										"lucid_notification_recipients.archived_at",
										"is not",
										null,
									);
								default:
									return inbox;
							}
						},
					},
				},
			},
		);

		const countQuery = count?.$narrowType<{ count: number }>();
		const exec = await this.executeQuery(
			() => Promise.all([main.execute(), countQuery?.executeTakeFirst()]),
			{
				method: "selectMultipleForUser",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple-count",
			select: [
				"id",
				"type",
				"key",
				"category",
				"level",
				"action_required",
				"title",
				"body",
				"href",
				"data",
				"actor_user_id",
				"resolved_at",
				"created_at",
				"updated_at",
				"read_at",
				"archived_at",
			],
		});
	}
	/** Creates a notification unless one with the same type and key exists. Returns nothing when it already does. */
	async createIfKeyAbsent<
		K extends keyof Select<LucidNotifications>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				data: Partial<Insert<LucidNotifications>>;
				returning: K[];
			}
		>,
	) {
		const query = this.db
			.insertInto("lucid_notifications")
			.values(this.asInsertData(props.data))
			.onConflict((conflict) => conflict.columns(["type", "key"]).doNothing())
			.returning(props.returning);

		const exec = await this.executeQuery(
			() =>
				query.executeTakeFirst() as Promise<
					Pick<Select<LucidNotifications>, K> | undefined
				>,
			{ method: "createIfKeyAbsent" },
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.returning,
		});
	}
	/** Unread and to-do counts for the bell, with the latest inbox change so the client knows when to refetch. */
	async selectSummaryForUser(props: { userId: number }) {
		const trueValue = this.dbAdapter.getDefault("boolean", "true");
		const query = this.db
			.selectFrom("lucid_notifications")
			.innerJoin(
				"lucid_notification_recipients",
				"lucid_notification_recipients.notification_id",
				"lucid_notifications.id",
			)
			.where("lucid_notification_recipients.user_id", "=", props.userId)
			.where("lucid_notification_recipients.archived_at", "is", null)
			.select([
				sql<number>`sum(case when lucid_notification_recipients.read_at is null then 1 else 0 end)`.as(
					"unread",
				),
				sql<number>`sum(case when lucid_notifications.action_required = ${trueValue} and lucid_notifications.resolved_at is null then 1 else 0 end)`.as(
					"action_required",
				),
				sql<string | null>`max(lucid_notifications.updated_at)`.as(
					"latest_updated_at",
				),
			]);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSummaryForUser",
		});
		return exec.response;
	}
	/** Removes old notifications, keeping open to-dos until they are resolved, and any notification nobody receives any more. */
	async deleteExpired(props: { before: string }) {
		const trueValue = this.dbAdapter.getDefault("boolean", "true");
		const query = this.db
			.deleteFrom("lucid_notifications")
			.where((eb) =>
				eb.or([
					eb.and([
						eb("updated_at", "<", props.before),
						eb.or([
							eb("action_required", "!=", trueValue),
							eb("resolved_at", "is not", null),
						]),
					]),
					eb.not(
						eb.exists(
							eb
								.selectFrom("lucid_notification_recipients")
								.select(sql.lit(1).as("one"))
								.whereRef(
									"lucid_notification_recipients.notification_id",
									"=",
									"lucid_notifications.id",
								),
						),
					),
				]),
			);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "deleteExpired",
		});
		return exec.response;
	}
}
