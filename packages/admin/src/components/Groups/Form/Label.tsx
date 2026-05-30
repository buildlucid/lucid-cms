import classnames from "classnames";
import { FaSolidDatabase, FaSolidGlobe } from "solid-icons/fa";
import { type Component, Show } from "solid-js";
import T from "@/translations";

interface LabelProps {
	id: string;
	label?: string;
	focused?: boolean;
	required?: boolean;
	theme: "full" | "basic";
	hideOptionalText?: boolean;

	localised?: boolean;
	altLocaleError?: boolean;
	fieldColumnIsMissing?: boolean;
}

export const Label: Component<LabelProps> = (props) => {
	return (
		<Show when={props?.label !== undefined}>
			<label
				for={props.id}
				class={classnames(
					"text-sm transition-colors duration-200 ease-in-out flex justify-between text-body mb-1.5",
					{
						"text-primary-hover!": props.focused,
						"pt-2 px-2 mb-0!": props.theme === "full",
					},
				)}
			>
				<span class="flex items-center gap-1">
					<Show when={props.fieldColumnIsMissing}>
						<span
							class="text-error-base inline"
							title={T()("fields.database.missing")}
						>
							<FaSolidDatabase size={12} />
						</span>
					</Show>
					<Show when={props.localised}>
						<span
							class={classnames("inline", {
								"text-error-base": props.altLocaleError,
							})}
							title={
								props.altLocaleError
									? T()("fields.validation.other.locales.errors")
									: T()("fields.localized.supported")
							}
						>
							<FaSolidGlobe size={12} />
						</span>
					</Show>
					{props?.label}
					<Show when={props.required}>
						<span class="text-error-base inline text-xs">*</span>
					</Show>
				</span>

				<Show when={!props.required && !props.hideOptionalText}>
					<span class="text-unfocused text-xs">{T()("common.optional")}</span>
				</Show>
			</label>
		</Show>
	);
};
