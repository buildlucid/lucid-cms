/** Sentence-cases configured UI subjects while retaining acronym tokens. */
export const formatFilterSectionSubject = (
	subject: string,
	preserveCase = false,
): string => {
	if (preserveCase) return subject;

	return subject
		.trim()
		.split(/\s+/)
		.map((word, index) => {
			const hasLetters = word.toLocaleLowerCase() !== word.toLocaleUpperCase();
			const isAcronym =
				hasLetters && word === word.toLocaleUpperCase() && word.length > 1;
			if (isAcronym) return word;

			const lower = word.toLocaleLowerCase();
			if (index > 0 || lower.length === 0) return lower;
			return `${lower[0]?.toLocaleUpperCase() ?? ""}${lower.slice(1)}`;
		})
		.join(" ");
};
