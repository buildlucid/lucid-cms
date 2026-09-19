import type { ErrorResponse, MediaCropState } from "@types";
import type { Accessor } from "solid-js";
import type { FocalPoint } from "@/components/FocalPointEditorModal/FocalPointEditorModal";
import type { SingleFileUploadProps } from "@/components/SingleFileUpload/SingleFileUpload";
import type { MediaImageGenerationFileMeta } from "@/store/aiModalsStore/aiModalsStore";
import type { ImageCropProvenance } from "@/utils/image-crop";

export interface UseSingleFileUploadProps {
	id: SingleFileUploadProps["id"];
	currentFile?: SingleFileUploadProps["currentFile"];
	disableRemoveCurrent?: SingleFileUploadProps["disableRemoveCurrent"];
	name: SingleFileUploadProps["name"];
	copy?: SingleFileUploadProps["copy"];
	accept?:
		| SingleFileUploadProps["accept"]
		| Accessor<SingleFileUploadProps["accept"]>;
	required?: SingleFileUploadProps["required"];
	disabled?: SingleFileUploadProps["disabled"];
	progress?: Accessor<SingleFileUploadProps["progress"]>;
	errors?: Accessor<ErrorResponse | undefined>;
	imageGeneration?: {
		enabled?: Accessor<boolean>;
		disabled?: Accessor<boolean>;
		onSetFile?: (
			_file: File,
			_meta?: MediaImageGenerationFileMeta,
		) => void | Promise<void>;
	};
	imageCrop?: {
		enabled?: Accessor<boolean>;
		disabled?: Accessor<boolean>;
		onSetFile?: (
			_file: File,
			_provenance: ImageCropProvenance,
			_state: MediaCropState,
		) => void | Promise<void>;
	};
}

export type FileProvenance = ImageCropProvenance;
export type FileSnapshot = {
	file: File | null;
	cropFile: File | null;
	cropState?: MediaCropState;
	cropRemoved: boolean;
	removedCurrent: boolean;
	focalPoint: FocalPoint | null;
	provenance?: FileProvenance;
};
