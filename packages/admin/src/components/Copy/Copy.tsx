import { CopyButton } from "./parts/CopyButton";
import { CopyInput } from "./parts/CopyInput";

export type { CopyButtonProps } from "./parts/CopyButton";
export type { CopyInputProps } from "./parts/CopyInput";

/**
 * Two ways to hand a value to the clipboard. Copy.Button is a line of text
 * that copies when clicked, Copy.Input a read-only field for a secret or a
 * URL the reader is meant to take away with them.
 *
 * @example
 * ```tsx
 * import { Copy } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<>
 * 		<Copy.Button value={media.url} label={media.key} class="text-xs" />
 * 		<Copy.Input value={apiKey} label={t("common.api.key")} />
 * 	</>
 * );
 * ```
 */
const Copy = {
	Button: CopyButton,
	Input: CopyInput,
};

export default Copy;
