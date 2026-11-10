import classnames from "classnames";
import {
	TbOutlineClockExclamation,
	TbOutlineDatabase,
	TbOutlineLock,
	TbOutlineSparkles,
	TbOutlineWorld,
} from "solid-icons/tb";
import { type Component, createMemo, Match, Show, Switch } from "solid-js";
import Tooltip from "@/components/Tooltip/Tooltip";
import { useDocumentLocalization } from "@/hooks/useDocumentLocalization/useDocumentLocalization";
import { useFieldAccess } from "@/hooks/useFieldAccess/useFieldAccess";
import { useFieldTranslation } from "@/hooks/useFieldTranslation/useFieldTranslation";
import T from "@/translations";
import { getLocaleName } from "@/utils/locale-name";

export interface FieldLabelMarkersProps {
	/** The field stores a value per content locale. */
	localised?: boolean;
	/** Another locale of this field has failed validation. */
	altLocaleError?: boolean;
	/** The field has no column in the database yet. */
	fieldColumnIsMissing?: boolean;
}

export const FieldLabelMarkers: Component<FieldLabelMarkersProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const access = useFieldAccess();
	const translation = useFieldTranslation();
	const documentLocalization = useDocumentLocalization();

	// ----------------------------------------
	// Memos
	//* language-only requests lock shared fields and other locales, which isn't about permissions
	const lockReason = createMemo(() => {
		const editable = documentLocalization.editableLocales();
		if (editable === null) return T()("fields.permission.locked");
		if (!props.localised) return T()("fields.locale.locked");

		const code = documentLocalization.contentLocale() ?? "";
		if (editable.includes(code)) return T()("fields.permission.locked");
		return T()("fields.locale.request", { locale: getLocaleName(code) });
	});

	// ----------------------------------------
	// Render
	return (
		<span class="mr-1 inline-flex items-center gap-1 empty:hidden">
			<Show when={access() === "locked"}>
				<span class="inline" title={lockReason()}>
					<TbOutlineLock size={12} />
				</span>
			</Show>
			<Show when={props.fieldColumnIsMissing}>
				<span class="text-danger inline" title={T()("fields.database.missing")}>
					<TbOutlineDatabase size={12} />
				</span>
			</Show>
			<Switch>
				<Match when={translation.state() === "machine"}>
					<span
						class="inline text-primary"
						title={T()("fields.translation.machine")}
					>
						<TbOutlineSparkles size={12} />
					</span>
				</Match>
				<Match when={translation.state() === "outdated"}>
					<Show
						when={translation.markChecked}
						fallback={
							<span
								class="inline text-warning"
								title={T()("fields.translation.outdated")}
							>
								<TbOutlineClockExclamation size={12} />
							</span>
						}
					>
						{(markChecked) => (
							<Tooltip
								type="button"
								class="inline-flex text-warning rounded-sm hover:text-title focus-ring"
								content={T()("fields.translation.outdated.check")}
								aria-label={T()("fields.translation.outdated.check")}
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									markChecked()();
								}}
							>
								<TbOutlineClockExclamation size={12} />
							</Tooltip>
						)}
					</Show>
				</Match>
			</Switch>
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
		</span>
	);
};
