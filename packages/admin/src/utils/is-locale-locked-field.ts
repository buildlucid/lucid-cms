import type { CollectionFieldConfig } from "@/types/collection-config";

/**
 * Whether a locale-limited proposal locks a field. It only keeps its locales'
 * values, so shared fields, and every field in other locales, can't change.
 * Containers stay open so their fields can decide.
 */
const isLocaleLockedField = (props: {
	config: CollectionFieldConfig;
	/** The locales the proposal can change. Null when every locale can. */
	editableLocales: string[] | null;
	/** The locale the field is shown in. */
	locale: string | null | undefined;
}) => {
	if (props.editableLocales === null) return false;
	const { config } = props;
	if (
		config.type === "repeater" ||
		config.type === "tab" ||
		config.type === "section" ||
		config.type === "collapsible"
	) {
		return false;
	}
	const localized = "localized" in config && config.localized === true;
	return !localized || !props.editableLocales.includes(props.locale ?? "");
};

export default isLocaleLockedField;
