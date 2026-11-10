import {
	type Accessor,
	createEffect,
	createMemo,
	createSignal,
	untrack,
} from "solid-js";

interface ListQuery {
	data: unknown;
	isLoading: boolean;
	isPlaceholderData: boolean;
	isSuccess: boolean;
}

/**
 * How a list that belongs to one record should show its query, such as a
 * drawer of one user's logins or one collection's documents.
 *
 * A list query keeps its previous rows while the next ones load, which suits a
 * page, sort or filter change: the rows stay, dimmed, as `stale`. When the
 * record itself changes, the kept rows belong to another record, so they count
 * as `loading` and are never shown.
 *
 * @example
 * ```tsx
 * const logins = api.userLogins.useGetMultiple({ ... });
 * const list = useScopedListState(logins, () => props.userId);
 *
 * return <Table.Root loading={list.loading()} stale={list.stale()} />;
 * ```
 */
const useScopedListState = (query: ListQuery, scope: Accessor<unknown>) => {
	// ----------------------------------------
	// State
	const [settled, setSettled] = createSignal<{
		scope: unknown;
		data: unknown;
	}>();

	// ----------------------------------------
	// Memos
	const inScope = createMemo(() => {
		const current = settled();
		return current !== undefined && current.scope === scope();
	});
	const loading = createMemo(
		() => query.isLoading || (query.isPlaceholderData && !inScope()),
	);
	const stale = createMemo(() => query.isPlaceholderData && inScope());

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!query.isSuccess || query.isPlaceholderData) return;

		const data = query.data;
		const nextScope = scope();
		const current = untrack(settled);
		//* the same rows are already settled. That includes the moment a scope
		//* changes before its query does, when the data is still the old record's
		if (current !== undefined && current.data === data) return;

		setSettled({ scope: nextScope, data });
	});

	return { loading, stale };
};

export default useScopedListState;
