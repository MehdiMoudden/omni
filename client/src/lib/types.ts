export type Product = {
  product_id?: string;
  productId?: string;
  keyword?: string;
  name?: string;
  brand?: string;
  category?: string;
  description?: string;
  price?: number;
  regularPrice?: number | null;
  healthScore?: number | null;
  promotionIds?: string[];
  pricing?: {
    current_price?: number;
    regular_price?: number;
    promotion_ids?: string[];
  };
  nutrition?: {
    health_score?: number;
    nutri_score?: string;
    per_100g?: Record<string, number>;
  };
  labels?: string[];
  dietary_tags?: string[];
  image_url?: string;
};

export type UserPreferences = {
  dietaryTags: string[];
};

export type AssistantMeta = {
  reasoningOrigin?: "heuristic" | "bedrock" | "titan-express" | "titan-premier";
  rerankApplied?: boolean;
  advancedCandidateCount?: number;
  advancedRankingCount?: number;
  advancedRankingMatches?: number;
  advancedRerankApplied?: boolean;
  advancedFallbackApplied?: boolean;
  contextualFallbackApplied?: boolean;
  budgetAdjustmentApplied?: boolean;
  budgetMaxPrice?: number;
  budgetWithinCount?: number;
  budgetOverCount?: number;
  budgetAveragePrice?: number;
  preferenceFiltersApplied?: string[];
  preferenceFilteredOut?: number;
  preferenceMatchedCount?: number;
  preferenceFallback?: boolean;
  preferences?: UserPreferences;
  policyDecision?: {
    action?: string;
    resolvedAction?: string;
    confidence?: number;
    reason?: string;
    source?: string;
  };
  reasoningModel?: "bedrock" | "titan-express" | "titan-premier" | "none";
};

export type Promotion = {
  promotion_id?: string;
  promotionId?: string;
  title?: string;
  description?: string;
  discount_percent?: number;
  discount_amount?: number;
  stackable?: boolean;
  eligible_products?: string[];
  start_date?: string;
  end_date?: string;
  channels?: string[];
};

export type AssistantReasoning = {
  summary?: string;
  details?: string[];
  origin?: "heuristic" | "bedrock" | "titan-express" | "titan-premier";
  productRanking?: Array<{
    productId?: string | null;
    name?: string | null;
    score?: number | null;
    rationale?: string | null;
  }>;
};

export type AssistantResponse = {
  query: string;
  products: Product[];
  promotions: Promotion[];
  reasoning?: AssistantReasoning;
  meta?: AssistantMeta;
};

export type AssistantPayload = {
  nlQuery: string;
  size?: number;
  rerank?: boolean;
  useBedrock?: boolean;
  preferences?: UserPreferences;
};
