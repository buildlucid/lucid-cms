import classNames from "classnames";
import {
	TbOutlineAlertTriangle,
	TbOutlineCheck,
	TbOutlineExclamationMark,
	TbOutlineInfoCircle,
	TbOutlineX,
} from "solid-icons/tb";
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
import ActionIcon, {
	type ActionIconName,
} from "@/components/ActionIcon/ActionIcon";
import Button from "@/components/Button/Button";
import T from "@/translations";

interface CustomToastProps {
	title: string;
	message?: string;
	type: "success" | "error" | "warning" | "info";
	toast: Toast;
	duration?: number;
	/** Shown in place of the status glyph, for toasts about something specific, such as a link. */
	icon?: ActionIconName;
	action?: { label: string; icon?: ActionIconName; onClick: () => void };
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
	//* with more than a title, the icon sits just above the top of the text rather than at the title's middle
	const stacked = () => Boolean(props.message || props.action);

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
				"relative w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-card shadow-floating",
				{
					"animate-enter": props.toast.visible,
					"animate-leave": !props.toast.visible,
				},
			)}
		>
			<div
				class={classNames("flex gap-3 ps-3.5 pe-11", {
					"pt-3 pb-3.5": stacked(),
					"items-center py-3.5": !stacked(),
				})}
			>
				<span
					class={classNames(
						"flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-input",
						{
							"mt-0.5": stacked(),
							"text-icon": props.icon !== undefined,
							"text-success": !props.icon && props.type === "success",
							"text-danger": !props.icon && props.type === "error",
							"text-warning": !props.icon && props.type === "warning",
							"text-info": !props.icon && props.type === "info",
						},
					)}
				>
					<Show
						when={props.icon}
						fallback={
							<Switch>
								<Match when={props.type === "success"}>
									<TbOutlineCheck class="size-3.5" />
								</Match>
								<Match when={props.type === "error"}>
									<TbOutlineExclamationMark class="size-3.5" />
								</Match>
								<Match when={props.type === "warning"}>
									<TbOutlineAlertTriangle class="size-3.5" />
								</Match>
								<Match when={props.type === "info"}>
									<TbOutlineInfoCircle class="size-3.5" />
								</Match>
							</Switch>
						}
					>
						{(icon) => <ActionIcon icon={icon()} />}
					</Show>
				</span>
				<div class="flex min-w-0 flex-col gap-0.5">
					<p class="text-sm font-medium leading-5 text-title">{props.title}</p>
					<Show when={props.message}>
						<p class="text-[13px] leading-[19px] text-body">{props.message}</p>
					</Show>
					<Show when={props.action}>
						{(action) => (
							<div class="mt-2.5 flex">
								<Button
									data-drawer-ignore
									type="button"
									variant="secondary"
									size="xs"
									class="gap-1.5"
									onClick={() => {
										action().onClick();
										toast.dismiss(props.toast.id);
									}}
								>
									<Show when={action().icon}>
										{(icon) => <ActionIcon icon={icon()} size={12} />}
									</Show>
									{action().label}
								</Button>
							</div>
						)}
					</Show>
				</div>
			</div>
			<button
				data-drawer-ignore
				class="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-background-hover hover:text-icon focus-ring"
				onClick={() => toast.dismiss(props.toast.id)}
				type="button"
				aria-label={T()("common.close")}
			>
				<TbOutlineX class="size-3" />
			</button>
			{/* Duration bar */}
			<span
				class="absolute bottom-0 left-0 h-0.5 bg-title/15"
				style={{ width: `${life()}%` }}
			/>
		</div>
	);
};

export default CustomToast;
