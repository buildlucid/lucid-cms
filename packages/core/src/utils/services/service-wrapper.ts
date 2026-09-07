import { copy } from "../../libs/i18n/index.js";
import logger from "../../libs/logger/index.js";
import type {
	ServiceContext,
	ServiceFn,
	ServiceResponse,
	ServiceWrapperConfig,
} from "./types.js";
import mergeServiceError from "./utils/merge-errors.js";
import withTransaction from "./with-transaction.js";

/**
 * Wraps a service with error conversion and optional database transactions.
 * The returned function takes a ServiceContext followed by the service's arguments.
 * Returned errors roll back a transaction opened here; existing transactions are reused.
 * Adapters without transaction support run the service without one.
 *
 * @example
 * ```ts
 * const readDocuments = serviceWrapper(
 *   async (context, collectionKey: string) => {
 *     const toolkit = createToolkit(context);
 *     return toolkit.documents.getMultiple({
 *       collectionKey,
 *       version: "published",
 *       query: { perPage: 1 },
 *     });
 *   },
 *   { transaction: false, logError: true },
 * );
 * ```
 */
const serviceWrapper =
	<T extends unknown[], R>(
		fn: ServiceFn<T, R>,
		wrapperConfig: ServiceWrapperConfig,
	) =>
	async (service: ServiceContext, ...args: T): ServiceResponse<R> => {
		try {
			const result = wrapperConfig.transaction
				? await withTransaction(service, (context) => fn(context, ...args))
				: await fn(service, ...args);
			if (result.error) {
				return {
					error: mergeServiceError(result.error, wrapperConfig.defaultError),
					data: undefined,
				};
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
