import type { ZoomFocus, ZoomRegion } from "../types";
import { ZOOM_DEPTH_SCALES } from "../types";
import { TRANSITION_WINDOW_MS, ZOOM_IN_TRANSITION_WINDOW_MS } from "./constants";
import { clampFocusToScale } from "./focusUtils";
import { clamp01, easeOutZoom } from "./mathUtils";

const CHAINED_ZOOM_PAN_GAP_MS = 1350;

type DominantRegionOptions = {
	connectZooms?: boolean;
	zoomInDurationMs?: number;
	zoomOutDurationMs?: number;
};

type ConnectedRegionPair = {
	currentRegion: ZoomRegion;
	nextRegion: ZoomRegion;
	transitionStart: number;
};

type ConnectedPanTransition = {
	progress: number;
	startFocus: ZoomFocus;
	endFocus: ZoomFocus;
	startScale: number;
	endScale: number;
};

export function computeRegionStrength(
	region: ZoomRegion,
	timeMs: number,
	options: Pick<DominantRegionOptions, "zoomInDurationMs" | "zoomOutDurationMs"> = {},
) {
	const zoomInDurationMs = Math.max(1, options.zoomInDurationMs ?? ZOOM_IN_TRANSITION_WINDOW_MS);
	const zoomOutDurationMs = Math.max(1, options.zoomOutDurationMs ?? TRANSITION_WINDOW_MS);
	const length = region.endMs - region.startMs;
	if (length <= 0 || timeMs <= region.startMs || timeMs >= region.endMs) return 0;

	// Short blocks proportionally compress both ramps, with no discontinuity at
	// their meeting point. Every duration setting stays inside the block.
	const fit = Math.min(1, length / (zoomInDurationMs + zoomOutDurationMs));
	const inDuration = zoomInDurationMs * fit;
	const outDuration = zoomOutDurationMs * fit;
	if (timeMs < region.startMs + inDuration) {
		return easeOutZoom((timeMs - region.startMs) / inDuration);
	}
	return 1 - easeOutZoom(clamp01((timeMs - (region.endMs - outDuration)) / outDuration));
}

function getResolvedFocus(region: ZoomRegion, zoomScale: number): ZoomFocus {
	return clampFocusToScale(region.focus, zoomScale);
}

function getConnectedRegionPairs(regions: ZoomRegion[]) {
	const sortedRegions = [...regions].sort((a, b) => a.startMs - b.startMs);
	const pairs: ConnectedRegionPair[] = [];

	for (let index = 0; index < sortedRegions.length - 1; index += 1) {
		const currentRegion = sortedRegions[index];
		const nextRegion = sortedRegions[index + 1];
		const gapMs = nextRegion.startMs - currentRegion.endMs;

		if (gapMs < 0 || gapMs > CHAINED_ZOOM_PAN_GAP_MS) {
			continue;
		}

		pairs.push({
			currentRegion,
			nextRegion,
			transitionStart: currentRegion.endMs,
		});
	}

	return pairs;
}

function getActiveRegion(
	regions: ZoomRegion[],
	timeMs: number,
	connectedPairs: ConnectedRegionPair[],
	options: DominantRegionOptions,
) {
	const activeRegions = regions
		.map((region) => {
			const outgoingPair = connectedPairs.find((pair) => pair.currentRegion.id === region.id);
			const incomingPair = connectedPairs.find((pair) => pair.nextRegion.id === region.id);
			const start = incomingPair?.transitionStart ?? region.startMs;
			if (timeMs < start || (!incomingPair && timeMs === start) || timeMs >= region.endMs)
				return { region, strength: 0 };
			if (incomingPair || outgoingPair) {
				const inDuration = Math.max(
					1,
					options.zoomInDurationMs ?? ZOOM_IN_TRANSITION_WINDOW_MS,
				);
				const outDuration = Math.max(1, options.zoomOutDurationMs ?? TRANSITION_WINDOW_MS);
				const total = (incomingPair ? 0 : inDuration) + (outgoingPair ? 0 : outDuration);
				const fit = total > 0 ? Math.min(1, (region.endMs - start) / total) : 1;
				const strengthIn = incomingPair
					? 1
					: easeOutZoom(clamp01((timeMs - start) / (inDuration * fit)));
				const strengthOut = outgoingPair
					? 1
					: 1 -
						easeOutZoom(
							clamp01(
								(timeMs - (region.endMs - outDuration * fit)) / (outDuration * fit),
							),
						);
				return { region, strength: Math.min(strengthIn, strengthOut) };
			}

			return { region, strength: computeRegionStrength(region, timeMs, options) };
		})
		.filter((entry) => entry.strength > 0)
		.sort((left, right) => {
			if (right.strength !== left.strength) {
				return right.strength - left.strength;
			}

			return right.region.startMs - left.region.startMs;
		});

	if (activeRegions.length === 0) {
		return null;
	}

	const activeRegion = activeRegions[0].region;
	const activeScale = ZOOM_DEPTH_SCALES[activeRegion.depth];

	return {
		region: {
			...activeRegion,
			focus: getResolvedFocus(activeRegion, activeScale),
		},
		strength: activeRegions[0].strength,
		blendedScale: null,
	};
}

export function findDominantRegion(
	regions: ZoomRegion[],
	timeMs: number,
	options: DominantRegionOptions = {},
): {
	region: ZoomRegion | null;
	strength: number;
	blendedScale: number | null;
	transition: ConnectedPanTransition | null;
} {
	const connectedPairs = options.connectZooms ? getConnectedRegionPairs(regions) : [];

	const activeRegion = getActiveRegion(regions, timeMs, connectedPairs, options);
	return activeRegion
		? { ...activeRegion, transition: null }
		: { region: null, strength: 0, blendedScale: null, transition: null };
}
