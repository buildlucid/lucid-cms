import { FieldDescription } from "./parts/FieldDescription";
import { FieldError } from "./parts/FieldError";
import { FieldLabel } from "./parts/FieldLabel";
import { FieldRoot } from "./parts/FieldRoot";

export type { FieldDescriptionProps } from "./parts/FieldDescription";
export type { FieldErrorProps } from "./parts/FieldError";
export type { FieldLabelProps } from "./parts/FieldLabel";
export type { FieldRootProps } from "./parts/FieldRoot";

/**
 * The label, description and error scaffolding the admin puts around every
 * control. Use it to give a control of your own the same treatment as the
 * built in ones.
 *
 * @example
 * ```tsx
 * import { Field } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<Field.Root id="brand-colour" required errors={errors()}>
 * 		<Field.Label>{t("common.average.colour")}</Field.Label>
 * 		<input id="brand-colour" type="color" value={colour()} onInput={onInput} />
 * 		<Field.Description>{t("common.description")}</Field.Description>
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
