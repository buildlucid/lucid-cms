import { A } from "@solidjs/router";
import classNames from "classnames";
import {
	FaSolidArrowUpRightFromSquare,
	FaSolidCheck,
	FaSolidCircleExclamation,
	FaSolidClock,
	FaSolidTriangleExclamation,
} from "solid-icons/fa";
import { type Component, type JSXElement, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

type CheckTone = "success" | "warning" | "danger" | "pending";

const checkIcons: Record<CheckTone, Component<{ size?: number }>> = {
	success: FaSolidCheck,
	warning: FaSolidTriangleExclamation,
	danger: FaSolidCircleExclamation,
	pending: FaSolidClock,
};

export const RequestCheckRow: Component<{
	tone: CheckTone;
	title: string;
	description?: JSXElement;
	href?: string;
	action?: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<li class="flex items-start gap-3 px-4 py-3">
			<span
				class={classNames(
					"flex size-6 shrink-0 items-center justify-center rounded-full border",
					{
						"border-success-low-border bg-success-low text-success-low-foreground":
							props.tone === "success",
						"border-warning-low-border bg-warning-low text-warning-low-foreground":
							props.tone === "warning",
						"border-danger-low-border bg-danger-low text-danger-low-foreground":
							props.tone === "danger",
						"border-border bg-background text-icon": props.tone === "pending",
					},
				)}
			>
				<Dynamic component={checkIcons[props.tone]} size={10} />
			</span>
			<div class="min-w-0 grow">
				<p class="text-sm font-medium text-subtitle">
					<Show when={props.href} fallback={props.title}>
						{(href) => (
							<A
								href={href()}
								class="inline-flex items-center gap-1.5 text-sm font-medium text-subtitle underline-offset-2 hover:underline"
							>
								{props.title}
								<Show when={!href().startsWith("#")}>
									<FaSolidArrowUpRightFromSquare
										size={10}
										class="shrink-0 text-icon"
									/>
								</Show>
							</A>
						)}
					</Show>
				</p>
				<Show when={props.description}>
					<p class="mt-0.5 text-sm text-muted">{props.description}</p>
				</Show>
			</div>
			<Show when={props.action}>
				<div class="flex shrink-0 items-center self-center">{props.action}</div>
			</Show>
		</li>
	);
};
