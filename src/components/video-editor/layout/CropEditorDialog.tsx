import { X } from "@phosphor-icons/react";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import type { useI18n } from "@/contexts/I18nContext";
import type { AspectRatio } from "@/utils/aspectRatioUtils";
import { CropControl } from "../CropControl";
import type { CropRegion } from "../types";

type Props = {
	open: boolean;
	t: ReturnType<typeof useI18n>["t"];
	videoElement: HTMLVideoElement | null;
	cropRegion: CropRegion;
	setCropRegion: Dispatch<SetStateAction<CropRegion>>;
	aspectRatio: AspectRatio;
	onCancel: () => void;
	onDone: () => void;
};

export function CropEditorDialog({
	open,
	t,
	videoElement,
	cropRegion,
	setCropRegion,
	aspectRatio,
	onCancel,
	onDone,
}: Props) {
	if (!open) return null;
	return (
		<>
			<div
				className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
				onClick={onCancel}
			/>
			<div className="fixed left-1/2 top-1/2 z-[60] max-h-[90vh] w-[90vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border border-foreground/10 bg-editor-dialog p-8 shadow-2xl animate-in zoom-in-95 duration-200">
				<div className="mb-6 flex items-center justify-between">
					<div>
						<span className="text-xl font-bold text-foreground">
							{t("settings.crop.title")}
						</span>
						<p className="mt-2 text-sm text-muted-foreground">
							{t("settings.crop.instruction")}
						</p>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={onCancel}
						className="text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
					>
						<X className="h-5 w-5" />
					</Button>
				</div>
				<CropControl
					videoElement={videoElement}
					cropRegion={cropRegion}
					onCropChange={setCropRegion}
					aspectRatio={aspectRatio}
				/>
				<div className="mt-6 flex justify-end">
					<Button
						onClick={onDone}
						size="lg"
						className="bg-[#2563EB] text-white hover:bg-[#2563EB]/90"
					>
						{t("common.actions.done")}
					</Button>
				</div>
			</div>
		</>
	);
}
