import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";

/**
 * A content locale's name, falling back to its code. `withCode` adds the code,
 * eg. "French (fr)", where it helps tell locales apart.
 */
export const getLocaleName = (
	code: string,
	options?: { withCode?: boolean },
) => {
	const name = contentLocaleStore.get.locales.find(
		(locale) => locale.code === code,
	)?.name;
	if (!name) return code;
	return options?.withCode ? `${name} (${code})` : name;
};
