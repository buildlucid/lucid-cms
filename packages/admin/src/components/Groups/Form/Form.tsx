import T from "@/translations";
import { type Component, type JSXElement, Switch, Match, Show } from "solid-js";
import classNames from "classnames";
import Button from "@/components/Partials/Button";
import ErrorMessage from "@/components/Partials/ErrorMessage";
import ErrorBlock from "@/components/Partials/ErrorBlock";
import notifySvg from "@assets/illustrations/notify.svg";
import type { ErrorResponse } from "@types";

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
	};
	permission?: boolean;
	onSubmit?: () => void;
	children: JSXElement;
	submitRow?: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={props.queryState?.isError}>
				<ErrorBlock
					content={{
						image: notifySvg,
						title: T()("error_title"),
						description: T()("error_message"),
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
					<div class="mt-5 w-full">
						<Show when={props.state.errors?.message}>
							<ErrorMessage
								theme="basic"
								message={props.state.errors?.message}
								classes="mb-15"
							/>
						</Show>

						<div class="flex items-center gap-2.5">
							<Button
								size="medium"
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
							<Show when={props.submitRow}>{props.submitRow}</Show>
						</div>
					</div>
				</form>
			</Match>
		</Switch>
	);
};
