/**
 * Whether a change to latest affects a request. Requests limited to some
 * locales only write those locales, so changes elsewhere leave them be.
 * Changes whose locales aren't known affect every request.
 */
const touchesLocales = (
	requestLocales: string[] | null,
	changedLocales: ReadonlyArray<string | null> | null | undefined,
) =>
	requestLocales === null ||
	!changedLocales ||
	changedLocales.some(
		(locale) => locale !== null && requestLocales.includes(locale),
	);

export default touchesLocales;
