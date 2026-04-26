import z from "zod";
import constants from "../../constants/constants.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class EmailChangeRequestsRepository extends StaticRepository<"lucid_email_change_requests"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_email_change_requests");
	}
	tableSchema = z.object({
		id: z.number(),
		user_id: z.number(),
		old_email: z.email(),
		new_email: z.email(),
		confirm_token_id: z.number(),
		revert_token_id: z.number(),
		status: z.union([
			z.literal(constants.emailChangeRequestStatuses.pending),
			z.literal(constants.emailChangeRequestStatuses.confirmed),
			z.literal(constants.emailChangeRequestStatuses.cancelled),
			z.literal(constants.emailChangeRequestStatuses.reverted),
			z.literal(constants.emailChangeRequestStatuses.superseded),
		]),
		confirmed_at: z.union([z.string(), z.date()]).nullable(),
		cancelled_at: z.union([z.string(), z.date()]).nullable(),
		reverted_at: z.union([z.string(), z.date()]).nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
		expires_at: z.union([z.string(), z.date()]),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		user_id: this.dbAdapter.getDataType("integer"),
		old_email: this.dbAdapter.getDataType("text"),
		new_email: this.dbAdapter.getDataType("text"),
		confirm_token_id: this.dbAdapter.getDataType("integer"),
		revert_token_id: this.dbAdapter.getDataType("integer"),
		status: this.dbAdapter.getDataType("varchar", 255),
		confirmed_at: this.dbAdapter.getDataType("timestamp"),
		cancelled_at: this.dbAdapter.getDataType("timestamp"),
		reverted_at: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
		expires_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				userId: "user_id",
				oldEmail: "old_email",
				newEmail: "new_email",
				status: "status",
			},
			sorts: {
				createdAt: "created_at",
				updatedAt: "updated_at",
				expiresAt: "expires_at",
			},
		},
		operators: {
			oldEmail: this.dbAdapter.config.fuzzOperator,
			newEmail: this.dbAdapter.config.fuzzOperator,
		},
	} as const;

	// ----------------------------------------
	// queries
	async selectActivePendingForUser<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				userId: number;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_email_change_requests")
			.select([
				"id",
				"user_id",
				"old_email",
				"new_email",
				"confirm_token_id",
				"revert_token_id",
				"status",
				"confirmed_at",
				"cancelled_at",
				"reverted_at",
				"created_at",
				"updated_at",
				"expires_at",
			])
			.where("user_id", "=", props.userId)
			.where("status", "=", constants.emailChangeRequestStatuses.pending)
			.where("expires_at", ">", new Date().toISOString());

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectActivePendingForUser",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"user_id",
				"old_email",
				"new_email",
				"confirm_token_id",
				"revert_token_id",
				"status",
				"confirmed_at",
				"cancelled_at",
				"reverted_at",
				"created_at",
				"updated_at",
				"expires_at",
			],
		});
	}

	async selectByConfirmTokenId<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				tokenId: number;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_email_change_requests")
			.select([
				"id",
				"user_id",
				"old_email",
				"new_email",
				"confirm_token_id",
				"revert_token_id",
				"status",
				"confirmed_at",
				"cancelled_at",
				"reverted_at",
				"created_at",
				"updated_at",
				"expires_at",
			])
			.where("confirm_token_id", "=", props.tokenId)
			.where("expires_at", ">", new Date().toISOString());

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectByConfirmTokenId",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"user_id",
				"old_email",
				"new_email",
				"confirm_token_id",
				"revert_token_id",
				"status",
				"confirmed_at",
				"cancelled_at",
				"reverted_at",
				"created_at",
				"updated_at",
				"expires_at",
			],
		});
	}

	async selectByRevertTokenId<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				tokenId: number;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_email_change_requests")
			.select([
				"id",
				"user_id",
				"old_email",
				"new_email",
				"confirm_token_id",
				"revert_token_id",
				"status",
				"confirmed_at",
				"cancelled_at",
				"reverted_at",
				"created_at",
				"updated_at",
				"expires_at",
			])
			.where("revert_token_id", "=", props.tokenId)
			.where("expires_at", ">", new Date().toISOString());

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectByRevertTokenId",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"user_id",
				"old_email",
				"new_email",
				"confirm_token_id",
				"revert_token_id",
				"status",
				"confirmed_at",
				"cancelled_at",
				"reverted_at",
				"created_at",
				"updated_at",
				"expires_at",
			],
		});
	}

	async selectReservedByEmail<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				email: string;
				excludeUserId?: number;
			}
		>,
	) {
		const now = new Date().toISOString();
		let query = this.db
			.selectFrom("lucid_email_change_requests")
			.select([
				"id",
				"user_id",
				"old_email",
				"new_email",
				"confirm_token_id",
				"revert_token_id",
				"status",
				"confirmed_at",
				"cancelled_at",
				"reverted_at",
				"created_at",
				"updated_at",
				"expires_at",
			])
			.where((eb) =>
				eb.or([
					eb.and([
						eb("new_email", "=", props.email),
						eb("status", "=", constants.emailChangeRequestStatuses.pending),
						eb("expires_at", ">", now),
					]),
					eb.and([
						eb("old_email", "=", props.email),
						eb("status", "=", constants.emailChangeRequestStatuses.confirmed),
						eb("expires_at", ">", now),
					]),
				]),
			);

		if (props.excludeUserId !== undefined) {
			query = query.where("user_id", "!=", props.excludeUserId);
		}

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectReservedByEmail",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"user_id",
				"old_email",
				"new_email",
				"confirm_token_id",
				"revert_token_id",
				"status",
				"confirmed_at",
				"cancelled_at",
				"reverted_at",
				"created_at",
				"updated_at",
				"expires_at",
			],
		});
	}
}
