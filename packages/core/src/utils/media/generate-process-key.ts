import type { ImageProcessorOptions } from "../../types/config.js";

const generateProcessKey = (data: {
	key: string;
	options: ImageProcessorOptions;
	public: boolean;
}) => {
	const [targetK, ext] = data.key.split(".");
	let key = `processed/${targetK}`;

	if (data.options.quality) key = key.concat(`-${data.options.quality}`);
	if (data.options.width) key = key.concat(`-${data.options.width}`);
	if (data.options.height) key = key.concat(`-${data.options.height}`);

	if (data.options.format) key = key.concat(`.${data.options.format}`);
	else key = key.concat(`.${ext}`);

	return data.public ? `public/${key}` : `private/${key}`;
};

export default generateProcessKey;
