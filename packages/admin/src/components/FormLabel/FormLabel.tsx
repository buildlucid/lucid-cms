import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";
import { FieldLabelMarkers } from "@/components/FieldLabelMarkers/FieldLabelMarkers";
import { FormTooltip } from "@/components/FormTooltip/FormTooltip";

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
	/** Renders lock and locale markers unless disabled because `startSlot` already supplies them. */
	markers?: boolean;
	/** Shown as an info tooltip at the end of the label. Give the control `aria-describedby` for screen readers. */
	description?: string;
	/** Before the label text, after any field markers. */
	startSlot?: JSXElement;
	rightSlot?: JSXElement;
}

export const FormLabel: Component<LabelProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Show
			when={
				props?.label !== undefined ||
				props.rightSlot !== undefined ||
				props.description
			}
		>
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
							"flex min-w-0 items-center gap-1 transition-colors",
							{
								"text-primary-hover!": props.focused,
							},
						)}
					>
						<Show when={props.markers !== false}>
							<FieldLabelMarkers
								localised={props.localised}
								altLocaleError={props.altLocaleError}
								fieldColumnIsMissing={props.fieldColumnIsMissing}
							/>
						</Show>
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
					<FormTooltip
						copy={props.description}
						theme="inline"
						variant="ghost"
					/>
				</div>
			</div>
		</Show>
	);
};
