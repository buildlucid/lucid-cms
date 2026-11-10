import type z from "zod";
import constants from "../../constants/constants.js";
import { copy, normalizeCopy } from "../../libs/i18n/copy.js";
import { translate } from "../../libs/i18n/translate.js";
import type {
	ErrorCopy,
	ErrorResult,
	LucidErrorData,
} from "../../types/errors.js";
import errorTypeDefaults from "./error-type-defaults.js";

export type LucidErrorOptions = Omit<LucidErrorData, "name" | "message"> & {
	/** Plain text, or copy() for a translated name. */
	name?: ErrorCopy | string;
	/** Plain text, or copy() for a translated message. */
	message?: ErrorCopy | string;
	/** Names where the error came from, such as a plugin key, for logs and the CLI. */
	scope?: string;
	/** Extra details for logs. Never sent in a response. */
	data?: Record<string, unknown>;
};

/**
 * Marks LucidError instances. It is registered globally, so every loaded copy of this module
 * shares it.
 */
const lucidErrorBrand = Symbol.for("@lucidcms/core:LucidError");

/**
 * Lucid's error. Throw it from any handler you write, such as a route, hook, job or tool, and Lucid
 * turns it into the response, tool result or job failure. Pass a failed toolkit result's `error`
 * to pass that failure on.
 *
 * @example
 * ```ts
 * throw new LucidError({
 *   status: 404,
 *   message: "The requested article was not found.",
 * });
 * ```
 *
 * @example
 * ```ts
 * const page = await toolkit.documents.getSingle({ collectionKey: "page", filter: { id } });
 * if (page.error) throw new LucidError(page.error);
 * ```
 */
class LucidError extends Error {
	/**
	 * Recognises errors from any copy of this class. A project can load core twice, such as a
	 * config loaded apart from the runtime or a plugin with its own install, and an error thrown
	 * by one copy must still be handled as a LucidError by the other.
	 */
	static override [Symbol.hasInstance](value: unknown): boolean {
		return (
			typeof value === "object" && value !== null && lucidErrorBrand in value
		);
	}

	readonly [lucidErrorBrand] = true;
	/** The failure as services return it, with `name` and `message` still translatable. */
	readonly error: LucidErrorData;
	readonly scope?: string;
	readonly data?: Record<string, unknown>;

	constructor(options: LucidErrorOptions) {
		const { scope, data, name, message, ...rest } = options;
		const error: LucidErrorData = {
			...rest,
			name: normalizeCopy(name),
			message: normalizeCopy(message),
		};
		if (error.zod !== undefined) {
			error.errors = LucidError.formatZodErrors(error.zod.issues);
		}

		const defaults = errorTypeDefaults(error);
		error.status = defaults.status;
		error.name = defaults.name;
		error.message = defaults.message;

		super(translate(error.message) ?? constants.errors.message, {
			cause: error.cause,
		});
		this.name = "LucidError";
		this.error = error;
		this.scope = scope;
		this.data = data;
	}

	static formatZodErrors(error: z.core.$ZodIssue[]) {
		const result: ErrorResult = {};

		for (const item of error) {
			let current = result;
			for (const key of item.path) {
				if (typeof key === "number") {
					// @ts-expect-error
					current = current.children || (current.children = []);
					// @ts-expect-error
					current = current[key] || (current[key] = {});
				} else {
					// @ts-expect-error
					current = current[key] || (current[key] = {});
				}
			}
			current.code = item.code;
			current.message = copy.literal(item.message);
		}

		return result ?? undefined;
	}
}

export default LucidError;
