import { ImageSquare } from "@/components/ui/icons";
import { useState } from "react";
import { toFileUrl } from "../projectPersistence";
export function ProjectThumbnail({
	path,
	revision = 0,
}: {
	path: string | null;
	revision?: number;
}) {
	const [failedSource, setFailedSource] = useState<string | null>(null);
	const sourceKey = `${path}:${revision}`;
	return (
		<div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl bg-default/60">
			{path && failedSource !== sourceKey ? (
				<img
					src={
						/^(data:|blob:)/.test(path)
							? path
							: `${/^https?:/.test(path) ? path : toFileUrl(path)}?v=${revision}`
					}
					alt=""
					loading="lazy"
					draggable={false}
					onError={() => setFailedSource(sourceKey)}
					className="h-full w-full object-contain"
				/>
			) : (
				<ImageSquare weight="fill" className="size-8 text-muted-foreground/20" />
			)}
		</div>
	);
}
