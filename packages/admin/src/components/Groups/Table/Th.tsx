import classNames from "classnames";
import {
	type Component,
	type JSXElement,
	Switch,
	Match,
	createMemo,
} from "solid-js";
import { FaSolidCaretUp, FaSolidMinus } from "solid-icons/fa";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import type { TableTheme } from "./Table";

interface ThProps {
	key?: string;
	index?: number;
	classes?: string;
	icon?: JSXElement;
	label?: string;
	searchParams?: ReturnType<typeof useSearchParamsLocation>;
	options?: {
		include?: boolean;
		width?: number;
		sortable?: boolean;
		padding?: "16" | "24";
	};
	theme?: TableTheme;
	children?: JSXElement;
}

// Head Column

export const Th: Component<ThProps> = (props) => {
	// ----------------------------------
	// Memos
	const sort = createMemo(() => {
		if (props.searchParams === undefined) return undefined;
		if (props.options?.sortable === false) return undefined;
		if (props.key === undefined) return undefined;

		const sorts = props.searchParams.getSorts();
		const sort = sorts.get(props.key);
		return sort;
	});
	const sortFull = createMemo(() => {
		if (sort() === undefined) return undefined;
		if (sort() === "asc") return "ascending";
		if (sort() === "desc") return "descending";
	});

	// ----------------------------------------
	// Render
	return (
		<th
			class={classNames(
				"text-left relative px-4 bg-clip-padding border-b border-border duration-200 transition-colors whitespace-nowrap",
				{
					"hover:bg-card-base": props.options?.sortable,
					hidden: props.options?.include === false,
					"bg-background-base":
						props.theme === "primary" || props.theme === undefined,
					"bg-card-base": props.theme === "secondary",
					"first:pl-4 md:first:pl-6 last:pr-4 md:last:pr-6":
						props.options?.padding === "24" ||
						props.options?.padding === undefined,
				},
				props?.classes,
			)}
			style={{
				width: props.options?.width ? `${props.options.width}px` : undefined,
			}}
			aria-sort={sortFull()}
		>
			<Switch>
				<Match when={props?.label !== undefined}>
					<Switch>
						<Match when={props.options?.sortable !== true}>
							<div class="flex items-center min-h-[50px]">
								<span class="text-base mr-2.5 fill-body">{props?.icon}</span>
								<span class="text-base text-body">{props?.label}</span>
							</div>
						</Match>
						<Match when={props.options?.sortable === true}>
							<button
								class="justify-between flex items-center w-full min-h-[50px]"
								onClick={() => {
									if (props.searchParams === undefined) return;
									if (props.key === undefined) return;

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
											[props.key]: sortValue,
										},
									});
								}}
								type="button"
							>
								<div class="flex items-center">
									<span class="text-base mr-2.5 fill-body">{props?.icon}</span>
									<span class="text-base text-body">{props?.label}</span>
								</div>
								<Switch>
									<Match when={sort() === "desc" || sort() === "asc"}>
										<FaSolidCaretUp
											aria-hidden="true"
											class={classNames("w-3 h-3 ml-2 text-title", {
												"transform rotate-180": sort() === "desc",
											})}
										/>
									</Match>
									<Match when={sort() === undefined}>
										<FaSolidMinus
											aria-hidden="true"
											class="w-3 h-3 text-title ml-2"
										/>
									</Match>
								</Switch>
							</button>
						</Match>
					</Switch>
				</Match>
				<Match when={props.children !== undefined}>{props.children}</Match>
			</Switch>
		</th>
	);
};
