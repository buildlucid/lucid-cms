import type { ErrorResult, FieldError } from "@types";
import { FaSolidTriangleExclamation } from "solid-icons/fa";
import { type Component, For, Show } from "solid-js";
import T from "@/translations";
import { normalizeFieldErrors } from "@/utils/error-helpers";

interface ErrorMessageProps {
	id?: string;
	errors?: ErrorResult | FieldError | FieldError[];
}

export const ErrorMessage: Component<ErrorMessageProps> = (props) => {
	const fieldErrors = () => normalizeFieldErrors(props.errors);
	const isErrorText = (message: unknown): message is FieldError["message"] => {
		return (
			typeof message === "object" &&
			message !== null &&
			"type" in message &&
			((message as { type?: string }).type === "lucid.text" ||
				(message as { type?: string }).type === "lucid.literal")
		);
	};
	const renderErrorMessage = (message: FieldError["message"] | string) =>
		typeof message === "string"
			? message
			: message.type === "lucid.literal"
				? message.value
				: (message.defaultMessage ?? message.key);
	const genericMessage = () => {
		if (!props.errors || Array.isArray(props.errors)) return undefined;
		const message = props.errors.message;
		if (typeof message === "string") return message;
		if (isErrorText(message)) return renderErrorMessage(message);
		return undefined;
	};

	return (
		<>
			<Show when={fieldErrors().length > 0}>
				<div class="mt-2 flex flex-col gap-1">
					<For each={fieldErrors()}>
						{(error) => (
							<a class="flex items-start text-sm" href={`#${props.id}`}>
								<FaSolidTriangleExclamation
									size={16}
									class="text-error-base mt-[3px] mr-2 shrink-0"
								/>
								<span>
									<Show when={typeof error.itemIndex === "number"}>
										{`${T()("common.item")} ${Number(error.itemIndex) + 1}: `}
									</Show>
									{renderErrorMessage(error.message)}
								</span>
							</a>
						)}
					</For>
				</div>
			</Show>
			<Show when={fieldErrors().length === 0 && genericMessage()}>
				<a class="mt-2 flex items-start text-sm" href={`#${props.id}`}>
					<FaSolidTriangleExclamation
						size={16}
						class="text-error-base mt-[3px] mr-2"
					/>
					{genericMessage()}
				</a>
			</Show>
		</>
	);
};
