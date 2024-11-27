import { type Component, Show } from "solid-js";
import { FaSolidTriangleExclamation } from "solid-icons/fa";
import type { ErrorResult, FieldErrors } from "@lucidcms/core/types";

interface ErrorMessageProps {
	id?: string;
	errors?: ErrorResult | FieldErrors;
}

export const ErrorMessage: Component<ErrorMessageProps> = (props) => {
	return (
		<Show when={props.errors?.message !== undefined}>
			<a class="mt-2.5 flex items-start text-sm" href={`#${props.id}`}>
				<FaSolidTriangleExclamation
					size={16}
					class="text-error-base mt-[3px] mr-2"
				/>
				{typeof props.errors?.message === "string" && props.errors?.message}
			</a>
		</Show>
	);
};
