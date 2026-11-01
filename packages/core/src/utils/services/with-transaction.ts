import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import constants from "../../constants/constants.js";
import type { LucidDatabase } from "../../libs/db/client/index.js";
import { flushPendingJobs } from "../../libs/jobs/dispatch.js";
import logger from "../../libs/logger/index.js";
import type { ServiceContext, ServiceResponse } from "./types.js";
import TransactionError from "./utils/transaction-error.js";

/** Owns transaction execution and rollback. Isolated operations use a savepoint inside a caller's transaction. */
const withTransaction = async <T>(
	context: ServiceContext,
	operation: (context: ServiceContext) => ServiceResponse<T>,
	options: { isolate?: boolean } = {},
): ServiceResponse<T> => {
	if (context.db.isTransaction) {
		if (!options.isolate) return operation(context);

		const savepoint = sql.id(`service_${randomUUID().replaceAll("-", "")}`);
		await sql`savepoint ${savepoint}`.execute(context.db.kysely);

		try {
			const result = await operation(context);
			if (result.error) {
				await sql`rollback to savepoint ${savepoint}`.execute(
					context.db.kysely,
				);
			}

			return result;
		} catch (error) {
			await sql`rollback to savepoint ${savepoint}`.execute(context.db.kysely);
			throw error;
		} finally {
			await sql`release savepoint ${savepoint}`.execute(context.db.kysely);
		}
	}

	try {
		let transactionDb: LucidDatabase | undefined;
		const result = await context.db.kysely.transaction().execute(async (tx) => {
			transactionDb = context.db.withTransaction(tx);
			const result = await operation({
				...context,
				db: transactionDb,
			});
			if (result.error) throw new TransactionError(result.error);

			return result;
		});

		try {
			await transactionDb?.runCommitCallbacks();
		} catch (error) {
			logger.error({
				error,
				event: "db.after-commit.failed",
				message: "Work queued to run after a transaction failed",
				scope: constants.logScopes.lucid,
			});
		}

		const dispatch = await flushPendingJobs(context);
		if (dispatch.error) {
			logger.error({
				error: dispatch.error,
				event: "jobs.dispatch.after-commit.failed",
				message: context.translate(
					"server:core.jobs.dispatch.after.commit.failed",
				),
				scope: constants.logScopes.jobs,
			});
		}

		return result;
	} catch (error) {
		if (error instanceof TransactionError) {
			return { error: error.error, data: undefined };
		}

		throw error;
	}
};

export default withTransaction;
