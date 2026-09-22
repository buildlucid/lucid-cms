import { FieldDescription } from "./parts/FieldDescription";
import { FieldError } from "./parts/FieldError";
import { FieldLabel } from "./parts/FieldLabel";
import { FieldRoot } from "./parts/FieldRoot";

export type { FieldDescriptionProps } from "./parts/FieldDescription";
export type { FieldErrorProps } from "./parts/FieldError";
export type { FieldLabelProps } from "./parts/FieldLabel";
export type { FieldRootProps } from "./parts/FieldRoot";

/**
 * Adds a label, description and validation errors to a form control of your
 * own, matching the built in inputs.
 *
 * @example
 * ```tsx
 * import { Field } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<Field.Root id="rating" required>
 * 		<Field.Label>{t("rating")}</Field.Label>
 * 		<StarRating id="rating" value={rating()} onChange={setRating} />
 * 		<Field.Description>{t("rating.description")}</Field.Description>
 * 		<Field.Error />
 * 	</Field.Root>
 * );
 * ```
 */
const Field = {
	Root: FieldRoot,
	Label: FieldLabel,
	Description: FieldDescription,
	Error: FieldError,
};

export default Field;
