import { type Accessor, createSignal } from "solid-js";
import type { SingleFileUploadProps } from "@/components/Groups/Form/SingleFileUpload";
import type { ErrorResponse } from "@types";
import { getBodyError } from "@/utils/error-helpers";
import { SingleFileUpload } from "@/components/Groups/Form";
import { encode } from "blurhash";
import { FastAverageColor } from "fast-average-color";

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

export interface ImageMeta {
	width: number;
	height: number;
	blurHash: string;
	averageColor: string;
	isDark: boolean;
	isLight: boolean;
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
	const getImageMeta = async (): Promise<ImageMeta | null> => {
		const file = getFile();
		if (!file) return null;

		// Check if file is an image
		if (!file.type.startsWith("image/")) {
			return null;
		}

		try {
			// Create image element for loading
			const img = new Image();
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");

			if (!ctx) {
				console.warn(
					"Could not get canvas context for image metadata extraction",
				);
				return null;
			}

			// Load image
			await new Promise<void>((resolve, reject) => {
				img.onload = () => resolve();
				img.onerror = () => reject(new Error("Failed to load image"));
				img.src = URL.createObjectURL(file);
			});

			// Set canvas size to image dimensions
			canvas.width = img.width;
			canvas.height = img.height;

			// Draw image to canvas
			ctx.drawImage(img, 0, 0);

			// Get image data for processing
			const imageData = ctx.getImageData(0, 0, img.width, img.height);

			// Generate BlurHash (resize to smaller dimensions for performance)
			const blurHashSize = 64;
			const blurCanvas = document.createElement("canvas");
			const blurCtx = blurCanvas.getContext("2d");

			if (!blurCtx) {
				throw new Error("Could not get blur canvas context");
			}

			blurCanvas.width = blurHashSize;
			blurCanvas.height = Math.round((img.height / img.width) * blurHashSize);

			blurCtx.drawImage(img, 0, 0, blurCanvas.width, blurCanvas.height);
			const blurImageData = blurCtx.getImageData(
				0,
				0,
				blurCanvas.width,
				blurCanvas.height,
			);

			const blurHash = encode(
				blurImageData.data,
				blurCanvas.width,
				blurCanvas.height,
				4,
				4,
			);

			// Get average color
			const fastAverageColor = new FastAverageColor();
			const colorResult = await fastAverageColor.getColorAsync(canvas);

			// Clean up
			URL.revokeObjectURL(img.src);

			return {
				width: img.width,
				height: img.height,
				blurHash,
				averageColor: colorResult.rgba,
				isDark: colorResult.isDark,
				isLight: colorResult.isLight,
			};
		} catch (error) {
			console.error("Error extracting image metadata:", error);
			return null;
		}
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
		getImageMeta,
		reset: () => {
			setGetFile(null);
			setGetRemovedCurrent(false);
			setCurrentFile(data.currentFile);
		},
		Render: () => (
			<SingleFileUpload
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
