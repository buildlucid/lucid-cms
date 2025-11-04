import T from "@/translations";
import { type Component, For, Switch, createMemo, Match } from "solid-js";
import { FaSolidSort, FaSolidCaretUp, FaSolidMinus } from "solid-icons/fa";
import type { SearchParamsResponse } from "@/hooks/useSearchParamsLocation";
import { DropdownMenu } from "@kobalte/core";
import DropdownContent from "@/components/Partials/DropdownContent";
import classNames from "classnames";

interface SortItemProps {
	sort: {
		label: string;
		key: string;
	};
	searchParams: SearchParamsResponse;
}

export interface SortProps {
	sorts: Array<SortItemProps["sort"]>;
	searchParams: SearchParamsResponse;
}

const SortItem: Component<SortItemProps> = (props) => {
	// ----------------------------------
	// Memos
	const sort = createMemo(() => {
		const sorts = props.searchParams.getSorts();
		const sort = sorts.get(props.sort.key);
		return sort;
	});

	// ----------------------------------
	// Render
	return (
		<li class="mb-2 last-of-type:mb-0">
			<button
				tabIndex={0}
				class="w-full flex items-center justify-between group focus:outline-hidden focus-visible:ring-1 focus:ring-primary-base"
				onClick={() => {
					let sortValue: "asc" | "desc" | undefined;
					if (sort() === undefined) {
						sortValue = "asc";
					} else if (sort() === "asc") {
						sortValue = "desc";
					} else if (sort() === "desc") {
						sortValue = undefined;
					}

					props.searchParams.setParams({
						sorts: {
							[props.sort.key]: sortValue,
						},
					});
				}}
				type="button"
			>
				<label
					for={`${props.sort.key}`}
					class="text-body flex items-center justify-between text-sm mr-2"
				>
					<span class="line-clamp-1 text-left">{props.sort.label}</span>
				</label>
				<div
					class={classNames(
						"w-5 h-5 min-w-[20px] rounded-md flex items-center justify-center transition-colors duration-200",
						{
							"bg-primary-base group-hover:bg-primary-hover":
								sort() === "desc" || sort() === "asc",
							"bg-dropdown-hover group-hover:bg-input-base":
								sort() === undefined,
						},
					)}
				>
					<Switch>
						<Match when={sort() === "desc" || sort() === "asc"}>
							<FaSolidCaretUp
								class={classNames("w-3 h-3 text-primary-contrast", {
									"transform rotate-180": sort() === "desc",
								})}
							/>
						</Match>
						<Match when={sort() === undefined}>
							<FaSolidMinus class="w-3 h-3 text-title" />
						</Match>
					</Switch>
				</div>
			</button>
		</li>
	);
};

export const Sort: Component<SortProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class={
					"dropdown-trigger px-2 h-9 text-sm bg-secondary-base hover:bg-secondary-hover text-secondary-contrast border border-transparent rounded-md fill-secondary-contrast flex items-center"
				}
			>
				<DropdownMenu.Icon>
					<FaSolidSort />
				</DropdownMenu.Icon>
				<span class="ml-2">{T()("sort")}</span>
			</DropdownMenu.Trigger>
			<DropdownContent
				options={{
					as: "ul",
					rounded: true,
					class: "w-[180px] z-60",
				}}
			>
				<For each={props.sorts}>
					{(sort) => <SortItem sort={sort} searchParams={props.searchParams} />}
				</For>
			</DropdownContent>
		</DropdownMenu.Root>
	);
};
