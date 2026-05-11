import en from "./en.json" with { type: "json" };

const selectedLang = en;

const T = (
	key: keyof typeof selectedLang,
	data?: Record<string, string | number>,
) => {
	const translation = selectedLang[key as keyof typeof selectedLang];
	if (!translation) {
		return key;
	}
	if (!data) {
		return translation;
	}

	return translation.replace(
		/\{\{(\w+)\}\}/g,
		(_, p1) => data[p1 as keyof typeof data] as string,
	);
};

export default T;
