import T from "@/translations";
import { type Component, Show } from "solid-js";
import classnames from "classnames";
import { FaSolidGlobe, FaSolidDatabase } from "solid-icons/fa";

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
					"text-sm transition-colors duration-200 ease-in-out flex justify-between text-title mb-1.5",
					{
						"!text-primary-hover": props.focused,
						"pt-2 px-2 !mb-0": props.theme === "full",
					},
				)}
			>
				<span class="flex items-center">
					<Show when={props.fieldColumnIsMissing}>
						<span
							class="text-error-base mr-1 inline"
							title={T()("this_field_is_missing_from_the_database")}
						>
							<FaSolidDatabase size={12} />
						</span>
					</Show>
					<Show when={props.localised}>
						<span
							class={classnames("mr-1 inline", {
								"text-error-base": props.altLocaleError,
							})}
							title={
								props.altLocaleError
									? T()("this_filed_has_errors_in_other_locales")
									: T()("this_field_supports_translations")
							}
						>
							<FaSolidGlobe size={12} />
						</span>
					</Show>
					{props?.label}
					<Show when={props.required}>
						<span class="text-error-base ml-1 inline text-xs">*</span>
					</Show>
				</span>

				<Show when={!props.required && !props.hideOptionalText}>
					<span class="text-unfocused text-xs">{T()("optional")}</span>
				</Show>
			</label>
		</Show>
	);
};
