import type {
	ErrorCopy,
	FileSystemStorageAdapterOptions,
	ResolvedMediaStorageAdapter,
	ServiceContext,
	ServiceResponse,
} from "@lucidcms/core/types";

type FileSystemStorageAdapterInstance =
	ResolvedMediaStorageAdapter<FileSystemStorageAdapterOptions>;

const checkFileSystemStorageAdapter = async (
	context: ServiceContext,
	error: {
		name: ErrorCopy;
		message: ErrorCopy;
	},
): ServiceResponse<FileSystemStorageAdapterInstance> => {
	if (context.mediaStorage?.key !== "file-system") {
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
		data: context.mediaStorage as FileSystemStorageAdapterInstance,
	};
};

export default checkFileSystemStorageAdapter;
