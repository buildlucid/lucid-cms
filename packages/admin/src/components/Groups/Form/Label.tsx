import T from "@/translations";
import { type Component, Show } from "solid-js";
import classnames from "classnames";
import { FaSolidGlobe } from "solid-icons/fa";

interface LabelProps {
	id: string;
	label?: string;
	focused?: boolean;
	required?: boolean;
	noPadding?: boolean;
	theme: "full" | "basic" | "basic-small";
	altLocaleError?: boolean;
}

export const Label: Component<LabelProps> = (props) => {
	return (
		<Show when={props?.label !== undefined}>
			<label
				for={props.id}
				class={classnames(
					"text-sm transition-colors duration-200 ease-in-out flex justify-between",
					{
						"text-primary-hover": props.focused,
						"pt-2 px-2.5": props.noPadding !== true && props.theme === "full",
						"mb-2": props.noPadding === true,
					},
				)}
			>
				<span>
					{props?.label}
					<Show when={props.required}>
						<span class="text-error-base ml-1 inline">*</span>
					</Show>
				</span>

				<Show when={props.altLocaleError}>
					<span
						class="text-error-base ml-1 inline"
						title={T()("this_filed_has_errors_in_other_locales")}
					>
						<FaSolidGlobe size={12} />
					</span>
				</Show>
			</label>
		</Show>
	);
};
