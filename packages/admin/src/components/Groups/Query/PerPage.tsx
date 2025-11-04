import T from "@/translations";
import { type Component, For, createMemo } from "solid-js";
import { FaSolidSort } from "solid-icons/fa";
import type { SearchParamsResponse } from "@/hooks/useSearchParamsLocation";
import { DropdownMenu } from "@kobalte/core";
import DropdownContent from "@/components/Partials/DropdownContent";
import classNames from "classnames";

export interface PerPageProps {
	options?: Array<number>;
	searchParams: SearchParamsResponse;
}

export const PerPage: Component<PerPageProps> = (props) => {
	// ----------------------------------
	// Memos
	const options = createMemo(() => {
		return props.options || [10, 25, 50];
	});

	const currentPerPage = createMemo(() => {
		return props.searchParams.getPagination().perPage;
	});

	// ----------------------------------
	// Render
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger class="dropdown-trigger px-2 h-9 text-sm bg-input-base hover:bg-secondary-hover hover:text-secondary-contrast text-input-contrast border border-border rounded-md fill-card-contrast flex items-center">
				<span class="mr-2">
					{T()("per_page", {
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
