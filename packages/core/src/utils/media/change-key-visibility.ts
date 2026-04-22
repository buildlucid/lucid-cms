import constants from "../../constants/constants.js";
import getKeyVisibility from "./get-key-visibility.js";
import normalizeMediaKey from "./normalize-media-key.js";

type MediaVisibility =
	(typeof constants.media.visibilityKeys)[keyof typeof constants.media.visibilityKeys];

const changeKeyVisibility = (data: {
	key: string;
	visibility: MediaVisibility;
}) => {
	const normalizedKey = normalizeMediaKey(data.key);
	const current = getKeyVisibility(normalizedKey);
	if (current === data.visibility) return normalizedKey;
	const withoutPrefix = normalizedKey.replace(
		new RegExp(
			`^(${constants.media.visibilityKeys.public}|${constants.media.visibilityKeys.private})/`,
		),
		"",
	);
	return `${data.visibility}/${withoutPrefix}`;
};

export default changeKeyVisibility;
