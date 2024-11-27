import type { Component } from "solid-js";
import type { ResponseBody } from "@lucidcms/core/types";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import Query from "@/components/Groups/Query";
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
		padding?: "15" | "30";
	};
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<footer
			class={classNames("border-t border-border", {
				"p-15 md:p-30": props.options?.padding === "30",
				"p-15": props.options?.padding === "15",
			})}
		>
			<Query.Pagination
				state={{
					meta: props.state.meta,
					searchParams: props.state.searchParams,
				}}
			/>
		</footer>
	);
};
