import type { PreviewFieldTarget } from "@lucidcms/client/markup";
import isRecord from "../utils/is-record.js";
import { fieldTargets } from "./field-targets.js";

type Fields = Record<string, unknown>;

export type ResolveFieldsContext = {
	locale: string;
	locales: ReadonlySet<string>;
	target: PreviewFieldTarget;
};

const isTranslationMap = (
	value: unknown,
	locales: ReadonlySet<string>,
): value is Fields =>
	isRecord(value) &&
	Object.keys(value).length > 0 &&
	Object.keys(value).every((key) => locales.has(key));

const resolveValue = (
	value: unknown,
	context: ResolveFieldsContext,
): unknown => {
	if (isTranslationMap(value, context.locales)) {
		return resolveValue(value[context.locale] ?? null, context);
	}
	if (Array.isArray(value)) {
		return value.map((item, index) =>
			isRecord(item)
				? resolveFields(item, {
						...context,
						target: {
							...context.target,
							path: [...context.target.path, index],
						},
					})
				: item,
		);
	}
	return value;
};

const resolveFields = (
	fields: Fields,
	context: ResolveFieldsContext,
): Fields => {
	const resolved = Object.fromEntries(
		Object.entries(fields).map(([key, value]) => [
			key,
			resolveValue(value, {
				...context,
				target: { ...context.target, path: [...context.target.path, key] },
			}),
		]),
	);
	if (context.target.path.length > 0) {
		fieldTargets.set(resolved, context.target);
	}
	return resolved;
};

export default resolveFields;
