import classNames from "classnames";
import {
	FaSolidCheck,
	FaSolidExclamation,
	FaSolidInfo,
	FaSolidTriangleExclamation,
	FaSolidXmark,
} from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Match,
	onCleanup,
	Show,
	Switch,
} from "solid-js";
import { type Toast, toast } from "solid-toast";
import T from "@/translations";

interface CustomToastProps {
	title: string;
	message?: string;
	type: "success" | "error" | "warning" | "info";
	toast: Toast;
	duration?: number;
}

const CustomToast: Component<CustomToastProps> = (props) => {
	// ----------------------------------------
	// State
	const [life, setLife] = createSignal(0);
	const startTime = Date.now();

	// ----------------------------------------
	// Memos
	const duration = createMemo(() => {
		return props.duration || 5000;
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (props.toast.paused) return;
		const interval = setInterval(() => {
			const diff = Date.now() - startTime - props.toast.pauseDuration;

			const percentage = (diff / duration()) * 100;
			if (percentage <= 100) setLife(percentage);
		}, 50);

		onCleanup(() => clearInterval(interval));
	});

	// ----------------------------------------
	// Render
	return (
		<div
			class={classNames(
				"relative w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-md border border-border bg-card-base p-3.5 shadow-md",
				{
					"animate-enter": props.toast.visible,
					"animate-leave": !props.toast.visible,
				},
			)}
		>
			<div class="relative z-10 flex items-start gap-3 pr-8">
				<span
					class={classNames(
						"mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
						{
							"border-primary-muted-border bg-primary-muted-bg text-primary-muted-contrast":
								props.type === "success",
							"border-error-base/20 bg-error-base/10 text-error-base":
								props.type === "error",
							"border-warning-base/20 bg-warning-base/10 text-warning-base":
								props.type === "warning",
							"border-info-base/20 bg-info-base/10 text-info-base":
								props.type === "info",
						},
					)}
				>
					<Switch>
						<Match when={props.type === "success"}>
							<FaSolidCheck class="m-auto size-2.5" />
						</Match>
						<Match when={props.type === "error"}>
							<FaSolidExclamation class="m-auto size-2.5" />
						</Match>
						<Match when={props.type === "warning"}>
							<FaSolidTriangleExclamation class="m-auto size-2.5" />
						</Match>
						<Match when={props.type === "info"}>
							<FaSolidInfo class="m-auto size-2.5" />
						</Match>
					</Switch>
				</span>
				<div class="flex min-w-0 flex-col gap-y-0.5">
					<Show when={props.title}>
						<p class="text-sm font-semibold leading-5 text-title">
							{props.title}
						</p>
					</Show>
					<Show when={props.message}>
						<p class="text-sm leading-5 text-body">{props.message}</p>
					</Show>
				</div>
			</div>
			<button
				data-panel-ignore
				class="absolute right-2.5 top-2.5 z-20 flex size-7 items-center justify-center rounded-md text-icon-faded transition-colors duration-200 hover:bg-background-hover hover:text-icon-base focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base"
				onClick={() => toast.dismiss(props.toast.id)}
				type="button"
				aria-label={T()("common.close")}
			>
				<FaSolidXmark class="size-3" />
			</button>
			{/* Duration bar */}
			<span
				class={classNames("absolute bottom-0 left-0 z-20 h-0.5 opacity-80", {
					"bg-primary-base": props.type === "success",
					"bg-error-base": props.type === "error",
					"bg-warning-base": props.type === "warning",
					"bg-info-base": props.type === "info",
				})}
				style={{ width: `${life()}%` }}
			/>
		</div>
	);
};

export default CustomToast;
