import type {
	BrickError,
	FieldError,
	LucidErrorData,
} from "../../types/errors.js";
import isPlainObject from "../../utils/helpers/is-plain-object.js";
import type { ServiceContext } from "../../utils/services/types.js";

const maxLines = 25;

type Issue = { path: string; locale: string | null; message: string };

const isFieldError = (value: unknown): value is FieldError =>
	isPlainObject(value) && typeof value.key === "string" && "message" in value;

const isBrickError = (value: unknown): value is BrickError =>
	isPlainObject(value) &&
	typeof value.key === "string" &&
	typeof value.ref === "string" &&
	typeof value.order === "number" &&
	Array.isArray(value.fields);

const fieldIssues = (
	context: ServiceContext,
	fields: FieldError[],
	path: string,
): Issue[] =>
	fields.flatMap((field) => {
		const at = `${path}.${field.key}`;
		if (field.groupErrors?.length) {
			return field.groupErrors.flatMap((group) =>
				fieldIssues(context, group.fields, `${at}[${group.order}]`),
			);
		}

		return [
			{
				path: field.itemIndex === undefined ? at : `${at}[${field.itemIndex}]`,
				locale: field.localeCode,
				message: context.translate(field.message),
			},
		];
	});

/**
 * Formats field errors by tool input path, combining matching errors across locales.
 *
 * @example "bricks.seo.socialImage[0] (en, fr): Media 3 isn't in the media library."
 */
const describeErrorDetails = (
	context: ServiceContext,
	error: LucidErrorData,
): string[] => {
	const bricks = error.errors?.bricks;
	const fields = error.errors?.fields;
	const issues = [
		...(Array.isArray(fields)
			? fieldIssues(context, fields.filter(isFieldError), "fields")
			: []),
		...(Array.isArray(bricks)
			? bricks
					.filter(isBrickError)
					.flatMap((brick) =>
						fieldIssues(
							context,
							brick.fields,
							brick.ref === `fixed:${brick.key}`
								? `bricks.${brick.key}`
								: `bricks.${brick.key}[${brick.order}]`,
						),
					)
			: []),
	];

	const grouped = Map.groupBy(
		issues,
		(issue) => `${issue.path}\n${issue.message}`,
	);
	const lines = [...grouped.values()].flatMap((group) => {
		const [first] = group;
		if (!first) return [];

		const locales = group.flatMap((issue) =>
			issue.locale ? [issue.locale] : [],
		);
		const scope = locales.length ? ` (${locales.join(", ")})` : "";
		return [`${first.path}${scope}: ${first.message}`];
	});

	return lines.length > maxLines
		? [...lines.slice(0, maxLines), `…and ${lines.length - maxLines} more`]
		: lines;
};

export default describeErrorDetails;
