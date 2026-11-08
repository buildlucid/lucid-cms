import { useDocumentEditor, useTranslation } from "@lucidcms/admin/hooks";
import type { FieldSlotComponent } from "@lucidcms/admin/types";
import { fields } from "../../../constants.js";
import type {} from "../../../shared/translations.js";
import {
	hasMedia,
	readAlt,
	readImage,
	readText,
} from "../../utils/field-values.js";

const AltGuidance: FieldSlotComponent = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const editor = useDocumentEditor();

	// ----------------------------------
	// Memos
	const isX = () => props.field.key === fields.xImageAlt;
	const ownImageKey = () => (isX() ? fields.xImage : fields.socialImage);
	//* the X image falls back to the social image when it has none of its own
	const image = () =>
		hasMedia(props.fields, ownImageKey())
			? readImage(props.fields, ownImageKey())
			: isX()
				? readImage(props.fields, fields.socialImage)
				: undefined;
	const message = () => {
		if (typeof props.field.value === "string" && props.field.value.trim()) {
			return "plugin.seo.image.altHelp";
		}

		if (
			isX() &&
			!hasMedia(props.fields, fields.xImage) &&
			readText(props.fields, fields.socialImageAlt).trim()
		) {
			return "plugin.seo.image.altFromSocial";
		}

		if (readAlt(image(), editor.locale.current).trim()) {
			return "plugin.seo.image.altFromMedia";
		}

		return "plugin.seo.image.altHelp";
	};

	// ----------------------------------
	// Render
	return (
		<p class="text-sm text-muted" data-testid="seo-alt-guidance">
			{t(message())}
		</p>
	);
};
export default AltGuidance;
