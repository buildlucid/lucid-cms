import { mkdir, writeFile } from "node:fs/promises";
import type { ServiceFn } from "@lucidcms/core/types";
import { keyPaths } from "../../libs/media-adapter/adapters/file-system/helpers.js";
import T from "../../translations/index.js";
import checks from "./checks/index.js";

const uploadSingle: ServiceFn<
	[
		{
			buffer: Buffer | undefined | null;
			key: string;
			token: string;
			timestamp: string;
		},
	],
	boolean
> = async (context, data) => {
	const checkPresignedTokenRes = await checks.validatePresignedToken(context, {
		key: data.key,
		token: data.token,
		timestamp: data.timestamp,
	});
	if (checkPresignedTokenRes.error) return checkPresignedTokenRes;
	const { targetDir, targetPath } = keyPaths(
		data.key,
		// TODO: make this configurable
		"uploads",
	);
	await mkdir(targetDir, { recursive: true });
	if (Buffer.isBuffer(data.buffer)) {
		await writeFile(targetPath, data.buffer);
	} else {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("invalid_file"),
			},
		};
	}
	return {
		error: undefined,
		data: true,
	};
};

export default uploadSingle;
