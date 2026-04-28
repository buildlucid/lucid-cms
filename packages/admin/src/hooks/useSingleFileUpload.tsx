import type { ErrorResponse } from "@types";
import { type Accessor, createSignal } from "solid-js";
import { SingleFileUpload } from "@/components/Groups/Form";
import type { SingleFileUploadProps } from "@/components/Groups/Form/SingleFileUpload";
import type { FocalPoint } from "@/components/Modals/Media/FocalPointEditor";
import { getBodyError } from "@/utils/error-helpers";
import {
	getImageMeta as getFileImageMeta,
	type ImageMeta,
} from "@/utils/media-meta";

interface UseSingleFileUploadProps {
	id: SingleFileUploadProps["id"];
	currentFile?: SingleFileUploadProps["currentFile"];
	disableRemoveCurrent?: SingleFileUploadProps["disableRemoveCurrent"];
	name: SingleFileUploadProps["name"];
	copy?: SingleFileUploadProps["copy"];
	accept?: SingleFileUploadProps["accept"];
	required?: SingleFileUploadProps["required"];
	disabled?: SingleFileUploadProps["disabled"];
	progress?: Accessor<SingleFileUploadProps["progress"]>;
	errors?: Accessor<ErrorResponse | undefined>;
	noMargin?: SingleFileUploadProps["noMargin"];
}

const useSingleFileUpload = (data: UseSingleFileUploadProps) => {
	// ----------------------------------------
	// State
	const [getFile, setGetFile] = createSignal<File | null>(null);
	const [getRemovedCurrent, setGetRemovedCurrent] =
		createSignal<boolean>(false);
	const [getCurrentFile, setCurrentFile] = createSignal<
		SingleFileUploadProps["currentFile"]
	>(data.currentFile);
	const [getFocalPoint, setFocalPoint] = createSignal<FocalPoint | null>(
		data.currentFile?.focalPoint ?? null,
	);

	// ----------------------------------------
	// Functions
	const getMimeType = (): string | undefined => {
		return getFile()?.type;
	};
	const getFileName = (): string | undefined => {
		return getFile()?.name;
	};
	const getImageMeta = async (): Promise<ImageMeta | null> => {
		const file = getFile();
		if (!file) return null;
		return getFileImageMeta(file);
	};

	// ----------------------------------------
	// Render
	return {
		getFile,
		setGetFile,
		getRemovedCurrent,
		setGetRemovedCurrent,
		getCurrentFile,
		setCurrentFile: (file: SingleFileUploadProps["currentFile"]) => {
			setCurrentFile(file);
			setFocalPoint(file?.focalPoint ?? null);
		},
		getFocalPoint,
		setFocalPoint,
		getMimeType,
		getFileName,
		getImageMeta,
		reset: () => {
			setGetFile(null);
			setGetRemovedCurrent(false);
			setCurrentFile(data.currentFile);
			setFocalPoint(data.currentFile?.focalPoint ?? null);
		},
		Render: () => (
			<SingleFileUpload
				state={{
					value: getFile(),
					setValue: (file) => {
						setGetFile(file);
						if (file) setFocalPoint(null);
					},
					removedCurrent: getRemovedCurrent(),
					setRemovedCurrent: (removed) => {
						setGetRemovedCurrent(removed);
						if (removed) setFocalPoint(null);
					},
				}}
				currentFile={getCurrentFile()}
				focalPoint={{
					value: getFocalPoint(),
					setValue: setFocalPoint,
				}}
				disableRemoveCurrent={data.disableRemoveCurrent}
				id={data.id}
				name={data.name}
				copy={data.copy}
				accept={data.accept}
				required={data.required}
				disabled={data.disabled}
				progress={data.progress?.()}
				errors={data.errors ? getBodyError(data.name, data.errors) : undefined}
				noMargin={data.noMargin}
			/>
		),
	};
};

export default useSingleFileUpload;
