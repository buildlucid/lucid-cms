import { copy } from "../../libs/i18n/index.js";
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
			//* Validate input if a schema is provided
			if (wrapperConfig.schema) {
				const result = await wrapperConfig.schema.safeParseAsync(
					args[wrapperConfig.schemaArgIndex ?? 0],
				);
				if (result.success === false) {
					return {
						error: mergeServiceError(
							{
								type: "validation",
								// message: result.error.message,
								zod: result.error,
							},
							wrapperConfig.defaultError,
						),
						data: undefined,
					};
				}
			}

			//* If transactions are not enabled, unsupported by the DB, or the service is already in a parent transaction
			if (
				!wrapperConfig.transaction ||
				!service.config.db.supports("transaction") ||
				service.db.client.isTransaction
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
			return await service.db.client.transaction().execute(async (tx) => {
				const result = await fn(
					{
						...service,
						db: {
							client: tx,
						},
					},
					...args,
				);
				if (result.error) {
					//! Kysely needs function to throw for transaction to rollback !\\
					throw new TransactionError(result.error);
				}

				return result;
			});
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
