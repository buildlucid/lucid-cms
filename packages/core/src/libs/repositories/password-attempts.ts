import { sql } from "kysely";
import type { LucidDatabase } from "../db/client/index.js";
import { passwordAttemptsTable } from "../db/tables/password-attempts.js";
import StaticRepository from "./parents/static-repository.js";

export default class PasswordAttemptsRepository extends StaticRepository<"lucid_password_attempts"> {
	constructor(db: LucidDatabase) {
		super(db, passwordAttemptsTable);
	}

	// ----------------------------------------
	// upserts
	/** Reserves an attempt atomically. Returns the window end for refunds, or undefined at the limit. */
	async reserve(props: { key: string; limit: number; windowMs: number }) {
		const now = new Date();
		const resetAt = new Date(now.getTime() + props.windowMs).toISOString();
		const windowOver = sql<boolean>`lucid_password_attempts.reset_at <= ${now.toISOString()}`;

		const query = this.db
			.insertInto("lucid_password_attempts")
			.values({ key: props.key, failed_attempts: 1, reset_at: resetAt })
			.onConflict((conflict) =>
				conflict
					.column("key")
					.doUpdateSet({
						failed_attempts: sql<number>`case when ${windowOver} then 1 else lucid_password_attempts.failed_attempts + 1 end`,
						reset_at: sql<string>`case when ${windowOver} then ${resetAt} else lucid_password_attempts.reset_at end`,
					})
					.where(
						sql<boolean>`${windowOver} or lucid_password_attempts.failed_attempts < ${props.limit}`,
					),
			)
			.returning("reset_at");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "reserve",
		});
		if (exec.response.error) return exec.response;

		const reservedResetAt = exec.response.data?.reset_at;

		return {
			error: undefined,
			data: reservedResetAt ? { resetAt: reservedResetAt } : undefined,
		};
	}

	// ----------------------------------------
	// updates
	/** Refunds an attempt only within its original window, preserving the next window's count. */
	async refund(props: { key: string; resetAt: string | Date }) {
		const query = this.db
			.updateTable("lucid_password_attempts")
			.set({
				failed_attempts: sql<number>`failed_attempts - 1`,
			})
			.where("key", "=", props.key)
			.where("reset_at", "=", props.resetAt)
			.where("failed_attempts", ">", 0)
			.returning("id");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "refund",
		});
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data !== undefined };
	}
}
