/** Returns a CMS-relative proxy URL for a generated file, so browser requests include the CMS login cookie. */
const generatedMediaUrl = (storageKey: string) =>
	`/api/v1/ai/media/files/${encodeURIComponent(storageKey)}`;

export default generatedMediaUrl;
