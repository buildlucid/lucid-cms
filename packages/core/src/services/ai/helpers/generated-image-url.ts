/** Returns a CMS-relative image proxy URL so browser requests include the CMS login cookie. */
const generatedImageUrl = (storageKey: string) =>
	`/lucid/api/v1/ai/media-image/images/${encodeURIComponent(storageKey)}`;

export default generatedImageUrl;
