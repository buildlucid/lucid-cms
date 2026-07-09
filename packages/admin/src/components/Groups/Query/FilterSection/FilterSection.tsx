import { FaSolidPlus } from "solid-icons/fa";
import {
	batch,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Index,
	on,
	Show,
} from "solid-js";
import { FilterRow } from "@/components/Groups/Query/FilterSection/FilterRow";
import Button from "@/components/Partials/Button";
import type {
	FilterValue,
	OrFilterCondition,
	OrFilterGroups,
	QueryStateResponse,
} from "@/hooks/useQueryState";
import T from "@/translations";
import {
	type DocumentFilterField,
	type DocumentFilterOperator,
	operatorsForFieldType,
} from "@/utils/document-filter-fields";

type RowRef =
	//* top-level filter param - only exists in single-group mode
	| { source: "top"; key: string }
	| { source: "or"; groupIndex: number; conditionIndex: number }
	| { source: "draft"; draftId: number };

interface RowModel {
	ref: RowRef;
	/** rows sharing a tag are ANDed; tag changes render group labels */
	groupTag: string;
	fieldKey?: string;
	operator?: string;
	value: FilterValue;
}

interface DraftRow {
	draftId: number;
	/** group index the committed value joins; "new" starts its own OR group */
	target: number | "new";
	/** shared by draft rows that will become the same new OR group */
	newGroupId?: number;
	key?: string;
	operator?: DocumentFilterOperator;
	value: FilterValue;
}

export interface FilterSectionProps {
	open: boolean;
	setOpen: (open: boolean) => void;
	collectionName: string;
	fields: DocumentFilterField[];
	searchParams: QueryStateResponse;
}

const isValueEmpty = (value: FilterValue): boolean => {
	if (value === undefined) return true;
	if (typeof value === "string") return value.trim() === "";
	if (Array.isArray(value)) return value.length === 0;
	return false;
};

const identity = (ref: RowRef): string => {
	if (ref.source === "top") return `top:${ref.key}`;
	if (ref.source === "or") return `or:${ref.groupIndex}:${ref.conditionIndex}`;
	return `draft:${ref.draftId}`;
};

/** Draft rows in the same pending OR group share one temporary group id. */
const draftNewGroupId = (draft: DraftRow): number =>
	draft.newGroupId ?? draft.draftId;

export const FilterSection: Component<FilterSectionProps> = (props) => {
	// ----------------------------------
	// State
	let nextDraftId = 0;
	const [drafts, setDrafts] = createSignal<DraftRow[]>([]);
	//* preserves insertion order as rows move between draft and URL state
	const [rowOrder, setRowOrder] = createSignal<string[]>([]);

	// ----------------------------------
	// Memos
	const fieldsByKey = createMemo(
		() => new Map(props.fields.map((field) => [field.key, field])),
	);
	const singleMode = createMemo(
		() => props.searchParams.orFilterGroups().length === 0,
	);
	//* committed top-level conditions the section owns
	const topConditions = createMemo<OrFilterCondition[]>(() => {
		const result: OrFilterCondition[] = [];
		for (const [key, state] of props.searchParams.filterStates()) {
			if (!fieldsByKey().has(key)) continue;
			if (state.operator === undefined && isValueEmpty(state.value)) continue;
			result.push({
				key,
				value: state.value,
				...(state.operator !== undefined ? { operator: state.operator } : {}),
			});
		}
		return result;
	});
	//* committed rows come from query state; drafts hold uncommitted edits
	const rows = createMemo<RowModel[]>(() => {
		const result: RowModel[] = [];
		for (const condition of topConditions()) {
			result.push({
				ref: { source: "top", key: condition.key },
				groupTag: "g:base",
				fieldKey: condition.key,
				operator: condition.operator ?? "=",
				value: condition.value,
			});
		}
		props.searchParams.orFilterGroups().forEach((group, groupIndex) => {
			group.forEach((condition, conditionIndex) => {
				if (!fieldsByKey().has(condition.key)) return;
				result.push({
					ref: { source: "or", groupIndex, conditionIndex },
					groupTag: `g:${groupIndex}`,
					fieldKey: condition.key,
					operator: condition.operator ?? "=",
					value: condition.value,
				});
			});
		});
		for (const draft of drafts()) {
			result.push({
				ref: { source: "draft", draftId: draft.draftId },
				groupTag:
					draft.target === "new"
						? `n:${draftNewGroupId(draft)}`
						: singleMode()
							? "g:base"
							: `g:${draft.target}`,
				fieldKey: draft.key,
				operator: draft.operator,
				value: draft.value,
			});
		}

		//* stable sort - identities not in rowOrder (URL hydration) keep their
		//* natural order at the end and get appended by the reconcile effect
		const positions = new Map(rowOrder().map((id, index) => [id, index]));
		return result
			.map((row, index) => ({
				row,
				position: positions.get(identity(row.ref)) ?? Number.MAX_SAFE_INTEGER,
				index,
			}))
			.sort((a, b) => a.position - b.position || a.index - b.index)
			.map((entry) => entry.row);
	});

	//* where keys are unique inside a group, but reusable across OR groups
	const usedKeysByGroup = createMemo(() => {
		const groups = new Map<string, Set<string>>();
		for (const row of rows()) {
			if (!row.fieldKey) continue;
			const keys = groups.get(row.groupTag) ?? new Set<string>();
			keys.add(row.fieldKey);
			groups.set(row.groupTag, keys);
		}
		return groups;
	});

	// ----------------------------------
	// Functions
	const conjunctionLabel = (sameGroup: boolean) =>
		T()(
			sameGroup
				? "filter.section.conjunction.and"
				: "filter.section.conjunction.or",
		).toLowerCase();

	const fieldOptionsForRow = (row: RowModel) => {
		const groupKeys = usedKeysByGroup().get(row.groupTag);
		return props.fields
			.filter(
				(field) =>
					field.key === row.fieldKey ||
					groupKeys === undefined ||
					!groupKeys.has(field.key),
			)
			.map((field) => ({ value: field.key, label: field.label }));
	};
	const canAddRowAfter = (row: RowModel) => {
		const groupKeys = usedKeysByGroup().get(row.groupTag);
		return props.fields.some((field) => !groupKeys?.has(field.key));
	};

	const defaultOperator = (fieldKey: string): DocumentFilterOperator => {
		const field = fieldsByKey().get(fieldKey);
		return field ? (operatorsForFieldType(field.type)[0] ?? "=") : "=";
	};

	const replaceIdentity = (oldId: string, newId: string) => {
		setRowOrder((order) => order.map((id) => (id === oldId ? newId : id)));
	};
	const removeIdentity = (removedId: string) => {
		setRowOrder((order) => order.filter((id) => id !== removedId));
	};
	const insertIdentityAfter = (afterId: string | undefined, newId: string) => {
		setRowOrder((order) => {
			const index = afterId === undefined ? -1 : order.indexOf(afterId);
			if (index === -1) return [...order, newId];
			return [...order.slice(0, index + 1), newId, ...order.slice(index + 1)];
		});
	};
	/** Applies an identity rename map over the order list (null removes). */
	const applyIdentityMap = (map: Map<string, string | null>) => {
		setRowOrder((order) =>
			order.flatMap((id) => {
				if (!map.has(id)) return [id];
				const next = map.get(id);
				return next === null || next === undefined ? [] : [next];
			}),
		);
	};

	const orGroups = (): OrFilterGroups =>
		props.searchParams
			.orFilterGroups()
			.map((group) => group.map((c) => ({ ...c })));

	//* clears every committed section-owned top-level filter
	const clearedTopFilters = () => {
		const cleared: Record<string, { value: undefined; operator: undefined }> =
			{};
		for (const condition of topConditions()) {
			cleared[condition.key] = { value: undefined, operator: undefined };
		}
		return cleared;
	};
	const conditionsToFilters = (group: OrFilterCondition[]) => {
		const filters: Record<
			string,
			{ value: FilterValue; operator: string | undefined }
		> = {};
		for (const condition of group) {
			filters[condition.key] = {
				value: condition.value,
				operator: condition.operator,
			};
		}
		return filters;
	};

	const addDraft = (
		target: number | "new",
		afterId?: string,
		newGroupId?: number,
	) => {
		const draftId = nextDraftId++;
		const draft: DraftRow = {
			draftId,
			target,
			value: "",
			...(target === "new" ? { newGroupId: newGroupId ?? draftId } : {}),
		};
		batch(() => {
			setDrafts((current) => [...current, draft]);
			insertIdentityAfter(afterId, `draft:${draftId}`);
		});
	};

	const removeDraft = (draftId: number) => {
		setDrafts((current) =>
			current.filter((draft) => draft.draftId !== draftId),
		);
	};

	const updateDraft = (draftId: number, patch: Partial<DraftRow>) => {
		setDrafts((current) =>
			current.map((draft) =>
				draft.draftId === draftId ? { ...draft, ...patch } : draft,
			),
		);
	};

	/** Retargets sibling drafts after their pending OR group first commits. */
	const retargetNewDraftGroup = (
		drafts: DraftRow[],
		sourceDraft: DraftRow,
		groupIndex: number,
	) => {
		if (sourceDraft.target !== "new") return drafts;
		const sourceGroupId = draftNewGroupId(sourceDraft);
		return drafts.map((draft) => {
			if (draft.target !== "new") return draft;
			if (draftNewGroupId(draft) !== sourceGroupId) return draft;
			return { ...draft, target: groupIndex, newGroupId: undefined };
		});
	};

	/** Commits OR groups and demotes back to top-level params when possible. */
	const applyGroups = (
		nextGroups: OrFilterGroups,
		identityMap: Map<string, string | null>,
	) => {
		batch(() => {
			if (nextGroups.length <= 1) {
				const survivor = nextGroups[0] ?? [];
				//* keep OR shape if a hand-written URL duplicates keys
				const keys = new Set(survivor.map((condition) => condition.key));
				if (keys.size === survivor.length) {
					survivor.forEach((condition, index) => {
						identityMap.set(`or:0:${index}`, `top:${condition.key}`);
					});
					applyIdentityMap(identityMap);
					props.searchParams.setParams({
						filters: {
							...clearedTopFilters(),
							...conditionsToFilters(survivor),
						},
						orFilterGroups: [],
					});
					return;
				}
			}
			applyIdentityMap(identityMap);
			props.searchParams.setParams({
				filters: clearedTopFilters(),
				orFilterGroups: nextGroups,
			});
		});
	};

	/** Removes an OR condition, remapping identities and draft targets. */
	const removeOrCondition = (groupIndex: number, conditionIndex: number) => {
		const groups = orGroups();
		const group = groups[groupIndex];
		if (!group) return;
		group.splice(conditionIndex, 1);
		const groupRemoved = group.length === 0;
		const nextGroups = groups.filter((g) => g.length > 0);

		const identityMap = new Map<string, string | null>();
		props.searchParams.orFilterGroups().forEach((g, gi) => {
			g.forEach((_, ci) => {
				let nextGi = gi;
				let nextCi = ci;
				if (gi === groupIndex && ci === conditionIndex) {
					identityMap.set(`or:${gi}:${ci}`, null);
					return;
				}
				if (groupRemoved && gi > groupIndex) nextGi -= 1;
				if (!groupRemoved && gi === groupIndex && ci > conditionIndex)
					nextCi -= 1;
				if (nextGi !== gi || nextCi !== ci) {
					identityMap.set(`or:${gi}:${ci}`, `or:${nextGi}:${nextCi}`);
				}
			});
		});

		batch(() => {
			if (groupRemoved) {
				setDrafts((current) => {
					const removedGroupDraftId = current.find(
						(draft) => draft.target === groupIndex,
					)?.draftId;
					return current.map((draft) => {
						if (typeof draft.target !== "number") return draft;
						//* drafts extending the removed group become one new group
						if (draft.target === groupIndex) {
							return {
								...draft,
								target: "new",
								...(removedGroupDraftId !== undefined
									? { newGroupId: removedGroupDraftId }
									: {}),
							};
						}
						if (draft.target > groupIndex)
							return { ...draft, target: draft.target - 1 };
						return draft;
					});
				});
			}
			applyGroups(nextGroups, identityMap);
		});
	};

	const updateOrCondition = (
		groupIndex: number,
		conditionIndex: number,
		patch: { operator?: string; value?: FilterValue },
	) => {
		const groups = orGroups();
		const condition = groups[groupIndex]?.[conditionIndex];
		if (!condition) return;
		if (patch.operator !== undefined) condition.operator = patch.operator;
		if ("value" in patch) condition.value = patch.value;
		props.searchParams.setOrFilterGroups(groups);
	};

	/** Keeps an OR row visible when its value becomes empty and uncommittable. */
	const demoteOrRowToDraft = (
		groupIndex: number,
		conditionIndex: number,
		draft: Omit<DraftRow, "draftId">,
	) => {
		const draftId = nextDraftId++;
		batch(() => {
			replaceIdentity(`or:${groupIndex}:${conditionIndex}`, `draft:${draftId}`);
			setDrafts((current) => [...current, { ...draft, draftId }]);
			removeOrCondition(groupIndex, conditionIndex);
		});
	};

	/** Promotes top-level filters into OR groups when the first new group commits. */
	const promoteWithNewGroup = (
		newCondition: OrFilterCondition,
		committedDraft: DraftRow,
	) => {
		const identityMap = new Map<string, string | null>();
		const group0: OrFilterCondition[] = [];
		const demotedDrafts: DraftRow[] = [];

		for (const condition of topConditions()) {
			if (isValueEmpty(condition.value)) {
				const draftId = nextDraftId++;
				demotedDrafts.push({
					draftId,
					target: 0,
					key: condition.key,
					operator: condition.operator as DocumentFilterOperator | undefined,
					value: "",
				});
				identityMap.set(`top:${condition.key}`, `draft:${draftId}`);
				continue;
			}
			identityMap.set(`top:${condition.key}`, `or:0:${group0.length}`);
			group0.push(condition);
		}
		const newGroupIndex = group0.length > 0 ? 1 : 0;
		identityMap.set(`draft:${committedDraft.draftId}`, `or:${newGroupIndex}:0`);

		batch(() => {
			applyIdentityMap(identityMap);
			setDrafts((current) => [
				...retargetNewDraftGroup(
					current.filter((draft) => draft.draftId !== committedDraft.draftId),
					committedDraft,
					newGroupIndex,
				),
				...demotedDrafts,
			]);
			if (group0.length > 0) {
				props.searchParams.setParams({
					filters: clearedTopFilters(),
					orFilterGroups: [group0, [newCondition]],
				});
			} else {
				//* nothing to promote - a single group commits as top-level params
				props.searchParams.setParams({
					filters: {
						...clearedTopFilters(),
						...conditionsToFilters([newCondition]),
					},
					orFilterGroups: [],
				});
				replaceIdentity("or:0:0", `top:${newCondition.key}`);
			}
		});
	};

	const handleFieldChange = (row: RowModel, nextKey: string) => {
		const operator = defaultOperator(nextKey);
		if (row.ref.source === "draft") {
			updateDraft(row.ref.draftId, { key: nextKey, operator, value: "" });
			return;
		}
		if (row.ref.source === "top") {
			const oldKey = row.ref.key;
			//* keep the new empty row visible with an explicit operator
			batch(() => {
				props.searchParams.setParams({
					filters: {
						[oldKey]: { value: undefined, operator: undefined },
						[nextKey]: { value: undefined, operator },
					},
				});
				replaceIdentity(`top:${oldKey}`, `top:${nextKey}`);
			});
			return;
		}
		demoteOrRowToDraft(row.ref.groupIndex, row.ref.conditionIndex, {
			target: row.ref.groupIndex,
			key: nextKey,
			operator,
			value: "",
		});
	};

	const handleOperatorChange = (
		row: RowModel,
		operator: DocumentFilterOperator,
	) => {
		if (row.ref.source === "draft") {
			updateDraft(row.ref.draftId, { operator });
			return;
		}
		if (row.ref.source === "top") {
			props.searchParams.setFilter(row.ref.key, { value: row.value, operator });
			return;
		}
		updateOrCondition(row.ref.groupIndex, row.ref.conditionIndex, { operator });
	};

	const commitDraftValue = (draftId: number, value: FilterValue) => {
		const draft = drafts().find((d) => d.draftId === draftId);
		if (!draft?.key) return;
		if (isValueEmpty(value)) {
			updateDraft(draftId, { value });
			return;
		}
		const condition: OrFilterCondition = {
			key: draft.key,
			value,
			operator: draft.operator ?? defaultOperator(draft.key),
		};

		if (singleMode()) {
			if (draft.target === "new" && topConditions().length > 0) {
				promoteWithNewGroup(condition, draft);
				return;
			}
			//* base group condition (or first row entirely) - top-level param
			batch(() => {
				props.searchParams.setFilter(condition.key, {
					value: condition.value,
					operator: condition.operator,
				});
				replaceIdentity(`draft:${draftId}`, `top:${condition.key}`);
				removeDraft(draftId);
			});
			return;
		}

		const groups = orGroups();
		batch(() => {
			if (draft.target === "new" || draft.target >= groups.length) {
				props.searchParams.setOrFilterGroups([...groups, [condition]]);
				replaceIdentity(`draft:${draftId}`, `or:${groups.length}:0`);
				setDrafts((current) =>
					retargetNewDraftGroup(
						current.filter((draft) => draft.draftId !== draftId),
						draft,
						groups.length,
					),
				);
			} else {
				const group = groups[draft.target];
				if (!group) return;
				group.push(condition);
				props.searchParams.setOrFilterGroups(groups);
				replaceIdentity(
					`draft:${draftId}`,
					`or:${draft.target}:${group.length - 1}`,
				);
				removeDraft(draftId);
			}
		});
	};

	const handleValueCommit = (row: RowModel, value: FilterValue) => {
		if (row.ref.source === "draft") {
			commitDraftValue(row.ref.draftId, value);
			return;
		}
		if (row.ref.source === "top") {
			props.searchParams.setFilter(row.ref.key, {
				value,
				operator: row.operator,
			});
			return;
		}
		if (isValueEmpty(value)) {
			demoteOrRowToDraft(row.ref.groupIndex, row.ref.conditionIndex, {
				target: row.ref.groupIndex,
				key: row.fieldKey,
				operator: (row.operator ?? "=") as DocumentFilterOperator,
				value,
			});
			return;
		}
		updateOrCondition(row.ref.groupIndex, row.ref.conditionIndex, { value });
	};

	const handleRemove = (row: RowModel) => {
		const isLastRow = rows().length === 1;
		batch(() => {
			if (row.ref.source === "draft") {
				removeDraft(row.ref.draftId);
				removeIdentity(identity(row.ref));
			} else if (row.ref.source === "top") {
				props.searchParams.clearFilter(row.ref.key);
				removeIdentity(identity(row.ref));
			} else {
				removeOrCondition(row.ref.groupIndex, row.ref.conditionIndex);
			}
		});
		if (isLastRow) props.setOpen(false);
	};

	/** Group index a row's + action should extend. */
	const addTargetForRow = (row: RowModel): number | "new" => {
		if (row.ref.source === "top") return 0;
		if (row.ref.source === "or") return row.ref.groupIndex;
		if (row.ref.source === "draft") {
			const draftId = row.ref.draftId;
			const draft = drafts().find((draft) => draft.draftId === draftId);
			return draft?.target ?? 0;
		}
		return 0;
	};

	/** Extends the row's current group, including pending OR groups. */
	const handleAddRow = (row: RowModel) => {
		const target = addTargetForRow(row);
		let newGroupId: number | undefined;
		if (row.ref.source === "draft") {
			const draftId = row.ref.draftId;
			const draft = drafts().find((draft) => draft.draftId === draftId);
			if (draft?.target === "new") newGroupId = draftNewGroupId(draft);
		}
		addDraft(target, identity(row.ref), newGroupId);
	};

	// ----------------------------------
	// Effects
	//* open for URL-backed filters, close only when no row state remains
	createEffect(
		on(
			() => !props.searchParams.hasDefaultFiltersApplied(),
			(active) => {
				if (active) props.setOpen(true);
				else if (rows().length === 0) props.setOpen(false);
			},
		),
	);
	createEffect(
		on(
			() => props.open,
			(open) => {
				//* opening an empty section seeds the first draft row
				if (open && rows().length === 0) addDraft(0);
				if (!open) setDrafts([]);
			},
		),
	);
	//* canonicalise URL-only shapes the section does not commit itself
	createEffect(() => {
		if (!props.searchParams.ready()) return;
		const groups = props.searchParams.orFilterGroups();
		if (groups.length === 0) return;
		const top = topConditions();

		if (top.length > 0) {
			const nonEmptyTop = top.filter(
				(condition) => !isValueEmpty(condition.value),
			);
			const distributed = groups.map((group) => {
				const groupKeys = new Set(group.map((condition) => condition.key));
				return [
					...nonEmptyTop.filter((condition) => !groupKeys.has(condition.key)),
					...group,
				];
			});
			applyGroups(distributed, new Map());
			return;
		}
		if (groups.length === 1) {
			applyGroups(
				groups.map((group) => group.map((condition) => ({ ...condition }))),
				new Map(),
			);
		}
	});
	//* keeps the order list in sync - drops stale identities, appends rows that
	//* appeared from URL hydration or navigation
	createEffect(() => {
		const ids = rows().map((row) => identity(row.ref));
		const current = rowOrder();
		const idSet = new Set(ids);
		const kept = current.filter((id) => idSet.has(id));
		const keptSet = new Set(kept);
		const next = [...kept, ...ids.filter((id) => !keptSet.has(id))];
		if (next.join(" ") !== current.join(" ")) setRowOrder(next);
	});

	// ----------------------------------
	// Render
	return (
		<Show when={props.open}>
			<div class="-mx-4 md:-mx-6 -mb-4 md:-mb-6 mt-1.5 md:mt-3.5 px-4 md:px-6 py-4 bg-card-base border-t border-border">
				<h3 class="text-sm font-medium text-title mb-3">
					{T()("filter.section.title", {
						collection: props.collectionName,
					})}
				</h3>
				<div class="w-full flex flex-col gap-2.5">
					<Index each={rows()}>
						{(row, index) => (
							<>
								<Show when={index > 0}>
									<span class="text-xs font-medium text-icon-fade">
										{conjunctionLabel(
											row().groupTag === rows()[index - 1]?.groupTag,
										)}
									</span>
								</Show>
								<FilterRow
									id={`filter-row-${index}`}
									field={
										row().fieldKey
											? fieldsByKey().get(row().fieldKey as string)
											: undefined
									}
									operator={row().operator}
									value={row().value}
									fieldOptions={fieldOptionsForRow(row())}
									onFieldChange={(key) => handleFieldChange(row(), key)}
									onOperatorChange={(operator) =>
										handleOperatorChange(row(), operator)
									}
									onValueCommit={(value) => handleValueCommit(row(), value)}
									onAddRow={() => handleAddRow(row())}
									canAddRow={canAddRowAfter(row())}
									addRowDisabledReason={T()(
										"filter.section.add.row.unavailable",
									)}
									onRemove={() => handleRemove(row())}
								/>
							</>
						)}
					</Index>
				</div>
				<div class="w-full flex items-center gap-3 mt-4">
					<Button
						theme="border-outline"
						size="small"
						type="button"
						classes="gap-1.5"
						title={T()("filter.section.add.group")}
						aria-label={T()("filter.section.add.group")}
						onClick={() => addDraft("new")}
					>
						<FaSolidPlus size={10} />
						<span>{T()("filter.section.add.group.label")}</span>
					</Button>
					<span class="h-px flex-1 bg-border" aria-hidden="true" />
				</div>
			</div>
		</Show>
	);
};
