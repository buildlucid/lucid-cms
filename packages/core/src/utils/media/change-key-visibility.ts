import constants from "../../constants/constants.js";
import getKeyVisibility from "./get-key-visibility.js";

type MediaVisibility =
	(typeof constants.media.visibilityKeys)[keyof typeof constants.media.visibilityKeys];

const changeKeyVisibility = (data: {
	key: string;
	visibility: MediaVisibility;
}) => {
	const current = getKeyVisibility(data.key);
	if (current === data.visibility) return data.key;
	const withoutPrefix = data.key.replace(
		new RegExp(
			`^(${constants.media.visibilityKeys.public}|${constants.media.visibilityKeys.private})\/`,
		),
		"",
	);
	return `${data.visibility}/${withoutPrefix}`;
};

export default changeKeyVisibility;
