import { Product, Promotion } from "../lib/types";
import clsx from "clsx";

type ProductCardProps = {
  product: Product;
  promotions?: Promotion[];
};

function getPromotionBadge(product: Product, promotions?: Promotion[]) {
  if (!promotions?.length) return null;
  const productId = product.product_id || product.productId || "";
  const promo = promotions.find((item) => {
    if (item.eligible_products?.includes(productId)) return true;
    if (product.promotionIds?.includes(item.promotion_id ?? "")) return true;
    return false;
  });
  if (!promo) return null;
  const discount = promo.discount_percent ?? promo.discount_amount;
  if (!discount) return promo.title ?? "Promo";
  return typeof discount === "number" && discount <= 1
    ? `${Math.round(discount * 100)}% off`
    : `${discount}% off`;
}

function formatPrice(price?: number | null) {
  if (typeof price !== "number") return "–";
  return `€${price.toFixed(2)}`;
}

function percSavings(product: Product) {
  const current = product.price ?? product.pricing?.current_price;
  const regular = product.regularPrice ?? product.pricing?.regular_price;
  if (typeof current !== "number" || typeof regular !== "number" || regular === 0) return null;
  return Math.round(((regular - current) / regular) * 100);
}

export function ProductCard({ product, promotions }: ProductCardProps) {
  const badge = getPromotionBadge(product, promotions);
  const savings = percSavings(product);
  const healthScore = product.healthScore ?? product.nutrition?.health_score;
  const nutriScore = product.nutrition?.nutri_score;
  const regularPrice = product.regularPrice ?? product.pricing?.regular_price ?? null;
  const promoDetail = promotions?.find(
    (promo) =>
      promo.eligible_products?.includes(product.product_id || product.productId || "") ||
      product.promotionIds?.includes(promo.promotion_id ?? "")
  );
  const pricePerUnitValue = product.pricing?.price_per_unit?.value;
  const pricePerUnitUnit = product.pricing?.price_per_unit?.unit;
  const per100 = product.nutrition?.per_100g;
  const perServing = product.nutrition?.per_serving;

  const labelsArray = Array.isArray(product.labels)
    ? product.labels
    : product.labels
    ? [product.labels]
    : [];
  const dietaryArray = Array.isArray(product.dietary_tags)
    ? product.dietary_tags
    : product.dietary_tags
    ? [product.dietary_tags]
    : [];
  const labels = labelsArray.filter((tag) => typeof tag === "string");
  const dietary = dietaryArray.filter((tag) => typeof tag === "string");
  const tagList = [...labels, ...dietary].slice(0, 4);

  return (
    <div className="bg-white shadow-lg border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 hover:border-primary/60 transition">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-lg font-semibold leading-tight">
            {product.name || product.keyword || "Untitled product"}
          </h4>
          <p className="text-sm text-slate-900/60">
            {[product.brand, product.category].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className="badge bg-primary-light/20 text-primary-dark">
          {formatPrice(product.price)}
        </span>
      </div>

      {regularPrice && regularPrice !== product.price ? (
        <p className="text-xs text-slate-900/50">
          Regular price <span className="line-through">{formatPrice(regularPrice)}</span>
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="rounded-xl bg-slate-100 p-3">
          <p className="text-slate-900/60">Health score</p>
          <p className="text-xl font-semibold">{healthScore ?? "–"}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-3">
          <p className="text-slate-900/60">Nutri-Score</p>
          <p className="text-xl font-semibold">{nutriScore ?? "–"}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-3">
          <p className="text-slate-900/60">Savings</p>
          <p className="text-xl font-semibold">
            {savings !== null ? `${savings}%` : badge ?? "–"}
          </p>
          {pricePerUnitValue && (
            <p className="text-[11px] text-slate-900/50 mt-1">
              {pricePerUnitValue.toFixed(2)} {pricePerUnitUnit}
            </p>
          )}
        </div>
      </div>

      {product.description && (
        <p className="text-sm text-slate-900/70 line-clamp-3">{product.description}</p>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        {tagList.map((tag) => (
          <span key={tag} className="badge bg-slate-200">
            {tag}
          </span>
        ))}
        {badge && (
          <span className="badge bg-accent/15 text-accent">{badge}</span>
        )}
      </div>

      {promoDetail && (
        <div className="text-xs text-slate-900/70 bg-accent/10 border border-accent/30 rounded-lg p-3 space-y-1">
          <p className="font-semibold text-accent">
            {promoDetail.title || "Active promotion"}
          </p>
          <p>{promoDetail.description}</p>
          <p className="text-slate-900/60">
            {promoDetail.discount_percent
              ? `${promoDetail.discount_percent}% off`
              : promoDetail.discount_amount
              ? `€${promoDetail.discount_amount} off`
              : ""}
          </p>
          <p className="text-[11px] text-slate-900/50">
            {promoDetail.start_date && promoDetail.end_date
              ? `Valid ${promoDetail.start_date} – ${promoDetail.end_date}`
              : promoDetail.start_date
              ? `Starts ${promoDetail.start_date}`
              : promoDetail.end_date
              ? `Ends ${promoDetail.end_date}`
              : ""}
          </p>
          {promoDetail.loyalty_requirement && (
            <p className="text-[11px] text-slate-900/50">
              Loyalty: {promoDetail.loyalty_requirement}
            </p>
          )}
        </div>
      )}

      {(per100 || perServing) && (
        <div className="bg-slate-100 rounded-lg p-3 text-xs text-slate-900/60 space-y-1">
          <p className="uppercase tracking-wide text-[10px] text-slate-900/40">Nutrition snapshot</p>
          {per100 && (
            <p>
              <span className="text-slate-900/70">Per 100g:</span>{" "}
              {per100.energy_kcal ?? "–"} kcal · {per100.protein_g ?? "–"}g protein ·{" "}
              {per100.sugars_g ?? "–"}g sugars
            </p>
          )}
          {perServing && (
            <p>
              <span className="text-slate-900/70">Per serving:</span>{" "}
              {perServing.energy_kcal ?? "–"} kcal · {perServing.protein_g ?? "–"}g protein ·{" "}
              {perServing.sugars_g ?? "–"}g sugars
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button className="text-sm font-medium text-primary-light hover:text-primary transition">
          Add to basket
        </button>
        <button className="text-sm text-slate-900/60 hover:text-slate-900 transition">
          Why this item?
        </button>
      </div>
    </div>
  );
}
