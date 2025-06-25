import T from "../../translations/index.js";
import TransactionError from "./utils/transaction-error.js";
import mergeServiceError from "./utils/merge-errors.js";
import logger from "../../libs/logger/index.js";
import type {
	ServiceContext,
	ServiceWrapperConfig,
	ServiceResponse,
	ServiceFn,
} from "./types.js";

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

			//* If transactions are not enabled or the service is already in a transaction via a parent
			if (!wrapperConfig.transaction || service.db.isTransaction) {
				const result = await fn(service, ...args);
				if (result.error)
					return {
						error: mergeServiceError(result.error, wrapperConfig.defaultError),
						data: undefined,
					};
				return result;
			}

			//* If transactions are enabled
			return await service.db.transaction().execute(async (tx) => {
				const result = await fn(
					{
						...service,
						db: tx,
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
					message:
						error instanceof Error
							? error?.message
							: T("an_unknown_error_occurred"),
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
							message: error.message,
						},
						wrapperConfig.defaultError,
					),
					data: undefined,
				};
			}

			return {
				error: mergeServiceError(
					{
						message: error instanceof Error ? error?.message : undefined,
					},
					wrapperConfig.defaultError,
				),
				data: undefined,
			};
		}
	};

export default serviceWrapper;
