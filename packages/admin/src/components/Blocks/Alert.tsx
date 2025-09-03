import { type Component, Switch, Match, For, createMemo, Show } from "solid-js";
import classNames from "classnames";
import {
	FaSolidTriangleExclamation,
	FaSolidCheck,
	FaSolidExclamation,
	FaSolidInfo,
} from "solid-icons/fa";

interface AlertProps {
	style: "layout" | "block";
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
					"w-full",
					{
						"mb-4 last:mb-0": props.style === "block",
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
									"bg-warning-base text-warning-contrast":
										type === "warning" && props.style === "layout",
									"bg-error-base text-error-contrast":
										type === "error" && props.style === "layout",
									"bg-primary-base text-primary-contrast":
										(type === "success" || type === "info") &&
										props.style === "layout",
									"rounded-b-md": props.roundedBottom,
								})}
							>
								<span
									class={classNames(
										"w-6 h-6 flex items-center justify-center rounded-full min-w-[24px] mr-2.5",
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
												props.style === "layout",
											"bg-error-contrast text-error-base":
												type === "error" && props.style === "layout",
											"bg-warning-contrast text-warning-base":
												type === "warning" && props.style === "layout",
										},
									)}
								>
									<Switch>
										<Match when={type === "success"}>
											<FaSolidCheck size={10} />
										</Match>
										<Match when={type === "error"}>
											<FaSolidExclamation size={10} />
										</Match>
										<Match when={type === "warning"}>
											<FaSolidTriangleExclamation size={10} />
										</Match>
										<Match when={type === "info"}>
											<FaSolidInfo size={10} />
										</Match>
									</Switch>
								</span>
								<div>{message}</div>
							</div>
						</Show>
					)}
				</For>
			</div>
		</Show>
	);
};

export default Alert;
