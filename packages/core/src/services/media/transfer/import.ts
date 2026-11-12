import { copy } from "../../../libs/i18n/index.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import { MediaRepository } from "../../../libs/repositories/index.js";
import type {
	TransferImportOutcome,
	TransferImportProps,
} from "../../../libs/transfer/types.js";
import type { MediaActor } from "../../../utils/media/index.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import resolveActorUser from "../../users/helpers/resolve-actor-user.js";
import createMedia from "../create-single.js";
import type { MediaUploadFile } from "../helpers/upload-file.js";
import uploadMedia from "../upload-single.js";
import downloadTransferFile from "./helpers/download-transfer-file.js";
import resolveTransferFolder from "./helpers/resolve-transfer-folder.js";
import type { MediaEntry } from "./schema.js";

/** Reuses matching library media or uploads a bundled or downloaded file. */
const importMedia: ServiceFn<
	[TransferImportProps<MediaEntry>],
	TransferImportOutcome
> = async (context, props) => {
	const { entry } = props;
	if (props.existing !== undefined) {
		return {
			error: undefined,
			data: { status: "unchanged", id: props.existing, warnings: [] },
		};
	}

	const Media = new MediaRepository(context.db);
	const heldRes = await Media.selectSingle({
		select: ["id"],
		where: [{ key: "uid", operator: "=", value: entry.uid }],
	});
	if (heldRes.error) return heldRes;
	if (heldRes.data) {
		return {
			error: {
				status: 409,
				message: copy("server:core.transfer.media.unavailable"),
			},
			data: undefined,
		};
	}

	const userRes = await resolveActorUser(context, { actor: props.actor });
	if (userRes.error) return userRes;
	if (
		!hasAccess({
			user: userRes.data,
			requiredPermissions: [Permissions.MediaCreate],
		})
	) {
		return {
			error: {
				status: 403,
				message: copy("server:core.transfer.media.permission"),
			},
			data: undefined,
		};
	}
	if (entry.size > context.config.media.limits.uploadBytes) {
		return {
			error: {
				status: 413,
				message: copy("server:core.transfer.media.too.large"),
			},
			data: undefined,
		};
	}

	//* checks trust the entry's bundled file, so files aren't read until they're imported
	const file = props.dryRun ? undefined : await props.file();
	const bundled = props.dryRun ? entry.file !== undefined : file !== undefined;
	const downloadable =
		entry.url !== null && context.runtimeContext?.fetchPublic !== undefined;
	if (!bundled && !downloadable) {
		return {
			error: {
				status: 422,
				message: copy("server:core.transfer.media.file.missing"),
			},
			data: undefined,
		};
	}
	if (props.dryRun) {
		return {
			error: undefined,
			data: { status: "created", id: null, warnings: [] },
		};
	}

	const user = userRes.data;
	const actor: MediaActor =
		user.id === null ? { type: "internal" } : { type: "user", user };
	const folderRes = await resolveTransferFolder(context, {
		path: entry.folder,
		userId: user.id,
	});
	if (folderRes.error) return folderRes;

	const { defaultLocale, locales } = context.config.localization;
	//* unassigned text fills the default locale, and text in locales this site doesn't have is left out
	const text = (field: keyof MediaEntry["text"]) => {
		const values = entry.text[field] ?? [];
		if (defaultLocale === null) {
			const value =
				values.find((item) => item.localeCode === null) ?? values[0];
			return value ? [{ localeCode: null, value: value.value }] : [];
		}
		return values.filter(
			(item) =>
				item.localeCode === null ||
				locales.some(({ code }) => code === item.localeCode),
		);
	};
	const details = {
		uid: entry.uid,
		folderId: folderRes.data,
		title: text("title"),
		alt: text("alt"),
		description: text("description"),
		summary: text("summary"),
		transcript: text("transcript"),
		width: entry.meta.width ?? undefined,
		height: entry.meta.height ?? undefined,
		duration: entry.meta.duration,
		focalPoint: entry.meta.focalPoint ?? undefined,
		blurHash: entry.meta.blurHash ?? undefined,
		averageColor: entry.meta.averageColor ?? undefined,
		base64: entry.meta.base64,
		isDark: entry.meta.isDark ?? undefined,
		isLight: entry.meta.isLight ?? undefined,
		actor,
		userId: user.id,
		agentRunId: props.actor.agentRunId,
	};

	if (file?.type === "upload") {
		const createdRes = await serviceWrapper(createMedia, {
			transaction: true,
		})(context, {
			...details,
			key: file.key,
			fileName: entry.fileName,
			origin: "human",
			expectedSize: entry.size,
		});
		if (createdRes.error) return createdRes;

		return {
			error: undefined,
			data: {
				status: "created",
				id: String(createdRes.data.id),
				warnings: [],
			},
		};
	}

	//* bundled files keep the name they were exported with, whatever the reader calls them
	const body = file?.file;
	let upload: MediaUploadFile | undefined =
		body instanceof File
			? new File([body], entry.fileName, {
					type: body.type || entry.mimeType,
				})
			: body
				? {
						...body,
						fileName: entry.fileName,
						mimeType: body.mimeType ?? entry.mimeType,
					}
				: undefined;
	if (!upload) {
		const downloadRes = await downloadTransferFile(context, {
			url: entry.url ?? "",
		});
		if (downloadRes.error) return downloadRes;

		upload = {
			fileName: entry.fileName,
			mimeType: entry.mimeType,
			body: downloadRes.data,
		};
	}

	const uploadedRes = await uploadMedia(context, {
		...details,
		public: entry.public,
		file: upload,
	});
	if (uploadedRes.error) return uploadedRes;

	return {
		error: undefined,
		data: {
			status: "created",
			id: String(uploadedRes.data.id),
			warnings: [],
		},
	};
};

export default importMedia;
