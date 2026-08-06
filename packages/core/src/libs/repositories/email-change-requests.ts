import constants from "../../constants/constants.js";
import type { LucidDatabase } from "../db/client/index.js";
import { emailChangeRequestsTable } from "../db/tables/email-change-requests.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class EmailChangeRequestsRepository extends StaticRepository<"lucid_email_change_requests"> {
	constructor(db: LucidDatabase) {
		super(db, emailChangeRequestsTable);
	}

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
