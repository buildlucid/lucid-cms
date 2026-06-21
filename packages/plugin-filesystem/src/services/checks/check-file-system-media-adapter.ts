import type {
	ErrorCopy,
	FileSystemMediaAdapterOptions,
	MediaAdapterInstance,
	ServiceContext,
	ServiceResponse,
} from "@lucidcms/core/types";

type FileSystemMediaAdapterInstance =
	MediaAdapterInstance<FileSystemMediaAdapterOptions>;

const checkFileSystemMediaAdapter = async (
	context: ServiceContext,
	error: {
		name: ErrorCopy;
		message: ErrorCopy;
	},
): ServiceResponse<FileSystemMediaAdapterInstance> => {
	if (context.media?.key !== "file-system") {
		return {
			error: {
				type: "basic",
				name: error.name,
				message: error.message,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: context.media as FileSystemMediaAdapterInstance,
	};
};

export default checkFileSystemMediaAdapter;
