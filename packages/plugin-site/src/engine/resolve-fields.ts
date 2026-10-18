import type { PreviewFieldTarget } from "@lucidcms/client/markup";
import isRecord from "../utils/is-record.js";
import type { FieldTypeMap } from "./create-field-types.js";
import { fieldTargets } from "./field-targets.js";

type Fields = Record<string, unknown>;

/** Replacements for field types that point at other content, such as media IDs, keyed by field type. */
export type FieldResolvers = Partial<
	Record<string, (value: unknown) => unknown>
>;

export type ResolveFieldsContext = {
	locale: string;
	locales: ReadonlySet<string>;
	/** Where `editable()` points, or null for content previews can't edit, such as embedded bricks. */
	target: PreviewFieldTarget | null;
	/** Field types by key, which find the sections and collapsibles that nest their fields. */
	types: FieldTypeMap;
	/** Left out for related documents, whose references stay as stored. */
	resolvers?: FieldResolvers;
};

/** Field types whose content value nests their fields under their key, unless they're inline. */
const containerTypes = new Set(["section", "collapsible"]);

const withSegment = (
	target: PreviewFieldTarget | null,
	segment: string | number,
): PreviewFieldTarget | null =>
	target ? { ...target, path: [...target.path, segment] } : null;

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
	type: string | undefined,
): unknown => {
	if (isTranslationMap(value, context.locales)) {
		return resolveValue(value[context.locale] ?? null, context, type);
	}
	const resolver = type ? context.resolvers?.[type] : undefined;
	if (resolver) return resolver(value);
	if (type && containerTypes.has(type) && isRecord(value)) {
		// Containers only group fields, so their fields keep the paths they're stored at.
		const target = context.target
			? { ...context.target, path: context.target.path.slice(0, -1) }
			: null;
		const resolved = resolveFields(value, { ...context, target });
		if (target) fieldTargets.set(resolved, target);
		return resolved;
	}
	if (Array.isArray(value)) {
		return value.map((item, index) =>
			isRecord(item)
				? resolveFields(item, {
						...context,
						target: withSegment(context.target, index),
					})
				: item,
		);
	}
	return value;
};

/** Gives each field its value in the locale, resolving references when the context has resolvers. */
const resolveFields = (
	fields: Fields,
	context: ResolveFieldsContext,
): Fields => {
	const resolved = Object.fromEntries(
		Object.entries(fields).map(([key, value]) => [
			key,
			resolveValue(
				value,
				{
					...context,
					target: withSegment(context.target, key),
				},
				context.types.get(key),
			),
		]),
	);
	if (context.target && context.target.path.length > 0) {
		fieldTargets.set(resolved, context.target);
	}
	return resolved;
};

export default resolveFields;
