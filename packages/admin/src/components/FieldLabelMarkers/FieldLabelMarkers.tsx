import classnames from "classnames";
import { TbOutlineDatabase, TbOutlineWorld } from "solid-icons/tb";
import { type Component, Show } from "solid-js";
import T from "@/translations";

export interface FieldLabelMarkersProps {
	/** The field stores a value per content locale. */
	localised?: boolean;
	/** Another locale of this field has failed validation. */
	altLocaleError?: boolean;
	/** The field has no column in the database yet. */
	fieldColumnIsMissing?: boolean;
}

/** The icons a document field shows beside its label. */
export const FieldLabelMarkers: Component<FieldLabelMarkersProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<>
			<Show when={props.fieldColumnIsMissing}>
				<span class="text-danger inline" title={T()("fields.database.missing")}>
					<TbOutlineDatabase size={12} />
				</span>
			</Show>
			<Show when={props.localised}>
				<span
					class={classnames("inline", {
						"text-danger": props.altLocaleError,
					})}
					title={
						props.altLocaleError
							? T()("fields.validation.other.locales.errors")
							: T()("fields.localized.supported")
					}
				>
					<TbOutlineWorld size={12} />
				</span>
			</Show>
		</>
	);
};
