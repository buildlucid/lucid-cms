const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Editorial thresholds only; search engines do not impose these character limits. */
export const assessText = (value: string, kind: "title" | "description") => {
	const count = [...segmenter.segment(value)].length;

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

/** A completion guide for core metadata, not a ranking or content-quality score. */
export const assessBasics = (values: {
	title: string;
	description: string;
	image: boolean;
}) => {
	const title = assessText(values.title, "title");
	const description = assessText(values.description, "description");

	const textPoints = (status: ReturnType<typeof assessText>["status"]) =>
		status === "empty" ? 0 : status === "long" ? 25 : 35;

	return (
		textPoints(title.status) +
		textPoints(description.status) +
		(values.image ? 30 : 0)
	);
};
