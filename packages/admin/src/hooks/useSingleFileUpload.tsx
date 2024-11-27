import { type Accessor, createSignal } from "solid-js";
import type { SingleFileUploadProps } from "@/components/Groups/Form/SingleFileUpload";
import type { ErrorResponse } from "@lucidcms/core/types";
import { getBodyError } from "@/utils/error-helpers";
import Form from "@/components/Groups/Form";

interface UseSingleFileUploadProps {
	id: SingleFileUploadProps["id"];
	currentFile?: SingleFileUploadProps["currentFile"];
	disableRemoveCurrent?: SingleFileUploadProps["disableRemoveCurrent"];
	name: SingleFileUploadProps["name"];
	copy?: SingleFileUploadProps["copy"];
	accept?: SingleFileUploadProps["accept"];
	required?: SingleFileUploadProps["required"];
	disabled?: SingleFileUploadProps["disabled"];
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

	// ----------------------------------------
	// Functions
	const getMimeType = (): string | undefined => {
		return getFile()?.type;
	};
	const getFileName = (): string | undefined => {
		return getFile()?.name;
	};

	// ----------------------------------------
	// Render
	return {
		getFile,
		setGetFile,
		getRemovedCurrent,
		setGetRemovedCurrent,
		getCurrentFile,
		setCurrentFile,
		getMimeType,
		getFileName,
		reset: () => {
			setGetFile(null);
			setGetRemovedCurrent(false);
			setCurrentFile(data.currentFile);
		},
		Render: () => (
			<Form.SingleFileUpload
				state={{
					value: getFile(),
					setValue: setGetFile,
					removedCurrent: getRemovedCurrent(),
					setRemovedCurrent: setGetRemovedCurrent,
				}}
				currentFile={getCurrentFile()}
				disableRemoveCurrent={data.disableRemoveCurrent}
				id={data.id}
				name={data.name}
				copy={data.copy}
				accept={data.accept}
				required={data.required}
				disabled={data.disabled}
				errors={data.errors ? getBodyError(data.name, data.errors) : undefined}
				noMargin={data.noMargin}
			/>
		),
	};
};

export default useSingleFileUpload;
