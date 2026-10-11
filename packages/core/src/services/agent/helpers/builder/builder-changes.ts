import { isDeepStrictEqual } from "node:util";
import type { BrickInputSchema } from "../../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../../schemas/collection-fields.js";
import type {
	AgentBuilderChange,
	AgentBuilderContentChanges,
	AgentBuilderFieldChange,
} from "../../../../types/response.js";

type BuilderContent = {
	fields: FieldInputSchema[];
	bricks: BrickInputSchema[];
};
type BuilderContentChanges = BuilderContent &
	Pick<AgentBuilderContentChanges, "removed" | "order">;

const groupRefs = (field: FieldInputSchema | undefined) =>
	field?.groups?.map((group) => group.ref) ?? [];

/** The fields that differ, down to the repeater items both sides share. */
const fieldChanges = (
	before: FieldInputSchema[],
	after: FieldInputSchema[],
	path: string[] = [],
): AgentBuilderFieldChange[] =>
	after.flatMap((field) => {
		const prior = before.find((item) => item.key === field.key);
		if (isDeepStrictEqual(prior, field)) return [];

		const at = [...path, field.key];
		if (field.groups) {
			//* added, removed or reordered items change the repeater itself
			if (!isDeepStrictEqual(groupRefs(prior), groupRefs(field))) {
				return [{ path: at, locales: [] }];
			}
			return field.groups.flatMap((group, index) =>
				fieldChanges(prior?.groups?.[index]?.fields ?? [], group.fields, [
					...at,
					group.ref,
				]),
			);
		}

		const locales = Object.keys({
			...prior?.translations,
			...field.translations,
		}).filter(
			(locale) =>
				!isDeepStrictEqual(
					prior?.translations?.[locale],
					field.translations?.[locale],
				),
		);
		return [{ path: at, locales }];
	});

const builderRefs = (content: BuilderContent) =>
	content.bricks.flatMap((brick) =>
		brick.type === "builder" ? [brick.ref] : [],
	);

/** Compares `toDocumentInput` snapshots for builder updates and chat summaries, marking moves only for brick refs in `moved`. */
const builderChanges = (
	before: BuilderContent,
	after: BuilderContent,
	moved: ReadonlySet<string>,
): { content: BuilderContentChanges; changes: AgentBuilderChange[] } => {
	const priorBricks = new Map(before.bricks.map((brick) => [brick.ref, brick]));
	const afterRefs = new Set(after.bricks.map((brick) => brick.ref));
	const beforeOrder = builderRefs(before);
	const afterOrder = builderRefs(after);
	//* positions among the bricks both sides share, so adding or removing a brick doesn't count as moving the rest
	const keptBefore = beforeOrder.filter((ref) => afterRefs.has(ref));
	const keptAfter = afterOrder.filter((ref) => priorBricks.has(ref));

	const fields = after.fields.filter(
		(field) =>
			!isDeepStrictEqual(
				field,
				before.fields.find((item) => item.key === field.key),
			),
	);
	const bricks: BrickInputSchema[] = [];
	const changes: AgentBuilderChange[] = fields.length
		? [
				{
					brick: null,
					status: "changed",
					moved: false,
					fields: fieldChanges(before.fields, after.fields),
				},
			]
		: [];

	for (const brick of after.bricks) {
		const identity = { type: brick.type, key: brick.key, ref: brick.ref };
		const prior = priorBricks.get(brick.ref);
		if (!prior) {
			bricks.push(brick);
			changes.push({
				brick: identity,
				status: "added",
				moved: false,
				fields: [],
			});
			continue;
		}

		const changed = !isDeepStrictEqual(prior.fields, brick.fields);
		const shifted =
			moved.has(brick.ref) &&
			keptBefore.indexOf(brick.ref) !== keptAfter.indexOf(brick.ref);
		if (changed) bricks.push(brick);
		if (changed || shifted) {
			changes.push({
				brick: identity,
				status: "changed",
				moved: shifted,
				fields: changed
					? fieldChanges(prior.fields ?? [], brick.fields ?? [])
					: [],
			});
		}
	}

	const removed = before.bricks.filter((brick) => !afterRefs.has(brick.ref));
	for (const brick of removed) {
		changes.push({
			brick: { type: brick.type, key: brick.key, ref: brick.ref },
			status: "removed",
			moved: false,
			fields: [],
		});
	}

	return {
		content: {
			fields,
			bricks,
			removed: removed.map((brick) => brick.ref),
			order: isDeepStrictEqual(beforeOrder, afterOrder) ? null : afterOrder,
		},
		changes,
	};
};

export default builderChanges;
