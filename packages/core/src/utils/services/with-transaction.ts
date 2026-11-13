import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import constants from "../../constants/constants.js";
import type { LucidDatabase } from "../../libs/db/client/index.js";
import logger from "../../libs/logger/index.js";
import type { ServiceContext, ServiceResponse } from "./types.js";
import runRollbackCallbacks from "./utils/run-rollback-callbacks.js";
import TransactionError from "./utils/transaction-error.js";

/**
 * Owns transaction execution and rollback. Isolated operations use a savepoint inside a caller's
 * transaction. With `ownCallbacks`, the savepoint's `afterCommit` and `afterRollback` work only joins
 * the caller's if it's kept; if it rolls back, its commit work is dropped and its rollback work runs.
 */
const withTransaction = async <T>(
	context: ServiceContext,
	operation: (context: ServiceContext) => ServiceResponse<T>,
	options: { isolate?: boolean; ownCallbacks?: boolean } = {},
): ServiceResponse<T> => {
	if (context.db.isTransaction) {
		if (!options.isolate) return operation(context);

		const savepoint = sql.id(`service_${randomUUID().replaceAll("-", "")}`);
		await sql`savepoint ${savepoint}`.execute(context.db.kysely);
		const ownDb = options.ownCallbacks
			? context.db.withOwnCallbacks()
			: undefined;

		try {
			const result = await operation(
				ownDb ? { ...context, db: ownDb } : context,
			);
			if (result.error) {
				await sql`rollback to savepoint ${savepoint}`.execute(
					context.db.kysely,
				);
				if (ownDb) await runRollbackCallbacks(ownDb);
			} else {
				ownDb?.keepCallbacks();
			}

			return result;
		} catch (error) {
			await sql`rollback to savepoint ${savepoint}`.execute(context.db.kysely);
			if (ownDb) await runRollbackCallbacks(ownDb);
			throw error;
		} finally {
			await sql`release savepoint ${savepoint}`.execute(context.db.kysely);
		}
	}

	let transactionDb: LucidDatabase | undefined;
	try {
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

		return result;
	} catch (error) {
		if (transactionDb) await runRollbackCallbacks(transactionDb);

		if (error instanceof TransactionError) {
			return { error: error.error, data: undefined };
		}

		throw error;
	}
};

export default withTransaction;
