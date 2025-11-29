import { type Component, Switch, Match, For, createMemo, Show } from "solid-js";
import classNames from "classnames";
import {
	FaSolidTriangleExclamation,
	FaSolidCheck,
	FaSolidExclamation,
	FaSolidInfo,
} from "solid-icons/fa";

interface AlertProps {
	style: "layout" | "block" | "pill";
	class?: string;
	roundedBottom?: boolean;
	alerts: Array<{
		type: "warning" | "success" | "info" | "error";
		message: string;
		show: boolean;
	}>;
}

const Alert: Component<AlertProps> = (props) => {
	// -------------------------------
	// Memos
	const showAlerts = createMemo(() => {
		return props.alerts.some((alert) => alert.show);
	});

	// -------------------------------
	// Render
	return (
		<Show when={showAlerts()}>
			<div
				class={classNames(
					{
						"w-full mb-4 last:mb-0": props.style === "block",
						"fixed bottom-6 left-[220px] right-0 z-50 flex justify-center gap-4 pointer-events-none px-4":
							props.style === "pill",
					},
					props.class,
				)}
			>
				<For each={props.alerts}>
					{({ type, message, show }) => (
						<Show when={show}>
							<div
								class={classNames("flex items-center border-border", {
									"mb-2 last:mb-0 bg-background-base border rounded-md p-4":
										props.style === "block",
									"border-b md:px-6 px-4 py-4": props.style === "layout",
									"rounded-full px-4 py-2 shadow-lg pointer-events-auto":
										props.style === "pill",
									"bg-warning-base text-warning-contrast":
										type === "warning" &&
										(props.style === "layout" || props.style === "pill"),
									"bg-error-base text-error-contrast":
										type === "error" &&
										(props.style === "layout" || props.style === "pill"),
									"bg-primary-base text-primary-contrast":
										(type === "success" || type === "info") &&
										(props.style === "layout" || props.style === "pill"),
									"rounded-b-md": props.roundedBottom,
								})}
							>
								<span
									class={classNames(
										"size-5 flex items-center justify-center rounded-full min-w-5 mr-2",
										{
											"bg-primary-base text-primary-contrast":
												(type === "success" || type === "info") &&
												props.style === "block",
											"bg-error-base text-error-contrast":
												type === "error" && props.style === "block",
											"bg-warning-base text-primary-contrast":
												type === "warning" && props.style === "block",

											"bg-primary-contrast text-primary-base":
												(type === "success" || type === "info") &&
												(props.style === "layout" || props.style === "pill"),
											"bg-error-contrast text-error-base":
												type === "error" &&
												(props.style === "layout" || props.style === "pill"),
											"bg-warning-contrast text-warning-base":
												type === "warning" &&
												(props.style === "layout" || props.style === "pill"),
										},
									)}
								>
									<Switch>
										<Match when={type === "success"}>
											<FaSolidCheck size={8} />
										</Match>
										<Match when={type === "error"}>
											<FaSolidExclamation size={8} />
										</Match>
										<Match when={type === "warning"}>
											<FaSolidTriangleExclamation size={8} />
										</Match>
										<Match when={type === "info"}>
											<FaSolidInfo size={8} />
										</Match>
									</Switch>
								</span>
								<p class="text-sm text-current">{message}</p>
							</div>
						</Show>
					)}
				</For>
			</div>
		</Show>
	);
};

export default Alert;
