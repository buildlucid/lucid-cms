import classNames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";
import Link from "@/components/Partials/Link";
import T from "@/translations";

const ErrorBlock: Component<{
	content: {
		image?: string;
		title?: string;
		description?: string;
	};
	link?: {
		text: string;
		href: string;
	};
	options?: {
		contentMaxWidth?: "md";
	};
	children?: JSXElement;
}> = (props) => {
	return (
		<div class={"flex items-center justify-center"}>
			<div class="w-full max-w-xl px-4 py-8 text-center flex flex-col items-center md:px-6 md:py-10">
				<Show when={props.content.image}>
					<img
						src={props.content.image}
						class="h-auto mx-auto mb-6 max-w-xs w-full max-h-40 object-contain"
						alt=""
					/>
				</Show>

				<h2 class="mb-1 text-sm font-semibold">
					{props.content.title ?? T()("errors.generic.title")}
				</h2>
				<p
					class={classNames("text-sm", {
						"max-w-96": props.options?.contentMaxWidth === undefined,
						"max-w-lg": props.options?.contentMaxWidth === "md",
					})}
				>
					{props.content.description ?? T()("errors.generic.message")}
				</p>
				<Show when={props.link !== undefined}>
					<Link
						theme={"primary"}
						size="small"
						classes="mt-4"
						href={props.link?.href || ""}
					>
						{props.link?.text || ""}
					</Link>
				</Show>
				<Show when={props.children}>
					<div class="mt-4">{props.children}</div>
				</Show>
			</div>
		</div>
	);
};

export default ErrorBlock;
