/** Editorial thresholds only; search engines do not impose these character limits. */
export const assessText = (value: string, kind: "title" | "description") => {
	const count = [
		...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
			value,
		),
	].length;

	const guide = kind === "title" ? 60 : 160;
	const status =
		value.trim().length === 0 ? "empty" : count > guide ? "long" : "concise";

	return { count, guide, status } as const;
};

export const resolveSocialText = (values: {
	title: string;
	description: string;
	socialTitle: string;
	socialDescription: string;
	xTitle: string;
	xDescription: string;
}) => {
	const social = {
		title: values.socialTitle.trim() || values.title.trim(),
		description: values.socialDescription.trim() || values.description.trim(),
	};

	return {
		social,
		x: {
			title: values.xTitle.trim() || social.title,
			description: values.xDescription.trim() || social.description,
		},
	};
};
