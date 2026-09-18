import { useTranslation } from "@lucidcms/admin/hooks";
import type { FieldSlotComponent } from "@lucidcms/admin/types";
import { fields } from "../constants.js";
import type {} from "../shared/translations.js";
import { readImageId } from "./field-values.js";
import { useImage } from "./use-image.js";

const AltGuidance: FieldSlotComponent = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const isX = () => props.field.key === fields.xImageAlt;

	const ownImage = () =>
		readImageId(
			props.context.getValue(isX() ? fields.xImage : fields.socialImage),
		);
	const media = useImage(
		() =>
			ownImage() ??
			(isX()
				? readImageId(props.context.getValue(fields.socialImage))
				: undefined),
		() => props.context.contentLocale,
	);

	// ----------------------------------
	// Memos
	const message = () => {
		if (typeof props.field.value === "string" && props.field.value.trim()) {
			return "plugin.seo.image.altHelp";
		}

		const socialAlt = props.context.getValue(fields.socialImageAlt);

		if (
			isX() &&
			ownImage() === undefined &&
			typeof socialAlt === "string" &&
			socialAlt.trim()
		) {
			return "plugin.seo.image.altFromSocial";
		}

		if (media.alt().trim()) return "plugin.seo.image.altFromMedia";

		return "plugin.seo.image.altHelp";
	};

	// ----------------------------------
	// Render
	return (
		<p class="text-sm text-unfocused" data-testid="seo-alt-guidance">
			{t(message())}
		</p>
	);
};
export default AltGuidance;
