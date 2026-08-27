import type {
	ExtensionInfo,
	ExtensionReview,
	MarketplaceReviewStatus,
	MarketplaceSearchResult,
} from "@/lib/extensions";

const UNAVAILABLE_ERROR = "Extensions are no longer available in Recordly.";

export interface UseExtensionsResult {
	extensions: ExtensionInfo[];
	activeIds: Set<string>;
	ready: boolean;
	refresh: () => Promise<void>;
	toggleExtension: (id: string) => Promise<void>;
	installFromFolder: () => Promise<boolean>;
	uninstall: (id: string) => Promise<boolean>;
	openDirectory: () => Promise<void>;
	marketplaceSearch: (params: {
		query?: string;
		tags?: string[];
		sort?: "popular" | "recent" | "rating";
		page?: number;
		pageSize?: number;
	}) => Promise<MarketplaceSearchResult>;
	marketplaceInstall: (
		extensionId: string,
		downloadUrl: string,
	) => Promise<{ success: boolean; error?: string }>;
	marketplaceSubmit: (extensionId: string) => Promise<{ success: boolean; error?: string }>;
	fetchReviews: (params: {
		status?: MarketplaceReviewStatus;
		page?: number;
		pageSize?: number;
	}) => Promise<{ reviews: ExtensionReview[]; total: number }>;
	updateReview: (
		reviewId: string,
		status: MarketplaceReviewStatus,
		notes?: string,
	) => Promise<{ success: boolean }>;
}

const unavailableResult = { success: false, error: UNAVAILABLE_ERROR } as const;

export function useExtensions(): UseExtensionsResult {
	return {
		extensions: [],
		activeIds: new Set(),
		ready: true,
		refresh: async () => undefined,
		toggleExtension: async () => undefined,
		installFromFolder: async () => false,
		uninstall: async () => false,
		openDirectory: async () => undefined,
		marketplaceSearch: async (params) => ({
			extensions: [],
			total: 0,
			page: params.page ?? 1,
			pageSize: params.pageSize ?? 20,
		}),
		marketplaceInstall: async () => unavailableResult,
		marketplaceSubmit: async () => unavailableResult,
		fetchReviews: async () => ({ reviews: [], total: 0 }),
		updateReview: async () => ({ success: false }),
	};
}
