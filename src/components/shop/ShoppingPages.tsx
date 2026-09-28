import { useEffect, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import {
  ArrowRight,
  Truck,
  ShieldCheck,
  HeartHandshake,
  Leaf,
  SlidersHorizontal,
  ArrowLeft,
  Heart,
} from "lucide-react";
import hero from "@/assets/hero-groceries.jpg";
import { useAppStore, stockStatus } from "@/lib/app-store";
import { productPrice } from "@/lib/commerce";
import { formatM, unitLabel } from "@/lib/format";
import { QuantityStepper } from "@/components/store/QuantityStepper";
import { A, Empty, ProductGrid, ProductImage, SectionTitle, attempt } from "./shared";
export function Categories({ full = false }: { full?: boolean }) {
  const s = useAppStore();
  return (
    <div className={full ? "category-full" : "categories-strip"}>
      {s.categories
        .filter((c) => c.enabled)
        .sort((a, b) => a.order - b.order)
        .map((c) => (
          <A to={`/category/${c.slug}`} key={c.id} className="category-shortcut">
            <span className={`tile-${c.accent}`}>
              {c.imageUrl ? (
                <img src={c.imageUrl} alt="" className="size-full rounded-full object-cover" />
              ) : (
                c.emoji
              )}
            </span>
            <strong>{c.name}</strong>
            {full && (
              <small>
                {c.slug === "specials"
                  ? "Fresh savings"
                  : `${s.products.filter((p) => p.categoryId === c.id).length} essentials`}
                <ArrowRight size={16} />
              </small>
            )}
          </A>
        ))}
    </div>
  );
}
export function HomePage() {
  const s = useAppStore();
  const enabled = s.products.filter((p) =>
    s.categories.some((c) => c.id === p.categoryId && c.enabled),
  );
  const popular = [...enabled].sort((a, b) => b.popularity - a.popularity);
  const previousIds = s.orders
    .filter((o) => s.ownOrderIds.includes(o.id))
    .flatMap((o) => o.items.map((i) => i.productId));
  return (
    <>
      <section className="hero">
        <img src={hero} alt="A fresh selection of groceries from your local shop" />
        <div className="hero-copy">
          <span className="hero-label">
            <Leaf size={15} />
            FRESH FROM YOUR NEIGHBOURHOOD
          </span>
          <h1>
            Your local shop.
            <br />
            <em>Now at your door.</em>
          </h1>
          <p>
            Fresh produce, everyday essentials and a little neighbourly care. Delivered around
            Maseru.
          </p>
          <div className="hero-buttons">
            <A to="/shop" className="button">
              Shop groceries
              <ArrowRight size={18} />
            </A>
            <A to="/categories" className="button secondary">
              Browse categories
            </A>
          </div>
          <small>
            <Truck size={17} />
            Local delivery · from {formatM(s.shop.deliveryFee)}
          </small>
        </div>
      </section>
      <div className="trust-strip">
        <span>
          <Leaf />
          Freshness, handpicked
        </span>
        <span>
          <Truck />
          Delivered in your neighbourhood
        </span>
        <span>
          <HeartHandshake />
          Your local shop, online
        </span>
      </div>
      <section className="section">
        <SectionTitle
          title="What’s on your list?"
          caption="A LITTLE OF EVERYTHING"
          to="/categories"
          action="All categories"
        />
        <Categories />
      </section>
      <section className="section">
        <SectionTitle
          title="Everyday favourites"
          caption="THE GOOD STUFF"
          to="/shop"
          action="Shop all"
        />
        <ProductGrid products={popular.slice(0, 5)} />
      </section>
      <section className="specials-section">
        <SectionTitle
          title="A fresher way to save"
          caption="THIS WEEK’S SPECIALS"
          to="/category/specials"
          action="All offers"
        />
        <ProductGrid
          products={enabled.filter((p) => productPrice(p, s.promotions) < p.price).slice(0, 5)}
        />
      </section>
      <section className="local-banner">
        <div>
          <span className="eyebrow">ROOTED IN OUR COMMUNITY</span>
          <h2>Good food brings us closer.</h2>
          <p>
            From the first loaf of the day to the vegetables for tonight’s supper. Same trusted
            shop. A new way to shop.
          </p>
        </div>
        <div className="local-mark">
          <HeartHandshake size={58} />
          <span>
            Local people.
            <br />
            <strong>Better days.</strong>
          </span>
        </div>
      </section>
      {previousIds.length > 0 && (
        <section className="section">
          <SectionTitle title="Back for your favourites?" caption="BUY AGAIN" to="/orders" />
          <ProductGrid products={enabled.filter((p) => previousIds.includes(p.id)).slice(0, 5)} />
        </section>
      )}
      <section className="section">
        <SectionTitle title="Popular in the neighbourhood" to="/shop" />
        <ProductGrid products={popular.slice(5, 10)} />
      </section>
    </>
  );
}
export function CategoriesPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">YOUR NEIGHBOURHOOD SHOP</p>
        <h1>Shop by category</h1>
        <p>From fresh ingredients to the everyday essentials.</p>
      </div>
      <Categories full />
    </>
  );
}
export function CataloguePage({ slug }: { slug?: string }) {
  const s = useAppStore();
  const params = useSearch({ strict: false }) as { q?: string };
  const [q, setQ] = useState(params.q ?? "");
  const [sort, setSort] = useState("popular");
  const [stock, setStock] = useState(false);
  const [max, setMax] = useState("");
  const [category, setCategory] = useState("");
  const selected = slug
    ? s.categories.find((c) => c.slug === slug && c.enabled)
    : s.categories.find((c) => c.id === category);
  const specials = slug === "specials";
  useEffect(() => {
    setQ(params.q ?? "");
  }, [params.q]);
  if (slug && !selected)
    return <Empty title="Category not found" text="Explore our other grocery categories." />;
  const products = s.products
    .filter(
      (p) =>
        s.categories.some((c) => c.id === p.categoryId && c.enabled) &&
        (!selected ||
          (specials ? productPrice(p, s.promotions) < p.price : p.categoryId === selected.id)) &&
        p.name.toLowerCase().includes(q.toLowerCase()) &&
        (!stock || stockStatus(p) !== "out_of_stock") &&
        (!max || productPrice(p, s.promotions) <= Number(max)),
    )
    .sort((a, b) =>
      sort === "low"
        ? productPrice(a, s.promotions) - productPrice(b, s.promotions)
        : sort === "high"
          ? productPrice(b, s.promotions) - productPrice(a, s.promotions)
          : sort === "newest"
            ? b.createdAt.localeCompare(a.createdAt)
            : b.popularity - a.popularity,
    );
  return (
    <>
      <div className="page-heading">
        <A to="/" className="back">
          <ArrowLeft size={16} />
          Home
        </A>
        <h1>{selected?.name ?? "Your everyday, delivered."}</h1>
        <p>
          {specials
            ? "Small savings that make a difference to your basket."
            : "Fresh picks and familiar favourites, all in one place."}
        </p>
      </div>
      <div className="catalogue-layout">
        <aside className="catalogue-sidebar">
          <h3>Browse the aisles</h3>
          <A to="/shop" className={!selected ? "selected" : ""}>
            All groceries
          </A>
          {s.categories
            .filter((c) => c.enabled)
            .map((c) => (
              <A
                to={`/category/${c.slug}`}
                key={c.id}
                className={selected?.id === c.id ? "selected" : ""}
              >
                <span>{c.emoji}</span>
                {c.name}
              </A>
            ))}
          <div className="sidebar-note">
            <Truck size={27} />
            <strong>Your groceries, with care.</strong>
            <p>
              Local delivery from {formatM(s.shop.deliveryFee)}. Minimum basket{" "}
              {formatM(s.shop.minimumOrder)}.
            </p>
          </div>
        </aside>
        <div className="catalogue-results">
          <div className="filters">
            <input
              aria-label="Search products"
              placeholder="Search the shop…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              aria-label="Sort products"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="popular">Most popular</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
              <option value="newest">Newest first</option>
            </select>
            <input
              aria-label="Maximum price"
              type="number"
              min="0"
              placeholder="Max price (M)"
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
            <label className="check">
              <input type="checkbox" checked={stock} onChange={(e) => setStock(e.target.checked)} />
              In stock only
            </label>
          </div>
          <p className="result-count">
            {products.length} products {q && `for “${q}”`}
          </p>
          {products.length ? (
            <ProductGrid products={products} />
          ) : (
            <div className="empty">
              <SlidersHorizontal size={36} />
              <h2>No products found</h2>
              <p>Try another search or clear your filters.</p>
              <button
                className="button"
                onClick={() => {
                  setQ("");
                  setMax("");
                  setStock(false);
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
export function ProductPage({ id }: { id: string }) {
  const s = useAppStore();
  const p = s.products.find((p) => p.id === id);
  const [qty, setQty] = useState(1);
  if (!p)
    return (
      <Empty
        title="Product not found"
        text="This product may have left our shelves. Explore the shop for something else."
      />
    );
  const price = productPrice(p, s.promotions);
  const available = p.available && p.stock > 0;
  return (
    <>
      <A to="/shop" className="back">
        <ArrowLeft size={17} />
        Back to the shop
      </A>
      <section className="product-detail">
        <ProductImage product={p} large />
        <div>
          <p className="eyebrow">{s.categories.find((c) => c.id === p.categoryId)?.name}</p>
          <h1>{p.name}</h1>
          <div className="detail-price">
            {formatM(price)}
            <small>{unitLabel(p.unit)}</small>
            {price < p.price && <del>{formatM(p.price)}</del>}
          </div>
          <p className="stock">
            <span />
            {available ? `${p.stock} ${p.unit} available` : "Currently out of stock"}
          </p>
          <p className="description">{p.description}</p>
          {p.soldByWeight ? (
            <>
              <h3>Choose your weight</h3>
              <div className="weight-options">
                {(
                  p.weightOptions ?? (p.unit === "gram" ? [100, 250, 500, 1000] : [0.5, 1, 1.5, 2])
                ).map((w) => (
                  <button className={qty === w ? "selected" : ""} key={w} onClick={() => setQty(w)}>
                    {w} {p.unit === "gram" ? "g" : p.unit}
                    <small>{formatM(w * price)}</small>
                  </button>
                ))}
              </div>
              <label className="field">
                <span>Custom weight ({p.unit === "gram" ? "g" : p.unit})</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={p.stock}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                />
              </label>
            </>
          ) : (
            <QuantityStepper value={qty} min={1} onChange={setQty} />
          )}
          <div className="detail-subtotal">
            <span>Estimated subtotal</span>
            <strong>{formatM(Number.isFinite(qty) ? qty * price : 0)}</strong>
          </div>
          <button
            className="button wide"
            disabled={!available || qty <= 0 || qty > p.stock}
            onClick={() => attempt(() => s.addToCart(p, qty), `${p.name} added to your basket`)}
          >
            Add to basket
            <ArrowRight size={18} />
          </button>
          <button className="text-button" onClick={() => attempt(() => s.toggleFavourite(p.id))}>
            <Heart size={17} />
            {s.favourites.includes(p.id) ? "Saved to favourites" : "Save for later"}
          </button>
          <p className="small">
            <ShieldCheck size={18} />
            Handpicked and checked before delivery.
          </p>
        </div>
      </section>
      <section className="section">
        <SectionTitle title="Goes well in your basket" to="/shop" />
        <ProductGrid
          products={s.products
            .filter((pr) => pr.categoryId === p.categoryId && pr.id !== p.id)
            .slice(0, 5)}
        />
      </section>
    </>
  );
}
