import type { Component } from "solid-js";
import type { ResponseBody } from "@types";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import { Pagination } from "@/components/Groups/Query";
import classNames from "classnames";

export const Paginated: Component<{
	state: {
		isLoading?: boolean;
		isError?: boolean;
		isSuccess?: boolean;
		meta?: ResponseBody<unknown>["meta"];
		searchParams: ReturnType<typeof useSearchParamsLocation>;
	};
	options?: {
		padding?: "16" | "24";
		embedded?: boolean;
	};
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<footer
			class={classNames("border-t border-border", {
				"p-4 md:p-6": props.options?.padding === "24",
				"p-4": props.options?.padding === "16",
				"p-0 mt-4 border-t-0": props.options?.embedded,
			})}
		>
			<Pagination
				state={{
					meta: props.state.meta,
					searchParams: props.state.searchParams,
				}}
			/>
		</footer>
	);
};
