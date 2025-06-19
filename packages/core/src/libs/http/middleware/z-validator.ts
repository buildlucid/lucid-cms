/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
	Context,
	Env,
	Input,
	MiddlewareHandler,
	TypedResponse,
	ValidationTargets,
} from "hono";
import { validator } from "hono/validator";
import type {
	ZodType,
	ZodError,
	ZodSafeParseResult,
	input,
	output,
	infer as zInfer,
} from "zod/v4";
import type { LucidHonoVariables } from "../../../types/hono.js";

export type Hook<
	T,
	E extends Env & {
		Variables: LucidHonoVariables;
	},
	P extends string,
	Target extends keyof ValidationTargets = keyof ValidationTargets,
	// biome-ignore lint/complexity/noBannedTypes: <explanation>
	O = {},
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	Schema extends ZodType = any,
> = (
	result: (
		| { success: true; data: T }
		| { success: false; error: ZodError; data: T }
	) & {
		target: Target;
	},
	c: Context<E, P>,
) =>
	| Response
	| void
	| TypedResponse<O>
	// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
	| Promise<Response | void | TypedResponse<O>>;

type HasUndefined<T> = undefined extends T ? true : false;

export const zValidator = <
	T extends ZodType,
	Target extends keyof ValidationTargets,
	E extends Env & {
		Variables: LucidHonoVariables;
	},
	P extends string,
	In = input<T>,
	Out = output<T>,
	I extends Input = {
		in: HasUndefined<In> extends true
			? {
					[K in Target]?: In extends ValidationTargets[K]
						? In
						: { [K2 in keyof In]?: ValidationTargets[K][K2] };
				}
			: {
					[K in Target]: In extends ValidationTargets[K]
						? In
						: { [K2 in keyof In]: ValidationTargets[K][K2] };
				};
		out: { [K in Target]: Out };
	},
	V extends I = I,
	InferredValue = zInfer<T>,
>(
	target: Target,
	schema: T,
	// biome-ignore lint/complexity/noBannedTypes: <explanation>
	hook?: Hook<InferredValue, E, P, Target, {}, T>,
	options?: {
		validationFunction: (
			schema: T,
			value: ValidationTargets[Target],
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		) => ZodSafeParseResult<any> | Promise<ZodSafeParseResult<any>>;
	},
): MiddlewareHandler<E, P, V> =>
	// @ts-expect-error not typed well
	validator(target, async (value, c) => {
		let validatorValue = value;
		// in case where our `target` === `header`, Hono parses all of the headers into lowercase.
		// this might not match the Zod schema, so we want to make sure that we account for that when parsing the schema.
		if (target === "header" && "_def" in schema) {
			// create an object that maps lowercase schema keys to lowercase
			// @ts-expect-error the schema is a Zod Schema
			const schemaKeys = Object.keys(schema.shape);
			const caseInsensitiveKeymap = Object.fromEntries(
				schemaKeys.map((key) => [key.toLowerCase(), key]),
			);
			validatorValue = Object.fromEntries(
				Object.entries(value).map(([key, value]) => [
					caseInsensitiveKeymap[key] || key,
					value,
				]),
			);
		}
		const result = options?.validationFunction
			? await options.validationFunction(schema, validatorValue)
			: await schema.safeParseAsync(validatorValue);
		if (hook) {
			const hookResult = await hook(
				{ data: validatorValue, ...result, target },
				c,
			);
			if (hookResult) {
				if (hookResult instanceof Response) {
					return hookResult;
				}
				if ("response" in hookResult) {
					return hookResult.response;
				}
			}
		}
		if (!result.success) {
			return c.json(result, 400);
		}
		return result.data as zInfer<T>;
	});

// Convenience functions
export const validateJson = <T extends ZodType>(schema: T) =>
	zValidator("json", schema);

export const validateQuery = <T extends ZodType>(schema: T) =>
	zValidator("query", schema);

export const validateParam = <T extends ZodType>(schema: T) =>
	zValidator("param", schema);
