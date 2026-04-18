import constants from "../../constants/constants.js";
import decodeError from "../../utils/errors/decode-error.js";
import type { ServiceResponse } from "../../utils/services/types.js";

type PaginatedQuery = {
	page?: number;
	perPage?: number;
};

type ResolvedServiceResponse<T> = Awaited<ServiceResponse<T>>;

/** Applies Lucid's default pagination when toolkit callers omit it. */
export const normalizePaginatedQuery = <T extends PaginatedQuery>(
	query?: T,
): Omit<T, "page" | "perPage"> & { page: number; perPage: number } => {
	const normalizedQuery = query ?? ({} as T);

	return {
		...normalizedQuery,
		page: normalizedQuery.page ?? constants.query.page,
		perPage: normalizedQuery.perPage ?? constants.query.perPage,
	};
};

/** Clones optional query objects so toolkit services can pass a stable shape downstream. */
export const normalizeQuery = <T extends object>(query?: T): T =>
	({ ...(query ?? {}) }) as T;

/** Converts unexpected exceptions into standard Lucid service error values. */
export const runToolkitService = async <T>(
	callback: () => ServiceResponse<T>,
	messageFallback: string,
): ServiceResponse<T> => {
	try {
		const response = await callback();

		if (response.error || response.data !== undefined) {
			return response;
		}

		return {
			error: {
				type: "basic",
				message: messageFallback,
				status: 500,
			},
			data: undefined,
		} satisfies ResolvedServiceResponse<T>;
	} catch (error) {
		if (error instanceof Error) {
			const decodedError = decodeError(error);

			return {
				error: {
					type: "basic",
					name: decodedError.name,
					message: decodedError.message ?? messageFallback,
					status: decodedError.status,
					code: decodedError.code,
					errors: decodedError.errors,
				},
				data: undefined,
			} satisfies ResolvedServiceResponse<T>;
		}

		return {
			error: {
				type: "basic",
				name: constants.errors.name,
				message: messageFallback,
				status: constants.errors.status,
			},
			data: undefined,
		} satisfies ResolvedServiceResponse<T>;
	}
};
