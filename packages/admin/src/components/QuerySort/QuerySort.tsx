import classNames from "classnames";
import { FaSolidCaretUp, FaSolidMinus, FaSolidSort } from "solid-icons/fa";
import { type Component, createMemo, For, Match, Switch } from "solid-js";
import Menu from "@/components/Menu/Menu";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import T from "@/translations";

interface SortItemProps {
	sort: {
		label: string;
		key: string;
	};
	queryState: QueryStateResponse;
}

export interface QuerySortProps {
	/** The keys the menu can sort by, and how each one is labelled. */
	sorts: Array<SortItemProps["sort"]>;
	queryState: QueryStateResponse;
	disabled?: boolean;
	class?: string;
}

const SortItem: Component<SortItemProps> = (props) => {
	// ----------------------------------
	// Memos
	const sort = createMemo(() => props.queryState.sorts().get(props.sort.key));

	// ----------------------------------
	// Render
	return (
		<Menu.Item
			//* sorting by several keys at once means staying put between choices
			keepOpen
			textValue={props.sort.label}
			onSelect={() => {
				let sortValue: "asc" | "desc" | undefined;
				if (sort() === undefined) {
					sortValue = "asc";
				} else if (sort() === "asc") {
					sortValue = "desc";
				} else if (sort() === "desc") {
					sortValue = undefined;
				}

				props.queryState.setSort(props.sort.key, sortValue);
			}}
			end={
				<div
					class={classNames(
						"w-5 h-5 min-w-5 rounded-md flex items-center justify-center transition-colors duration-200",
						{
							"bg-secondary-base": sort() !== undefined,
							"bg-dropdown-hover": sort() === undefined,
						},
					)}
				>
					<Switch>
						<Match when={sort() !== undefined}>
							<FaSolidCaretUp
								aria-hidden="true"
								class={classNames("w-3 h-3 text-secondary-contrast", {
									"transform rotate-180": sort() === "desc",
								})}
							/>
						</Match>
						<Match when={sort() === undefined}>
							<FaSolidMinus aria-hidden="true" class="w-3 h-3 text-title" />
						</Match>
					</Switch>
				</div>
			}
		>
			{props.sort.label}
		</Menu.Item>
	);
};

/**
 * A menu that cycles each key through ascending, descending and off. Sortable
 * table headers do the same thing for a single column; this covers keys that
 * have no column of their own.
 *
 * @example
 * ```tsx
 * import { QuerySort } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<QuerySort
 * 		queryState={queryState}
 * 		sorts={[{ key: "createdAt", label: t("common.created.at") }]}
 * 	/>
 * );
 * ```
 */
const QuerySort: Component<QuerySortProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Menu.Root>
			<Menu.Trigger
				data-query-sort
				disabled={props.disabled}
				class={classNames(
					"flex h-9 items-center gap-2 rounded-md border border-transparent bg-secondary-base pr-3 pl-2 text-sm text-secondary-contrast fill-secondary-contrast hover:bg-secondary-hover disabled:cursor-not-allowed disabled:text-unfocused disabled:fill-unfocused disabled:hover:bg-secondary-base",
					props.class,
				)}
			>
				<FaSolidSort />
				<span>{T()("common.sort")}</span>
			</Menu.Trigger>
			<Menu.Content>
				<For each={props.sorts}>
					{(sort) => <SortItem sort={sort} queryState={props.queryState} />}
				</For>
			</Menu.Content>
		</Menu.Root>
	);
};

export default QuerySort;
