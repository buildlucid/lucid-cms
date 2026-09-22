import classNames from "classnames";
import { FaSolidSort } from "solid-icons/fa";
import { type Component, createMemo, For } from "solid-js";
import Menu from "@/components/Menu/Menu";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import T from "@/translations";

export interface PerPageSelectProps {
	/** @default [10, 25, 50] */
	options?: number[];
	queryState: QueryStateResponse;
	disabled?: boolean;
	class?: string;
}

/**
 * A menu for choosing how many results to show per page.
 *
 * @example
 * ```tsx
 * import { PerPageSelect } from "@lucidcms/admin/components";
 *
 * return <PerPageSelect queryState={queryState} options={[20, 50, 100]} />;
 * ```
 */
const PerPageSelect: Component<PerPageSelectProps> = (props) => {
	// ----------------------------------
	// Memos
	const options = createMemo(() => props.options || [10, 25, 50]);
	const currentPerPage = createMemo(
		() => props.queryState.pagination().perPage,
	);

	// ----------------------------------
	// Render
	return (
		<Menu.Root>
			<Menu.Trigger
				data-per-page-select
				disabled={props.disabled}
				class={classNames(
					"flex h-9 items-center gap-2 rounded-md border border-border bg-input px-2 text-sm text-subtitle fill-body hover:bg-secondary-hover hover:text-secondary-foreground disabled:cursor-not-allowed disabled:text-muted disabled:fill-muted disabled:hover:bg-input disabled:hover:text-muted",
					props.class,
				)}
			>
				<span>
					{T()("common.per.page", {
						count: currentPerPage(),
					})}
				</span>
				<FaSolidSort />
			</Menu.Trigger>
			<Menu.Content>
				<For each={options()}>
					{(perPage) => (
						<Menu.Item
							selected={currentPerPage() === perPage}
							onSelect={() => props.queryState.setPerPage(perPage)}
							textValue={String(perPage)}
						>
							{perPage}
						</Menu.Item>
					)}
				</For>
			</Menu.Content>
		</Menu.Root>
	);
};

export default PerPageSelect;
