/**
 * Replaces template variables with their corresponding values.
 */
const replaceTemplateVariables = (
	template: string,
	data: Record<string, unknown> | null,
): string => {
	if (!data) {
		return template;
	}

	return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
		const value = data[key];

		if (value === null || value === undefined) {
			return "";
		}

		return String(value);
	});
};

export default replaceTemplateVariables;
