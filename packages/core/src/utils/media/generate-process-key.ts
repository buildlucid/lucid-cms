import type { ImageProcessorOptions } from "../../types/config.js";

// TODO: check if the media type supports formatting etc. Otherwise we shouldnt concat any of the options to the key
const generateProcessKey = (data: {
	key: string;
	options: ImageProcessorOptions;
}) => {
	const [targetK, ext] = data.key.split(".");
	let key = `processed/${targetK}`;

	if (data.options.quality) key = key.concat(`-${data.options.quality}`);
	if (data.options.width) key = key.concat(`-${data.options.width}`);
	if (data.options.height) key = key.concat(`-${data.options.height}`);

	if (data.options.format) key = key.concat(`.${data.options.format}`);
	else key = key.concat(`.${ext}`);

	return key;
};

export default generateProcessKey;
