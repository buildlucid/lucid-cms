import classNames from "classnames";
import {
	FaSolidCheck,
	FaSolidExclamation,
	FaSolidInfo,
	FaSolidTriangleExclamation,
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
	const [life, setLife] = createSignal(100);
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
		});

		onCleanup(() => clearInterval(interval));
	});

	// ----------------------------------------
	// Render
	return (
		<div
			class={classNames(
				"bg-background-base rounded-md p-4 border border-border drop-shadow-md w-[400px] relative overflow-hidden",
				{
					"animate-enter": props.toast.visible,
					"animate-leave": !props.toast.visible,
				},
			)}
		>
			<div class="z-10 relative flex pr-10">
				<span
					class={classNames(
						"w-6 h-6 flex items-center justify-center rounded-full min-w-[24px]",
						{
							"bg-primary-base text-primary-contrast":
								props.type === "success" || props.type === "info",
							"bg-error-base text-white": props.type === "error",
							"bg-warning-base text-primary-contrast": props.type === "warning",
						},
					)}
				>
					<Switch>
						<Match when={props.type === "success"}>
							<FaSolidCheck class="w-3 h-3 m-auto" />
						</Match>
						<Match when={props.type === "error"}>
							<FaSolidExclamation class="w-3 h-3 m-auto" />
						</Match>
						<Match when={props.type === "warning"}>
							<FaSolidTriangleExclamation class="w-3 h-3 m-auto" />
						</Match>
						<Match when={props.type === "info"}>
							<FaSolidInfo class="w-3 h-3 m-auto" />
						</Match>
					</Switch>
				</span>
				<div class="ml-4 gap-y-1 flex flex-col">
					<Show when={props.title}>
						<p class="text-sm font-bold capitalize text-title">{props.title}</p>
					</Show>
					<Show when={props.message}>
						<p class="text-sm">{props.message}</p>
					</Show>
				</div>
			</div>
			<button
				data-panel-ignore
				class="bg-input-base hover:bg-background-base flex justify-center top-1/2 -translate-y-1/2 items-center w-6 h-6 right-2.5 absolute rounded-full z-20 hover:text-error-base duration-200 transition-all shadow-md"
				onClick={() => toast.dismiss(props.toast.id)}
				type="button"
			>
				&times;
			</button>
			{/* Bakground duration bar */}
			<span
				class="inset-0 absolute bg-border opacity-50 z-0"
				style={{ width: `${life()}%` }}
			/>
		</div>
	);
};

export default CustomToast;
