import { useState, type ReactNode, type InputHTMLAttributes } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Plus, ArrowRight, ShoppingBasket, Check, Leaf } from "lucide-react";
import { toast } from "sonner";
import { useAppStore, stockStatus, ORDER_STATUS_LABEL } from "@/lib/app-store";
import { productPrice } from "@/lib/commerce";
import { formatM, unitLabel } from "@/lib/format";
import type { Product, OrderStatus } from "@/lib/types";
import { QuantityStepper } from "@/components/store/QuantityStepper";
export function A({
  to,
  children,
  className = "",
  ...props
}: {
  to: string;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Link to={to} className={className} {...props}>
      {children}
    </Link>
  );
}
export function attempt(action: () => unknown, message?: string) {
  try {
    action();
    if (message) toast.success(message);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Please try again.");
  }
}
export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}
export function Empty({
  title,
  text,
  to = "/shop",
  action = "Explore the shop",
}: {
  title: string;
  text: string;
  to?: string;
  action?: string;
}) {
  return (
    <div className="empty">
      <ShoppingBasket size={44} />
      <h2>{title}</h2>
      <p>{text}</p>
      <A to={to} className="button">
        {action}
        <ArrowRight size={17} />
      </A>
    </div>
  );
}
export function Status({ status }: { status: OrderStatus }) {
  return <span className={`status status-${status}`}>{ORDER_STATUS_LABEL[status]}</span>;
}
const photos: Record<string, string> = {
  Tomatoes: "1546094096-0df4bcaaa337",
  Potatoes: "1518977676601-b53f82aba655",
  Onions: "1508747703725-719777637510",
  Carrots: "1447175008436-054170c2e979",
  "Green Peppers": "1563565375-f3fdfdbefa83",
  Bananas: "1571771894821-ce9b6c11b08e",
  Apples: "1560806887-1e4cd0b6cbd6",
  Oranges: "1547514701-42782101795e",
  "Brown Bread": "1509440159596-0249088772ff",
  "White Bread": "1509440159596-0249088772ff",
  "Eggs 30 Pack": "1506976785307-8732e854ad03",
  "2L Milk": "1563636619-e9143da7973b",
};
export function ProductImage({ product, large = false }: { product: Product; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src =
    product.imageUrl || (photos[product.name] ? `/products/${photos[product.name]}.jpg` : "");
  return (
    <div className={`product-image ${large ? "large" : ""}`}>
      {src && !failed ? (
        <img src={src} alt={product.name} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span role="img" aria-label={product.name}>
          {product.emoji}
        </span>
      )}
    </div>
  );
}
export function ProductCard({ product }: { product: Product }) {
  const s = useAppStore();
  const item = s.cart.find((i) => i.productId === product.id);
  const price = productPrice(product, s.promotions);
  const stock = stockStatus(product);
  return (
    <article className="product-card">
      <div className="product-visual">
        <A to={`/product/${product.id}`}>
          <ProductImage product={product} />
        </A>
        {price < product.price && (
          <span className="saving">Save {formatM(product.price - price)}</span>
        )}
        <button
          className={`favourite ${s.favourites.includes(product.id) ? "selected" : ""}`}
          aria-label={`${s.favourites.includes(product.id) ? "Unsave" : "Save"} ${product.name}`}
          onClick={() => attempt(() => s.toggleFavourite(product.id))}
        >
          <Heart size={18} fill={s.favourites.includes(product.id) ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="product-copy">
        <p className="eyebrow">{s.categories.find((c) => c.id === product.categoryId)?.name}</p>
        <A to={`/product/${product.id}`} className="product-name">
          {product.name}
        </A>
        <div className="price">
          <strong>{formatM(price)}</strong>
          <span>{unitLabel(product.unit)}</span>
          {price < product.price && <del>{formatM(product.price)}</del>}
        </div>
        <p className={`stock ${stock === "out_of_stock" ? "unavailable" : ""}`}>
          <span />
          {stock === "out_of_stock"
            ? "Out of stock"
            : stock === "low_stock"
              ? `Only ${product.stock} left`
              : "In stock"}
        </p>
        {item ? (
          <QuantityStepper
            value={item.quantity}
            step={product.soldByWeight ? 0.5 : 1}
            onChange={(q) => attempt(() => s.setCartQuantity(product.id, q))}
            suffix={product.soldByWeight ? product.unit : ""}
          />
        ) : (
          <button
            className="add-button"
            disabled={stock === "out_of_stock"}
            onClick={() =>
              attempt(() => s.addToCart(product), `${product.name} added to your basket`)
            }
          >
            <Plus size={18} />
            Add to basket
          </button>
        )}
      </div>
    </article>
  );
}
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
export function SectionTitle({
  title,
  caption,
  to,
  action = "See all",
}: {
  title: string;
  caption?: string;
  to?: string;
  action?: string;
}) {
  return (
    <div className="section-title">
      <div>
        {caption && <p className="eyebrow">{caption}</p>}
        <h2>{title}</h2>
      </div>
      {to && (
        <A to={to}>
          {action}
          <ArrowRight size={17} />
        </A>
      )}
    </div>
  );
}
export function Summary({ submit }: { submit?: ReactNode }) {
  const s = useAppStore();
  return (
    <aside className="summary">
      <h2>Your order</h2>
      <div>
        <span>Subtotal</span>
        <strong>{formatM(s.cartSubtotal)}</strong>
      </div>
      <div>
        <span>Delivery</span>
        <strong>{formatM(s.shop.deliveryFee)}</strong>
      </div>
      <div className="green">
        <span>Discount</span>
        <strong>−{formatM(s.discount)}</strong>
      </div>
      <div className="summary-total">
        <span>Total</span>
        <strong>{formatM(s.total)}</strong>
      </div>
      {submit}
      <p className="small">
        <Leaf size={15} />
        Picked with care by your local shop.
      </p>
    </aside>
  );
}
