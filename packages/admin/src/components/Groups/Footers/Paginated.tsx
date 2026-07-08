import type { ResponseBody } from "@types";
import classNames from "classnames";
import { type Component, createMemo, Show } from "solid-js";
import { Pagination } from "@/components/Groups/Query/Pagination";
import type { QueryStateResponse } from "@/hooks/useQueryState";

export const Paginated: Component<{
	state: {
		isLoading?: boolean;
		isError?: boolean;
		isSuccess?: boolean;
		meta?: ResponseBody<unknown>["meta"];
		searchParams: QueryStateResponse;
	};
	options?: {
		padding?: "16" | "24";
		embedded?: boolean;
		hideEmptyMessage?: boolean;
	};
}> = (props) => {
	// ----------------------------------------
	// Memos
	const hideForEmpty = createMemo(
		() =>
			props.options?.hideEmptyMessage === true &&
			(props.state.meta?.total ?? 0) === 0,
	);

	// ----------------------------------------
	// Render
	return (
		<Show when={!hideForEmpty()}>
			<footer
				class={classNames("border-t border-border", {
					"p-4 md:p-6":
						props.options?.embedded !== true && props.options?.padding === "24",
					"p-4":
						props.options?.embedded !== true && props.options?.padding === "16",
					"p-0 mt-4 border-t-0":
						props.options?.embedded === true &&
						props.options?.padding === undefined,
					"px-4 pt-4 border-t-0":
						props.options?.embedded === true && props.options?.padding === "16",
					"px-4 md:px-6 pt-4 md:pt-6 border-t-0":
						props.options?.embedded === true && props.options?.padding === "24",
				})}
			>
				<Pagination
					state={{
						meta: props.state.meta,
						searchParams: props.state.searchParams,
					}}
				/>
			</footer>
		</Show>
	);
};
