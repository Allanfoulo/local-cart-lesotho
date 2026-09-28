import { ImageUpload } from "./ImageUpload";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Pencil, ArrowUp, ArrowDown, ArrowLeft, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { useAppStore, stockStatus } from "@/lib/app-store";
import type { Product, Category, Promotion } from "@/lib/types";
import { formatM } from "@/lib/format";
import { A, Field, ProductImage, attempt, Empty } from "@/components/shop/shared";
import { AdminHeading } from "./OrderManagement";
export function ProductsPage() {
  const s = useAppStore();
  const [q, setQ] = useState("");
  return (
    <>
      <AdminHeading
        title="Products"
        text="Keep your shelves fresh and your prices up to date."
        action={
          <A to="/admin/products/new" className="button">
            <Plus size={17} />
            Add product
          </A>
        }
      />
      <section className="admin-panel">
        <input
          className="search-input"
          aria-label="Search products"
          placeholder="Search products…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Availability</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {s.products
                .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
                .map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="table-product">
                        <ProductImage product={p} />
                        <strong>{p.name}</strong>
                      </div>
                    </td>
                    <td>{s.categories.find((c) => c.id === p.categoryId)?.name}</td>
                    <td>
                      {formatM(p.promoPrice ?? p.price)} / {p.unit}
                    </td>
                    <td>
                      {p.stock} {p.unit}
                    </td>
                    <td>
                      <span
                        className={`status ${stockStatus(p) === "out_of_stock" ? "status-cancelled" : stockStatus(p) === "low_stock" ? "status-preparing" : ""}`}
                      >
                        {stockStatus(p).replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      <A
                        to={`/admin/products/${p.id}`}
                        className="icon-button"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil size={17} />
                      </A>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
export function ProductEditor({ id }: { id?: string }) {
  const s = useAppStore();
  const navigate = useNavigate();
  const existing = s.products.find((p) => p.id === id);
  const [p, setP] = useState<Product>(
    existing ?? {
      id: crypto.randomUUID(),
      slug: "",
      name: "",
      description: "",
      categoryId: s.categories[0]?.id ?? "",
      price: 0,
      unit: "each",
      soldByWeight: false,
      stock: 0,
      lowStockThreshold: 5,
      available: true,
      popularity: 0,
      createdAt: new Date().toISOString(),
      emoji: "🛒",
    },
  );
  const [promo, setPromo] = useState(existing?.promoPrice?.toString() ?? "");
  const [deleting, setDeleting] = useState(false);
  if (id && !existing)
    return (
      <Empty
        title="Product not found"
        text="Choose a product from your catalogue."
        to="/admin/products"
        action="Products"
      />
    );
  return (
    <>
      <A to="/admin/products" className="back">
        <ArrowLeft size={16} />
        Products
      </A>
      <AdminHeading
        title={existing ? "Edit product" : "Add a fresh find"}
        text="Clear names, honest prices, and a photo help customers shop."
      />
      <form
        className="admin-panel editor-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (
            !p.name.trim() ||
            p.price <= 0 ||
            p.stock < 0 ||
            (!p.soldByWeight && !Number.isInteger(p.stock))
          ) {
            toast.error("Check the name, price and stock quantity.");
            return;
          }
          if (promo && (Number(promo) < 0 || Number(promo) >= p.price)) {
            toast.error("The special price must be lower than the regular price.");
            return;
          }
          const next = {
            ...p,
            name: p.name.trim(),
            slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          };
          delete next.promoPrice;
          if (promo) next.promoPrice = Number(promo);
          attempt(() => {
            s.upsertProduct(next);
            navigate({ to: "/admin/products" });
          }, "Product saved.");
        }}
      >
        <div className="form-grid">
          <Field
            label="Product name"
            required
            value={p.name}
            onChange={(e) => setP({ ...p, name: e.target.value })}
          />
          <label className="field">
            <span>Category</span>
            <select
              value={p.categoryId}
              onChange={(e) => setP({ ...p, categoryId: e.target.value })}
            >
              {s.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Price (M)"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={p.price}
            onChange={(e) => setP({ ...p, price: Number(e.target.value) })}
          />
          <Field
            label="Special price (optional)"
            type="number"
            min="0"
            step="0.01"
            value={promo}
            onChange={(e) => setPromo(e.target.value)}
          />
          <label className="field">
            <span>Selling unit</span>
            <select
              value={p.unit}
              onChange={(e) =>
                setP({
                  ...p,
                  unit: e.target.value as Product["unit"],
                  soldByWeight: e.target.value === "kg" || e.target.value === "gram",
                })
              }
            >
              {["each", "pack", "kg", "gram", "litre", "crate"].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
          <Field
            label="Stock quantity"
            type="number"
            min="0"
            step={p.soldByWeight ? "0.01" : "1"}
            required
            value={p.stock}
            onChange={(e) => setP({ ...p, stock: Number(e.target.value) })}
          />
          <Field
            label="Low-stock threshold"
            type="number"
            min="0"
            required
            value={p.lowStockThreshold}
            onChange={(e) => setP({ ...p, lowStockThreshold: Number(e.target.value) })}
          />
          <Field
            label="Fallback product symbol"
            value={p.emoji}
            onChange={(e) => setP({ ...p, emoji: e.target.value })}
          />
        </div>
        <label className="field">
          <span>Description</span>
          <textarea
            value={p.description}
            required
            onChange={(e) => setP({ ...p, description: e.target.value })}
          />
        </label>
        <Field
          label="Image URL (optional)"
          type="url"
          value={p.imageUrl ?? ""}
          onChange={(e) => setP({ ...p, imageUrl: e.target.value })}
        />
        <label className="field">
          <span>Or upload a product photo (up to 1 MB)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 1024 * 1024) {
                toast.error("Choose an image smaller than 1 MB for this browser demo.");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => setP({ ...p, imageUrl: String(reader.result) });
              reader.readAsDataURL(file);
            }}
          />
        </label>
        <div className="image-preview">
          <ProductImage product={p} />
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={p.available}
            onChange={(e) => setP({ ...p, available: e.target.checked })}
          />
          Available for customers to order
        </label>
        <div className="form-actions">
          <button className="button">Save product</button>
          <A to="/admin/products" className="button secondary">
            Cancel
          </A>
          {existing && (
            <button
              type="button"
              className="text-button danger"
              onClick={() => setDeleting(!deleting)}
            >
              Delete product
            </button>
          )}
        </div>
        {deleting && (
          <div className="notice">
            <p>Remove this product from the catalogue? Existing order records will be kept.</p>
            <button
              type="button"
              className="button danger-button"
              onClick={() =>
                attempt(() => {
                  s.removeProduct(p.id);
                  navigate({ to: "/admin/products" });
                }, "Product removed.")
              }
            >
              Confirm deletion
            </button>
          </div>
        )}
      </form>
    </>
  );
}
function StockRow({ product: p }: { product: Product }) {
  const s = useAppStore();
  const [stock, setStock] = useState(String(p.stock));
  const [threshold, setThreshold] = useState(String(p.lowStockThreshold));
  return (
    <tr>
      <td>
        {p.emoji} <strong>{p.name}</strong>
        <small>{p.unit}</small>
      </td>
      <td>
        <input
          aria-label={`Stock for ${p.name}`}
          type="number"
          min="0"
          step={p.soldByWeight ? "0.01" : "1"}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
      </td>
      <td>
        <input
          aria-label={`Low-stock threshold for ${p.name}`}
          type="number"
          min="0"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
        />
      </td>
      <td>
        <span className="status">{stockStatus(p).replaceAll("_", " ")}</span>
      </td>
      <td>
        <button
          className="button secondary"
          onClick={() => {
            if (
              stock === "" ||
              threshold === "" ||
              Number(threshold) < 0 ||
              (!p.soldByWeight && !Number.isInteger(Number(stock)))
            ) {
              toast.error("Enter valid stock and threshold quantities.");
              return;
            }
            attempt(() => s.setStock(p.id, Number(stock), Number(threshold)), "Stock updated.");
          }}
        >
          Update
        </button>
      </td>
    </tr>
  );
}
export function InventoryPage() {
  const s = useAppStore();
  const [q, setQ] = useState("");
  const [low, setLow] = useState(false);
  return (
    <>
      <AdminHeading title="Inventory" text="Healthy shelves. Happy neighbours." />
      <section className="admin-panel">
        <div className="filters">
          <input
            aria-label="Find stock"
            placeholder="Find a product…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <label className="check">
            <input type="checkbox" checked={low} onChange={(e) => setLow(e.target.checked)} />
            Low stock only
          </label>
        </div>
        <div className="table-wrap">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Available quantity</th>
                <th>Alert below</th>
                <th>Status</th>
                <th>Save</th>
              </tr>
            </thead>
            <tbody>
              {s.products
                .filter(
                  (p) =>
                    p.name.toLowerCase().includes(q.toLowerCase()) &&
                    (!low || p.stock <= p.lowStockThreshold),
                )
                .map((p) => (
                  <StockRow key={`${p.id}-${p.stock}-${p.lowStockThreshold}`} product={p} />
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
export function CategoriesAdminPage() {
  const s = useAppStore();
  const [editing, setEditing] = useState<Category | null>(null);
  const categories = [...s.categories].sort((a, b) => a.order - b.order);
  const move = (index: number, delta: number) => {
    const a = categories[index],
      b = categories[index + delta];
    if (a && b)
      attempt(() => {
        s.upsertCategory({ ...a, order: b.order });
        s.upsertCategory({ ...b, order: a.order });
      });
  };
  return (
    <>
      <AdminHeading
        title="Categories"
        text="Make your aisles easy to explore."
        action={
          <button
            className="button"
            onClick={() =>
              setEditing({
                id: crypto.randomUUID(),
                name: "",
                slug: "",
                emoji: "🛒",
                accent: "leaf",
                enabled: true,
                order: Math.max(0, ...categories.map((c) => c.order)) + 1,
              })
            }
          >
            <Plus size={17} />
            Add category
          </button>
        }
      />
      {editing && (
        <form
          className="admin-panel form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const slug = editing.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            if (s.categories.some((c) => c.id !== editing.id && c.slug === slug)) {
              toast.error("A category with this name already exists.");
              return;
            }
            attempt(() => {
              s.upsertCategory({
                ...editing,
                slug: editing.id === "cat_specials" ? "specials" : slug,
              });
              setEditing(null);
            }, "Category saved.");
          }}
        >
          <Field
            label="Name"
            required
            value={editing.name}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
          />
          <ImageUpload
            label="Category image"
            value={editing.imageUrl}
            onChange={(imageUrl) => setEditing({ ...editing, imageUrl })}
          />
          <Field
            label="Category symbol"
            value={editing.emoji}
            onChange={(e) => setEditing({ ...editing, emoji: e.target.value })}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={editing.enabled}
              onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
            />
            Visible in the shop
          </label>
          <div className="form-actions">
            <button className="button">Save category</button>
            <button type="button" className="button secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      <section className="admin-panel">
        {categories.map((c, i) => (
          <div className="category-admin-row" key={c.id}>
            <span>{c.emoji}</span>
            <strong>{c.name}</strong>
            <small>{c.enabled ? "Enabled" : "Hidden"}</small>
            <button
              className="icon-button"
              disabled={!i}
              aria-label={`Move ${c.name} up`}
              onClick={() => move(i, -1)}
            >
              <ArrowUp size={17} />
            </button>
            <button
              className="icon-button"
              disabled={i === categories.length - 1}
              aria-label={`Move ${c.name} down`}
              onClick={() => move(i, 1)}
            >
              <ArrowDown size={17} />
            </button>
            <button className="button secondary" onClick={() => setEditing(c)}>
              Edit
            </button>
          </div>
        ))}
      </section>
    </>
  );
}
export function PromotionsPage() {
  const s = useAppStore();
  const [p, setP] = useState<Promotion | null>(null);
  return (
    <>
      <AdminHeading
        title="Promotions"
        text="Give your neighbours a little more for their basket."
        action={
          <button
            className="button"
            onClick={() =>
              setP({
                id: crypto.randomUUID(),
                name: "",
                type: "percentage",
                value: 10,
                startDate: new Date().toISOString().slice(0, 10),
                endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
                active: true,
              })
            }
          >
            <Plus size={17} />
            Create promotion
          </button>
        }
      />
      <p className="notice">
        The best qualifying order discount applies. Product special prices are applied before order
        discounts.
      </p>
      {p && (
        <form
          className="admin-panel"
          onSubmit={(e) => {
            e.preventDefault();
            if (new Date(p.endDate) < new Date(p.startDate)) {
              toast.error("End date must be after the start date.");
              return;
            }
            if ((p.type === "percentage" || p.type === "coupon") && p.value > 100) {
              toast.error("Percentage cannot exceed 100.");
              return;
            }
            if (p.type === "product_price" && !p.productId) {
              toast.error("Choose a product for this offer.");
              return;
            }
            if (p.type === "coupon" && !p.code?.trim()) {
              toast.error("Enter a coupon code.");
              return;
            }
            attempt(() => {
              s.upsertPromotion({
                ...p,
                startDate: new Date(p.startDate.slice(0, 10) + "T00:00:00").toISOString(),
                endDate: new Date(p.endDate.slice(0, 10) + "T23:59:59").toISOString(),
              });
              setP(null);
            }, "Promotion saved.");
          }}
        >
          <div className="form-grid">
            <Field
              label="Promotion name"
              required
              value={p.name}
              onChange={(e) => setP({ ...p, name: e.target.value })}
            />
            <label className="field">
              <span>Offer type</span>
              <select
                value={p.type}
                onChange={(e) => setP({ ...p, type: e.target.value as Promotion["type"] })}
              >
                <option value="percentage">Percentage discount</option>
                <option value="fixed">Fixed amount off</option>
                <option value="product_price">Product special price</option>
                <option value="coupon">Percentage coupon</option>
              </select>
            </label>
            <Field
              label={p.type === "percentage" || p.type === "coupon" ? "Discount (%)" : "Amount (M)"}
              type="number"
              min="0"
              step="0.01"
              required
              value={p.value}
              onChange={(e) => setP({ ...p, value: Number(e.target.value) })}
            />
            <Field
              label="Minimum basket (M)"
              type="number"
              min="0"
              value={p.minimumSpend ?? 0}
              onChange={(e) => setP({ ...p, minimumSpend: Number(e.target.value) })}
            />
            {p.type === "coupon" && (
              <Field
                label="Coupon code"
                required
                value={p.code ?? ""}
                onChange={(e) => setP({ ...p, code: e.target.value.toUpperCase() })}
              />
            )}
            <label className="field">
              <span>Category</span>
              <select
                value={p.categoryId ?? ""}
                onChange={(e) => setP({ ...p, categoryId: e.target.value })}
              >
                <option value="">All categories</option>
                {s.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {p.type === "product_price" && (
              <label className="field">
                <span>Product</span>
                <select
                  required
                  value={p.productId ?? ""}
                  onChange={(e) => setP({ ...p, productId: e.target.value })}
                >
                  <option value="">Choose product</option>
                  {s.products.map((pr) => (
                    <option value={pr.id} key={pr.id}>
                      {pr.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Field
              label="Starts"
              type="date"
              required
              value={p.startDate.slice(0, 10)}
              onChange={(e) => setP({ ...p, startDate: e.target.value })}
            />
            <Field
              label="Ends"
              type="date"
              required
              value={p.endDate.slice(0, 10)}
              onChange={(e) => setP({ ...p, endDate: e.target.value })}
            />
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={p.active}
              onChange={(e) => setP({ ...p, active: e.target.checked })}
            />
            Active
          </label>
          <div className="form-actions">
            <button className="button">Save promotion</button>
            <button type="button" className="button secondary" onClick={() => setP(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      <section className="admin-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Offer</th>
                <th>Type</th>
                <th>Value</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {s.promotions.map((pr) => (
                <tr key={pr.id}>
                  <td>
                    {pr.name}
                    <small>{pr.code}</small>
                  </td>
                  <td>{pr.type.replaceAll("_", " ")}</td>
                  <td>{pr.value}</td>
                  <td>
                    {pr.startDate.slice(0, 10)} to {pr.endDate.slice(0, 10)}
                  </td>
                  <td>
                    {!pr.active
                      ? "Paused"
                      : new Date(pr.startDate) > new Date()
                        ? "Scheduled"
                        : new Date(pr.endDate) < new Date()
                          ? "Expired"
                          : "Active"}
                  </td>
                  <td>
                    <button className="button secondary" onClick={() => setP(pr)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
export function SettingsPage() {
  const s = useAppStore();
  const [shop, setShop] = useState(s.shop);
  const [areas, setAreas] = useState(s.shop.deliveryAreas.join("\n"));
  return (
    <>
      <AdminHeading title="Shop settings" text="The details that make this shop yours." />
      <form
        className="admin-panel editor-form"
        onSubmit={(e) => {
          e.preventDefault();
          const deliveryAreas = areas
            .split("\n")
            .map((a) => a.trim())
            .filter(Boolean);
          if (!deliveryAreas.length) {
            toast.error("Add at least one delivery area.");
            return;
          }
          if (!shop.paymentOptions.cashOnDelivery && !shop.paymentOptions.mobileMoney) {
            toast.error("Enable at least one payment option.");
            return;
          }
          attempt(
            () => s.updateShop({ ...shop, deliveryAreas, defaultDeliveryArea: deliveryAreas[0]! }),
            "Shop settings saved.",
          );
        }}
      >
        <h2>Shop information</h2>
        <ImageUpload
          label="Shop logo"
          value={shop.logoUrl}
          onChange={(logoUrl) => setShop({ ...shop, logoUrl })}
        />
        <div className="form-grid">
          <Field
            label="Shop name"
            required
            value={shop.name}
            onChange={(e) => setShop({ ...shop, name: e.target.value })}
          />
          <Field
            label="Phone"
            type="tel"
            required
            value={shop.phone}
            onChange={(e) => setShop({ ...shop, phone: e.target.value })}
          />
          <Field
            label="WhatsApp number"
            type="tel"
            required
            value={shop.whatsapp}
            onChange={(e) => setShop({ ...shop, whatsapp: e.target.value })}
          />
          <Field
            label="Store address"
            required
            value={shop.address}
            onChange={(e) => setShop({ ...shop, address: e.target.value })}
          />
          <Field
            label="Opening hours"
            required
            value={shop.openingHours}
            onChange={(e) => setShop({ ...shop, openingHours: e.target.value })}
          />
          <Field label="Currency" value="LSL · Maloti (M)" readOnly />
        </div>
        <h2>Delivery</h2>
        <div className="form-grid">
          <Field
            label="Delivery fee (M)"
            type="number"
            min="0"
            step="0.01"
            required
            value={shop.deliveryFee}
            onChange={(e) => setShop({ ...shop, deliveryFee: Number(e.target.value) })}
          />
          <Field
            label="Minimum basket (M)"
            type="number"
            min="0"
            step="0.01"
            required
            value={shop.minimumOrder}
            onChange={(e) => setShop({ ...shop, minimumOrder: Number(e.target.value) })}
          />
        </div>
        <label className="field">
          <span>Delivery areas (one per line)</span>
          <textarea required rows={6} value={areas} onChange={(e) => setAreas(e.target.value)} />
        </label>
        <h2>Payment options</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={shop.paymentOptions.cashOnDelivery}
            onChange={(e) =>
              setShop({
                ...shop,
                paymentOptions: { ...shop.paymentOptions, cashOnDelivery: e.target.checked },
              })
            }
          />
          Cash on delivery
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={shop.paymentOptions.mobileMoney}
            onChange={(e) =>
              setShop({
                ...shop,
                paymentOptions: { ...shop.paymentOptions, mobileMoney: e.target.checked },
              })
            }
          />
          Mobile money (provider selection only)
        </label>
        <p className="small">
          Card processing, real staff accounts, and SMS notifications require production
          integrations.
        </p>
        <button className="button">Save changes</button>
      </form>
    </>
  );
}
