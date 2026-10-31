import { sql } from "kysely";
import type { LucidDatabase } from "../db/client/index.js";
import { userPasskeysTable } from "../db/tables/user-passkeys.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class UserPasskeysRepository extends StaticRepository<"lucid_user_passkeys"> {
	constructor(db: LucidDatabase) {
		super(db, userPasskeysTable);
	}

	// ----------------------------------------
	// queries
	/** Finds a passkey by its credential ID, with what a sign-in needs to know about its user. */
	async selectSingleForLogin<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				credentialId: string;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_user_passkeys")
			.innerJoin("lucid_users", "lucid_users.id", "lucid_user_passkeys.user_id")
			.select([
				"lucid_user_passkeys.id",
				"lucid_user_passkeys.user_id",
				"lucid_user_passkeys.credential_id",
				"lucid_user_passkeys.public_key",
				"lucid_user_passkeys.counter",
				"lucid_user_passkeys.transports",
				"lucid_users.passkey_user_id as user_passkey_user_id",
				"lucid_users.invitation_accepted as user_invitation_accepted",
				"lucid_users.is_deleted as user_is_deleted",
				"lucid_users.is_locked as user_is_locked",
			])
			.where("lucid_user_passkeys.credential_id", "=", props.credentialId);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSingleForLogin",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"user_id",
				"credential_id",
				"public_key",
				"counter",
				"transports",
				"user_passkey_user_id",
				"user_invitation_accepted",
				"user_is_deleted",
				"user_is_locked",
			],
		});
	}

	// ----------------------------------------
	// updates
	/** Records usage and backup status without lowering the counter when sign-ins finish out of order. */
	async recordLogin(props: { id: number; counter: number; backedUp: boolean }) {
		const query = this.db
			.updateTable("lucid_user_passkeys")
			.set({
				counter: sql<number>`case when counter < ${props.counter} then ${props.counter} else counter end`,
				backed_up: props.backedUp,
				last_used_at: new Date().toISOString(),
			})
			.where("id", "=", props.id)
			.returning("id");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "recordLogin",
		});
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data !== undefined };
	}
}
