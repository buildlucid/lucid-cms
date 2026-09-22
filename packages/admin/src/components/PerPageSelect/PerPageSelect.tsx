import classNames from "classnames";
import { FaSolidSort } from "solid-icons/fa";
import { type Component, createMemo, For } from "solid-js";
import Menu from "@/components/Menu/Menu";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import T from "@/translations";

export interface PerPageSelectProps {
	/** Page sizes to offer. @default [10, 25, 50] */
	options?: number[];
	queryState: QueryStateResponse;
	disabled?: boolean;
	class?: string;
}

/**
 * A menu for how many rows a page shows. Changing the size returns to the
 * first page.
 *
 * @example
 * ```tsx
 * import { PerPageSelect } from "@lucidcms/admin/components";
 *
 * return <PerPageSelect queryState={queryState} options={[10, 20, 40]} />;
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
					"flex h-9 items-center gap-2 rounded-md border border-border bg-input-base px-2 text-sm text-input-contrast fill-card-contrast hover:bg-secondary-hover hover:text-secondary-contrast disabled:cursor-not-allowed disabled:text-unfocused disabled:fill-unfocused disabled:hover:bg-input-base disabled:hover:text-unfocused",
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
