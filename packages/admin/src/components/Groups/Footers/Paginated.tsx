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
		padding?: "15" | "20";
	};
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<footer
			class={classNames("border-t border-border", {
				"p-15 md:p-5": props.options?.padding === "20",
				"p-15": props.options?.padding === "15",
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
