/**
 * Prepends the brand name to the subject if it is provided.
 */
const formatEmailSubject = (subject: string, brandName?: string) => {
	const brand = brandName?.trim();
	if (!brand) {
		return subject;
	}
	return `${brand} - ${subject}`;
};

export default formatEmailSubject;
