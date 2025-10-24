import { AssistantResponse, AssistantMeta, UserPreferences } from "../lib/types";

const metricLabelClass = "text-xs uppercase tracking-wide text-slate-500";

type InsightsPanelProps = {
  query: string;
  data?: AssistantResponse;
  isLoading: boolean;
  isError: Error | undefined;
  onPresetSelect: (prompt: string) => void;
  preferences: UserPreferences;
};

function averageHealthScore(products: AssistantResponse["products"]) {
  if (!products?.length) return null;
  const valid = products
    .map((item) => item.healthScore ?? item.nutrition?.health_score)
    .filter((score): score is number => typeof score === "number");
  if (!valid.length) return null;
  return Math.round(valid.reduce((sum, score) => sum + score, 0) / valid.length);
}

function averageSavings(products: AssistantResponse["products"]) {
  if (!products?.length) return null;
  let deltas: number[] = [];
  products.forEach((product) => {
    const current = product.price ?? product.pricing?.current_price;
    const regular = product.regularPrice ?? product.pricing?.regular_price;
    if (typeof current === "number" && typeof regular === "number" && regular > 0) {
      deltas.push(((regular - current) / regular) * 100);
    }
  });
  if (!deltas.length) return null;
  return Math.round((deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length) * 10) / 10;
}

function budgetStats(meta?: AssistantMeta) {
  if (!meta) return null;
  const maxPrice =
    typeof meta.budgetMaxPrice === "number" ? Math.round(meta.budgetMaxPrice * 100) / 100 : null;
  const within = typeof meta.budgetWithinCount === "number" ? meta.budgetWithinCount : null;
  const over = typeof meta.budgetOverCount === "number" ? meta.budgetOverCount : null;
  const average =
    typeof meta.budgetAveragePrice === "number"
      ? Math.round(meta.budgetAveragePrice * 100) / 100
      : null;
  const total = within !== null && over !== null ? within + over : null;
  return { maxPrice, within, over, total, average, adjusted: Boolean(meta.budgetAdjustmentApplied) };
}

export function InsightsPanel({
  query,
  data,
  isLoading,
  isError,
  onPresetSelect,
  preferences,
}: InsightsPanelProps) {
  const health = averageHealthScore(data?.products ?? []);
  const savings = averageSavings(data?.products ?? []);
  const reasoning = data?.reasoning;
  const metaStats = budgetStats(data?.meta);
  const preferenceTags = preferences.dietaryTags;
  const preferenceMeta = data?.meta?.preferenceFiltersApplied;
  const reasoningOrigin = data?.meta?.reasoningOrigin;
  let reasoningBadgeLabel = "Elastic heuristic mode";
  let reasoningBadgeClass = "badge bg-slate-200 text-slate-600";
  if (reasoningOrigin === "bedrock") {
    reasoningBadgeLabel = "Bedrock reasoning";
    reasoningBadgeClass = "badge bg-emerald-100 text-emerald-700";
  } else if (reasoningOrigin === "titan-express") {
    reasoningBadgeLabel = "Titan Express reasoning";
    reasoningBadgeClass = "badge bg-emerald-100 text-emerald-700";
  } else if (reasoningOrigin === "titan-premier") {
    reasoningBadgeLabel = "Titan Premier reasoning";
    reasoningBadgeClass = "badge bg-emerald-100 text-emerald-700";
  }

  return (
    <div className="bg-white shadow-lg border border-slate-200 rounded-2xl p-6 space-y-5">
      <header className="space-y-1">
        <span className="badge bg-primary-light/20 text-primary-dark">Assistant insights</span>
        <h3 className="text-xl font-semibold leading-tight">
          {isLoading ? "Evaluating your request" : `Optimising “${query}”`}
        </h3>
        {reasoning?.summary && !isLoading && (
          <p className="text-sm text-slate-600 leading-relaxed">{reasoning.summary}</p>
        )}
        {isError && (
          <p className="text-sm text-red-400">{isError.message}</p>
        )}
      </header>

      <section className="grid grid-cols-2 gap-4">
        <div className="bg-white shadow-lg border border-slate-200 rounded-2xl bg-slate-100 p-4 space-y-2">
          <span className={metricLabelClass}>Avg. Health score</span>
          <div className="text-3xl font-semibold">
            {health !== null ? `${health}` : "–"}
          </div>
          <p className="text-xs text-slate-500">
            Higher is better. We balance nutrient density, sugar, sodium and fibre targets.
          </p>
        </div>
        <div className="bg-white shadow-lg border border-slate-200 rounded-2xl bg-slate-100 p-4 space-y-2">
          <span className={metricLabelClass}>Avg. Savings vs shelf</span>
          <div className="text-3xl font-semibold">
            {savings !== null ? `${savings}%` : "–"}
          </div>
          <p className="text-xs text-slate-500">
            Promotion stacking and loyalty insights from Elastic MCP.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="bg-white shadow-lg border border-slate-200 rounded-2xl bg-slate-100 p-4 space-y-2">
          <span className={metricLabelClass}>Budget alignment</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold">
              {metaStats && metaStats.within !== null && metaStats.total
                ? `${metaStats.within}/${metaStats.total}`
                : "–"}
            </span>
            {metaStats && metaStats.maxPrice !== null && (
              <span className="text-xs text-slate-500">≤ €{metaStats.maxPrice}</span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {metaStats && metaStats.within !== null
              ? `${metaStats.within} products respect the budget${
                  metaStats.over ? `, ${metaStats.over} over` : ""
                }.`
              : "Budget-aware filtering activates automatically when you specify a price ceiling."}
          </p>
        </div>
        <div className="bg-white shadow-lg border border-slate-200 rounded-2xl bg-slate-100 p-4 space-y-2">
          <span className={metricLabelClass}>Average price</span>
          <div className="text-3xl font-semibold">
            {metaStats && metaStats.average !== null ? `€${metaStats.average}` : "–"}
          </div>
          <p className="text-xs text-slate-500">
            {metaStats?.adjusted
              ? "Budget enforcement re-ordered items to keep affordable picks first."
              : "Add a max budget to unlock price-aware ordering."}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={metricLabelClass}>Assistant focus</span>
          <button
            className="text-xs text-slate-600 hover:text-slate-900 transition"
            onClick={() => onPresetSelect(query)}
          >
            Re-run with tweaks
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {reasoning?.details?.length ? (
            reasoning.details.map((detail) => (
              <span key={detail} className="badge bg-slate-200">
                {detail}
              </span>
            ))
          ) : (
            <span className="text-slate-500 text-sm">
              The assistant will list nutrition, promotions and cost drivers once results are available.
            </span>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <span className={metricLabelClass}>Personalisation</span>
        <div className="flex flex-wrap gap-2 text-xs">
          {preferenceTags.length ? (
            preferenceTags.map((tag) => (
              <span key={tag} className="badge bg-primary/10 text-primary-dark border border-primary/20">
                {tag.replace(/_/g, " ")}
              </span>
            ))
          ) : (
            <span className="text-slate-500">No dietary filters active.</span>
          )}
          {preferenceMeta?.length ? (
            <span className="badge bg-slate-200 text-slate-600">
              Elastic filtered {preferenceMeta.map((tag) => tag.replace(/_/g, " ")).join(", ")}
            </span>
          ) : null}
          {data?.meta?.preferenceFallback ? (
            <span className="badge bg-amber-100 text-amber-700">
              Not enough matches—falling back to broader results
            </span>
          ) : null}
          <span className={reasoningBadgeClass}>{reasoningBadgeLabel}</span>
        </div>
      </section>
    </div>
  );
}
