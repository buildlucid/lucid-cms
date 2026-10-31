import { sql } from "kysely";
import constants from "../../constants/constants.js";
import type { LucidDatabase } from "../db/client/index.js";
import { userTokensTable } from "../db/tables/user-tokens.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class UserTokensRepository extends StaticRepository<"lucid_user_tokens"> {
	constructor(db: LucidDatabase) {
		super(db, userTokensTable);
	}

	// ----------------------------------------
	// queries
	async selectUserInvitation<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				id: number;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_user_tokens")
			.select([
				"lucid_user_tokens.id",
				"lucid_user_tokens.user_id",
				"lucid_user_tokens.token_type",
				"lucid_user_tokens.token",
				"lucid_user_tokens.created_at",
				"lucid_user_tokens.expiry_date",
			])
			.innerJoin("lucid_users", "lucid_users.id", "lucid_user_tokens.user_id")
			.select([
				"lucid_users.email as user_email",
				"lucid_users.first_name as user_first_name",
				"lucid_users.last_name as user_last_name",
				"lucid_users.invitation_accepted as user_invitation_accepted",
				"lucid_users.is_deleted as user_is_deleted",
				"lucid_users.is_locked as user_is_locked",
			])
			.where("lucid_user_tokens.expiry_date", ">", new Date().toISOString())
			.where("lucid_user_tokens.revoked_at", "is", null)
			.where("lucid_user_tokens.consumed_at", "is", null)
			.where("lucid_user_tokens.id", "=", props.id);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectUserInvitation",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"user_id",
				"token_type",
				"token",
				"created_at",
				"expiry_date",
				"user_email",
				"user_first_name",
				"user_last_name",
				"user_invitation_accepted",
				"user_is_deleted",
				"user_is_locked",
			],
		});
	}
	/** Finds the newest active magic link by its hashed token, or by its user's email when a code is entered. */
	async selectActiveMagicLink<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				where: { token: string } | { email: string };
			}
		>,
	) {
		let query = this.db
			.selectFrom("lucid_user_tokens")
			.select([
				"lucid_user_tokens.id",
				"lucid_user_tokens.user_id",
				"lucid_user_tokens.code",
				"lucid_user_tokens.code_attempts",
			])
			.innerJoin("lucid_users", "lucid_users.id", "lucid_user_tokens.user_id")
			.select([
				"lucid_users.email as user_email",
				"lucid_users.invitation_accepted as user_invitation_accepted",
				"lucid_users.is_deleted as user_is_deleted",
				"lucid_users.is_locked as user_is_locked",
			])
			.where(
				"lucid_user_tokens.token_type",
				"=",
				constants.userTokens.magicLink,
			)
			//* links only work while the address they were sent to is still the account's email
			.whereRef("lucid_user_tokens.email", "=", "lucid_users.email")
			.where("lucid_user_tokens.expiry_date", ">", new Date().toISOString())
			.where("lucid_user_tokens.revoked_at", "is", null)
			.where("lucid_user_tokens.consumed_at", "is", null)
			.orderBy("lucid_user_tokens.id", "desc")
			.limit(1);

		if ("token" in props.where) {
			query = query.where("lucid_user_tokens.token", "=", props.where.token);
		} else {
			query = query.where("lucid_users.email", "=", props.where.email);
		}

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectActiveMagicLink",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"user_id",
				"code",
				"code_attempts",
				"user_email",
				"user_invitation_accepted",
				"user_is_deleted",
				"user_is_locked",
			],
		});
	}

	/** Finds an active two-factor challenge by its hashed token, with what the second step needs to know about its user. */
	async selectActiveTwoFactorChallenge<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				token: string;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_user_tokens")
			.select([
				"lucid_user_tokens.id",
				"lucid_user_tokens.user_id",
				"lucid_user_tokens.auth_method",
			])
			.innerJoin("lucid_users", "lucid_users.id", "lucid_user_tokens.user_id")
			.select([
				"lucid_users.is_deleted as user_is_deleted",
				"lucid_users.is_locked as user_is_locked",
				"lucid_users.two_factor_enabled_at as user_two_factor_enabled_at",
			])
			.where(
				"lucid_user_tokens.token_type",
				"=",
				constants.userTokens.twoFactorChallenge,
			)
			.where("lucid_user_tokens.token", "=", props.token)
			.where("lucid_user_tokens.expiry_date", ">", new Date().toISOString())
			.where("lucid_user_tokens.revoked_at", "is", null)
			.where("lucid_user_tokens.consumed_at", "is", null);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectActiveTwoFactorChallenge",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"user_id",
				"auth_method",
				"user_is_deleted",
				"user_is_locked",
				"user_two_factor_enabled_at",
			],
		});
	}

	// ----------------------------------------
	// updates
	/** Uses up an active two-factor challenge once its code has been checked. */
	async consumeTwoFactorChallenge(props: { id: number }) {
		const now = new Date().toISOString();

		const query = this.db
			.updateTable("lucid_user_tokens")
			.set({
				consumed_at: now,
				revoked_at: now,
				revoke_reason:
					constants.userTokenRevokeReasons.twoFactorChallengePassed,
			})
			.where("id", "=", props.id)
			.where("token_type", "=", constants.userTokens.twoFactorChallenge)
			.where("expiry_date", ">", now)
			.where("revoked_at", "is", null)
			.where("consumed_at", "is", null)
			.returning("id");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "consumeTwoFactorChallenge",
		});
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data !== undefined };
	}
	/** Uses up an active magic link, as long as the address it was sent to is still the account's email. */
	async consumeMagicLink(props: { id: number }) {
		const now = new Date().toISOString();

		const query = this.db
			.updateTable("lucid_user_tokens")
			.set({
				consumed_at: now,
				revoked_at: now,
				revoke_reason: constants.userTokenRevokeReasons.magicLinkUsed,
			})
			.where("id", "=", props.id)
			.where("token_type", "=", constants.userTokens.magicLink)
			.where("expiry_date", ">", now)
			.where("revoked_at", "is", null)
			.where("consumed_at", "is", null)
			.where((eb) =>
				eb.exists(
					eb
						.selectFrom("lucid_users")
						.select("lucid_users.id")
						.whereRef("lucid_users.id", "=", "lucid_user_tokens.user_id")
						.whereRef("lucid_users.email", "=", "lucid_user_tokens.email"),
				),
			)
			.returning("id");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "consumeMagicLink",
		});
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data !== undefined };
	}
	/** Counts one code entry against an active magic link or two-factor challenge. Returns false once its attempts are used up. */
	async incrementCodeAttempts(props: { id: number; maxAttempts: number }) {
		const query = this.db
			.updateTable("lucid_user_tokens")
			.set({
				code_attempts: sql<number>`code_attempts + 1`,
			})
			.where("id", "=", props.id)
			.where("code_attempts", "<", props.maxAttempts)
			.where("expiry_date", ">", new Date().toISOString())
			.where("revoked_at", "is", null)
			.where("consumed_at", "is", null)
			.returning("id");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "incrementCodeAttempts",
		});
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data !== undefined };
	}
}
