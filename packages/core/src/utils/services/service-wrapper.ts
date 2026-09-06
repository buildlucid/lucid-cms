import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import { flushPendingJobs } from "../../libs/jobs/dispatch.js";
import logger from "../../libs/logger/index.js";
import type {
	ServiceContext,
	ServiceFn,
	ServiceResponse,
	ServiceWrapperConfig,
} from "./types.js";
import mergeServiceError from "./utils/merge-errors.js";
import TransactionError from "./utils/transaction-error.js";

const serviceWrapper =
	<T extends unknown[], R>(
		fn: ServiceFn<T, R>,
		wrapperConfig: ServiceWrapperConfig,
	) =>
	async (service: ServiceContext, ...args: T): ServiceResponse<R> => {
		try {
			// Reuse parent transactions and honour adapters without transaction support.
			if (
				!wrapperConfig.transaction ||
				!service.config.db.supports("transaction") ||
				service.db.isTransaction
			) {
				const result = await fn(service, ...args);
				if (result.error)
					return {
						error: mergeServiceError(result.error, wrapperConfig.defaultError),
						data: undefined,
					};
				return result;
			}

			//* If transactions are enabled
			const result = await service.db.kysely
				.transaction()
				.execute(async (tx) => {
					const result = await fn(
						{
							...service,
							db: service.db.withTransaction(tx),
						},
						...args,
					);
					if (result.error) {
						//! Kysely needs function to throw for transaction to rollback !\\
						throw new TransactionError(result.error);
					}

					return result;
				});

			const dispatch = await flushPendingJobs(service);
			if (dispatch.error) {
				logger.error({
					error: dispatch.error,
					event: "jobs.dispatch.after-commit.failed",
					message:
						"Pending jobs could not be dispatched after the transaction committed",
					scope: constants.logScopes.jobs,
				});
			}

			return result;
		} catch (error) {
			if (wrapperConfig.logError) {
				logger.error({
					error,
					event: "service.execution.failed",
					message: "Service execution failed",
					data: {
						errorMessage:
							error instanceof Error
								? error.message
								: "An unknown error occurred",
					},
				});
			}

			if (error instanceof TransactionError) {
				return {
					error: mergeServiceError(error.error, wrapperConfig.defaultError),
					data: undefined,
				};
			}

			if (error instanceof Error) {
				return {
					error: mergeServiceError(
						{
							message: copy("server:core.errors.default.message"),
							cause: error,
						},
						wrapperConfig.defaultError,
					),
					data: undefined,
				};
			}

			return {
				error: mergeServiceError(
					{
						message: copy("server:core.errors.default.message"),
						cause: error,
					},
					wrapperConfig.defaultError,
				),
				data: undefined,
			};
		}
	};

export default serviceWrapper;
