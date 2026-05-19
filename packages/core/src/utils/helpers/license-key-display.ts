export const createLicenseKeyDisplay = (key: string | null | undefined) => {
	const trimmed = key?.trim();
	if (!trimmed) return null;

	const visibleChars = 4;
	if (trimmed.length <= visibleChars) return trimmed;

	const hidden = "*".repeat(trimmed.length - visibleChars);
	return `${hidden}${trimmed.slice(-visibleChars)}`;
};
