import { AssistantResponse, Product } from "../lib/types";
import { ProductCard } from "./ProductCard";
import { ReasoningPanel } from "./ReasoningPanel";
import { motion, AnimatePresence } from "framer-motion";

const shimmer = "bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse";

function EmptyState() {
  return (
    <div className="bg-white shadow-lg border border-slate-200 rounded-2xl h-full flex flex-col items-center justify-center text-center space-y-3">
      <div className="text-4xl">🧺</div>
      <h3 className="text-lg font-semibold">Awaiting your delicious brief</h3>
      <p className="text-sm text-slate-900/60 max-w-md">
        Ask for something specific like “healthy breakfast for kids under €10” to see AI-ranked results, active promotions, and the reasoning behind each recommendation.
      </p>
    </div>
  );
}

type AssistantViewProps = {
  query: string;
  data?: AssistantResponse;
  isLoading: boolean;
  isError: Error | undefined;
  onRefresh: () => void;
};

export function AssistantView({ query, data, isLoading, isError, onRefresh }: AssistantViewProps) {
  const meta = data?.meta;
  if (isError) {
    return (
      <div className="bg-white shadow-lg border border-slate-200 rounded-2xl p-8 space-y-3">
        <h3 className="text-lg font-semibold text-red-400">Something went wrong</h3>
        <p className="text-sm text-slate-900/70">{isError.message}</p>
        <button className="badge bg-white/10 hover:bg-white/20" onClick={onRefresh}>
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className={`h-40 rounded-2xl ${shimmer}`} />
        ))}
      </div>
    );
  }

  if ((!data?.products || data.products.length === 0) && !data?.reasoning?.summary && !data?.reasoning?.details?.length) {
    return <EmptyState />;
  }

  const usingBedrock = meta?.reasoningOrigin === "bedrock";
  const policy = meta?.policyDecision as
    | { action?: string; resolvedAction?: string; confidence?: number; reason?: string; source?: string }
    | undefined;
  const reasoningModel = meta?.reasoningModel ?? "none";
  const resolvedAction = policy?.resolvedAction || policy?.action;

  const elasticActive = resolvedAction === "elastic_only";
  const policyActive = policy?.source === "model";
  const bedrockActive = reasoningModel === "bedrock";
  const titanExpressActive = reasoningModel === "titan-express";
  const titanPremierActive = reasoningModel === "titan-premier";

  const productsEmpty = !data?.products || data.products.length === 0;
  const showReasoningPanel = Boolean(data?.reasoning) && !productsEmpty;

  const badgeClass = (active: boolean) =>
    active
      ? "badge border bg-emerald-100 text-emerald-700 border-emerald-200"
      : "badge border bg-slate-200 text-slate-500 border-slate-300";

  const engineBadges = [
    {
      label: "Elastic",
      active: elasticActive,
    },
    {
      label: "Haiku (policy)",
      active: policyActive,
    },
    {
      label: "Sonnet",
      active: bedrockActive,
    },
    {
      label: "Titan Express",
      active: titanExpressActive,
    },
    {
      label: "Titan Premier",
      active: titanPremierActive,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Top picks for “{query}”</h2>
          <p className="text-sm text-slate-900/60">
            Blending Elastic search relevance, nutrition intelligence, and promotion stacking.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="badge bg-white/10">#{data.products?.length ?? 0}</span>
          {engineBadges.map((badge) => (
            <span key={badge.label} className={badgeClass(badge.active)}>
              {badge.label}
            </span>
          ))}
          {meta?.budgetAdjustmentApplied ? (
            <span className="badge bg-amber-100 text-amber-700">Budget prioritised</span>
          ) : null}
        </div>
      </header>

      {showReasoningPanel ? <ReasoningPanel reasoning={data.reasoning} /> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {productsEmpty ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
            <p>
              {data.reasoning?.summary ||
                "No matching products were found for this query. Try adjusting the wording or relaxing filters."}
            </p>
            {data.reasoning?.details?.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-500">
                {data.reasoning.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {data.products.map((product) => (
              <motion.div
                layout
                key={product.product_id ?? product.productId ?? product.name}
                initial={{ opacity: 0, translateY: 16 }}
                animate={{ opacity: 1, translateY: 0 }}
                exit={{ opacity: 0, translateY: -16 }}
                transition={{ duration: 0.3 }}
              >
                <ProductCard product={product} promotions={data.promotions} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
