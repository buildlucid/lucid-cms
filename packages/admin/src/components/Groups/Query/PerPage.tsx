import { DropdownMenu } from "@kobalte/core";
import classNames from "classnames";
import { FaSolidSort } from "solid-icons/fa";
import { type Component, createMemo, For } from "solid-js";
import DropdownContent from "@/components/Partials/DropdownContent";
import type { QueryStateResponse } from "@/hooks/useQueryState";
import T from "@/translations";

export interface PerPageProps {
	options?: Array<number>;
	searchParams: QueryStateResponse;
	disabled?: boolean;
}

export const PerPage: Component<PerPageProps> = (props) => {
	// ----------------------------------
	// Memos
	const options = createMemo(() => {
		return props.options || [10, 25, 50];
	});

	const currentPerPage = createMemo(() => {
		return props.searchParams.pagination().perPage;
	});

	// ----------------------------------
	// Render
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				disabled={props.disabled}
				class="dropdown-trigger flex h-9 items-center gap-2 rounded-md border border-border bg-input-base px-2 text-sm text-input-contrast fill-card-contrast hover:bg-secondary-hover hover:text-secondary-contrast disabled:cursor-not-allowed disabled:text-unfocused disabled:fill-unfocused disabled:hover:bg-input-base disabled:hover:text-unfocused"
			>
				<span>
					{T()("common.per.page", {
						count: currentPerPage(),
					})}
				</span>
				<DropdownMenu.Icon>
					<FaSolidSort />
				</DropdownMenu.Icon>
			</DropdownMenu.Trigger>
			<DropdownContent
				options={{
					as: "ul",
					rounded: true,
					class: "w-[180px] z-60 p-1.5!",
				}}
			>
				<For each={options()}>
					{(perpage) => (
						<li class="w-full">
							<button
								tabIndex={0}
								class={classNames(
									"w-full flex items-center justify-between group focus:outline-hidden focus-visible:ring-1 focus:ring-primary-base px-2 py-1 rounded-md",
									{
										"bg-dropdown-hover text-dropdown-contrast":
											currentPerPage() === perpage,
									},
								)}
								onClick={() => {
									props.searchParams.setParams({
										pagination: {
											perPage: perpage,
										},
									});
								}}
								type="button"
							>
								<label for={`${perpage}`} class="text-body text-sm">
									<span class="line-clamp-1 text-left">{perpage}</span>
								</label>
							</button>
						</li>
					)}
				</For>
			</DropdownContent>
		</DropdownMenu.Root>
	);
};
