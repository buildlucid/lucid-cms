import { CopyButton } from "./parts/CopyButton";
import { CopyInput } from "./parts/CopyInput";

export type { CopyButtonProps } from "./parts/CopyButton";
export type { CopyInputProps } from "./parts/CopyInput";

/**
 * Copies a value to the clipboard. `Copy.Button` shows the value as text, and
 * `Copy.Input` shows it in a read-only input.
 *
 * @example
 * ```tsx
 * import { Copy } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return <Copy.Input value={apiKey()} label={t("common.api.key")} />;
 * ```
 */
const Copy = {
	Button: CopyButton,
	Input: CopyInput,
};

export default Copy;
