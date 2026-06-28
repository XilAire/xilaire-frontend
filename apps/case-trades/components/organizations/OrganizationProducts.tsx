import ProductEditor from "./ProductEditor";

type OrganizationProduct = {
  id: string;
  organization_id: string;
  product_key: string;
  name: string;
  description?: string | null;
  feature_key?: string | null;
  amount?: number | null;
  currency?: string | null;
  billing_interval?: string | null;
  discord_role_id?: string | null;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  active?: boolean | null;
  created_at?: string | null;
};

type OrganizationProductsProps = {
  organizationId: string;
  products: OrganizationProduct[];
};

function formatPrice(amount?: number | null, currency?: string | null) {
  if (amount === null || amount === undefined) return "Not set";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

export default function OrganizationProducts({
  organizationId,
  products,
}: OrganizationProductsProps) {
  return (
    <div className="space-y-6">
      <ProductEditor organizationId={organizationId} />

      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white">
            Organization Products
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Products connected to Stripe for this organization.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center">
            <p className="text-sm font-medium text-slate-300">
              No products found.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Create your first Stripe product above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">
                        {product.name}
                      </h3>

                      {product.active === false ? (
                        <span className="rounded-full border border-red-900/60 bg-red-950/40 px-2 py-0.5 text-xs text-red-300">
                          Inactive
                        </span>
                      ) : (
                        <span className="rounded-full border border-emerald-900/60 bg-emerald-950/40 px-2 py-0.5 text-xs text-emerald-300">
                          Active
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-slate-400">
                      {product.description || "No description provided."}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-sm font-semibold text-white">
                      {formatPrice(product.amount, product.currency)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {product.billing_interval
                        ? `per ${product.billing_interval}`
                        : "No interval"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-xs md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg bg-slate-950/70 p-3">
                    <p className="text-slate-500">Product Key</p>
                    <p className="mt-1 break-all font-medium text-slate-300">
                      {product.product_key}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-950/70 p-3">
                    <p className="text-slate-500">Feature</p>
                    <p className="mt-1 break-all font-medium text-slate-300">
                      {product.feature_key || "Not set"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-950/70 p-3">
                    <p className="text-slate-500">Stripe Product</p>
                    <p className="mt-1 break-all font-medium text-slate-300">
                      {product.stripe_product_id || "Not connected"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-950/70 p-3">
                    <p className="text-slate-500">Stripe Price</p>
                    <p className="mt-1 break-all font-medium text-slate-300">
                      {product.stripe_price_id || "Not connected"}
                    </p>
                  </div>
                </div>

                {product.discord_role_id ? (
                  <div className="mt-3 rounded-lg bg-slate-950/70 p-3 text-xs">
                    <p className="text-slate-500">Discord Role ID</p>
                    <p className="mt-1 break-all font-medium text-slate-300">
                      {product.discord_role_id}
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}