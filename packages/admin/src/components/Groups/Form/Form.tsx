import notifySvg from "@assets/illustrations/notify.svg";
import type { ErrorResponse } from "@types";
import classNames from "classnames";
import {
	type Component,
	createMemo,
	type JSXElement,
	Match,
	Show,
	Switch,
} from "solid-js";
import Button from "@/components/Partials/Button";
import ErrorBlock from "@/components/Partials/ErrorBlock";
import ErrorMessage from "@/components/Partials/ErrorMessage";
import T from "@/translations";

export const Form: Component<{
	queryState?: {
		isError?: boolean;
	};
	state: {
		isLoading: boolean;
		isDisabled?: boolean;
		errors: ErrorResponse | undefined;
	};
	content: {
		submit: string;
	};
	options?: {
		buttonFullWidth?: boolean;
		buttonSize?: "small" | "medium" | "large";
		disableErrorMessage?: boolean;
		errorPlacement?: "above" | "inline";
		hideSubmitWhenDisabled?: boolean;
	};
	permission?: boolean;
	onSubmit?: () => void;
	children: JSXElement;
	submitRow?: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const showSubmitButton = createMemo(() => {
		if (props.options?.hideSubmitWhenDisabled !== true) return true;
		return !props.state.isDisabled;
	});
	const errorMessage = createMemo(() => {
		if (props.options?.disableErrorMessage === true) return undefined;
		return props.state.errors?.message;
	});
	const showInlineError = createMemo(() => {
		return props.options?.errorPlacement === "inline";
	});

	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={props.queryState?.isError}>
				<ErrorBlock
					content={{
						image: notifySvg,
						title: T()("errors.generic.title"),
						description: T()("errors.generic.message"),
					}}
				/>
			</Match>
			<Match when={!props.queryState?.isError}>
				<form
					class="w-full"
					onSubmit={(e) => {
						e.preventDefault();
						if (props.onSubmit) props.onSubmit();
					}}
				>
					{props.children}
					<Show when={showSubmitButton() || props.submitRow || errorMessage()}>
						<div class="mt-4 w-full">
							<Show when={errorMessage() && !showInlineError()}>
								<ErrorMessage
									theme="basic"
									message={errorMessage()}
									classes="mb-4"
								/>
							</Show>

							<div class="flex items-center gap-2">
								<Show when={showSubmitButton()}>
									<Button
										size={props.options?.buttonSize || "medium"}
										classes={classNames({
											"w-full": props.options?.buttonFullWidth,
										})}
										type="submit"
										theme="primary"
										loading={props.state.isLoading}
										disabled={props.state.isDisabled}
										permission={props.permission}
									>
										{props.content.submit}
									</Button>
								</Show>
								<Show when={errorMessage() && showInlineError()}>
									<ErrorMessage
										theme="inline"
										message={errorMessage()}
										classes="min-w-0 flex-1"
									/>
								</Show>
								<Show when={props.submitRow}>{props.submitRow}</Show>
							</div>
						</div>
					</Show>
				</form>
			</Match>
		</Switch>
	);
};
