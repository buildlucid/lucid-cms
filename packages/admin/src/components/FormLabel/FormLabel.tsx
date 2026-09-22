import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";
import { FieldLabelMarkers } from "@/components/FieldLabelMarkers/FieldLabelMarkers";

interface LabelProps {
	id: string;
	label?: JSXElement;
	focused?: boolean;
	required?: boolean;
	theme: "full" | "basic";
	class?: string;

	localised?: boolean;
	altLocaleError?: boolean;
	fieldColumnIsMissing?: boolean;
	/** Before the label text, after any field markers. */
	startSlot?: JSXElement;
	rightSlot?: JSXElement;
}

export const FormLabel: Component<LabelProps> = (props) => {
	return (
		<Show when={props?.label !== undefined || props.rightSlot !== undefined}>
			<div
				data-field-label
				class={classnames(
					"mb-1.5 flex min-w-0 items-center justify-between gap-3 text-sm text-body",
					props.class,
					{
						"pt-2 px-2 mb-0!": props.theme === "full",
					},
				)}
			>
				<Show when={props?.label !== undefined}>
					<label
						for={props.id}
						class={classnames(
							"flex min-w-0 items-center gap-1 transition-colors duration-200 ease-in-out",
							{
								"text-primary-hover!": props.focused,
							},
						)}
					>
						<FieldLabelMarkers
							localised={props.localised}
							altLocaleError={props.altLocaleError}
							fieldColumnIsMissing={props.fieldColumnIsMissing}
						/>
						{props.startSlot}
						{props?.label}
						<Show when={props.required}>
							<span class="text-danger inline text-xs">*</span>
						</Show>
					</label>
				</Show>
				<Show when={props?.label === undefined}>
					<span />
				</Show>

				<div class="flex shrink-0 items-center gap-2">
					<Show when={props.rightSlot}>{props.rightSlot}</Show>
				</div>
			</div>
		</Show>
	);
};
