/** Exposes unassigned fields under the current default locale. */
const resolveInheritedLocaleRows = <T extends { locale: string | null }>(
	rows: T[],
	defaultLocale: string | null,
): T[] => {
	const inherited = rows.find((row) => row.locale === null);
	const locale = defaultLocale;
	if (
		!inherited ||
		locale === null ||
		rows.some((row) => row.locale === locale)
	)
		return rows;

	return [...rows, { ...inherited, locale }];
};
export default resolveInheritedLocaleRows;
