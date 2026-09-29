# Mabote Fresh Catalogue Photography Design

## Goal

Give the demo catalogue one coherent, practical photography direction that can guide future product content. The product itself should lead each image and feel familiar to a neighbourhood grocery customer in Lesotho.

## Approved visual direction

- **Product listings:** category-aware studio photography. Use square, centred catalogue images on a warm off-white background (`#F6F2EA`), with diffused light and a subtle contact shadow. Keep the full product visible and leave breathing room around it.
- **Fresh produce and bakery:** use natural groupings where that helps identify the item. Keep real-looking variation in shape and surface; avoid polished, identical arrangements.
- **Packaged goods:** show one complete item, front-facing or at a slight three-quarter angle. Use realistic generic packaging for demo items whose brand and exact packaging are unspecified. Do not invent retailer or supplier logos, readable brand names, prices, badges, or promotional copy.
- **Category and promotional artwork:** use warm tabletop photography with a small, useful arrangement of relevant groceries, natural daylight, and a local, familiar feel. Keep text out of the image so the artwork can be reused with interface copy.
- Retain the store palette in the surrounding interface. Do not add green or orange overlays to product photography; produce and product packaging provide the colour.

## Catalogue coverage and assets

Create one distinct image for each of the 48 seeded products and one image for each of the eight seeded categories, including Specials. Product images are square. Category and promotional compositions use a wider landscape crop. All artwork is photorealistic, clean, easy to identify, and free of watermarks or floating decorative objects.

Product assets use stable slug-based paths under `public/products/`; category assets use the category slug under `public/categories/`. Seeded product and category records point to these local assets. Product admin image overrides remain supported. Prices, promotions, product names, and availability remain live interface text and are never embedded in images.

## Store integration

1. Assign each seed product its local image URL using its existing slug.
2. Assign each seed category its local artwork URL.
3. Keep the existing image components and admin override behaviour. A missing or unreadable image continues to fall back to the product emoji or category treatment already in the app.
4. Use the new wide grocery artwork for the home promotional surface where the existing hero image is used. Category artwork remains reusable in the category shortcuts and category browsing views.

## Image direction by product type

| Product type | Composition |
| --- | --- |
| Loose fruit and vegetables | Three to six pieces or a natural bunch, centred on cream, with small realistic imperfections |
| Bread and baked goods | A small natural grouping of the listed item or pack, with the full product visible |
| Dry groceries and household products | One realistic, generic package or container; clear product silhouette and category cues |
| Drinks, dairy, and oils | One accurate-size bottle, carton, or container; label area visible but without invented brand text |
| Multipacks and crates | Show the quantity implied by the product name while keeping the full pack inside the frame |
| Category and promotional scenes | A modest tabletop grouping from the relevant category, soft daylight, enough clear space for page layout around it |

## Out of scope

- Redesigning product cards, category navigation, checkout, or pricing.
- Creating final supplier-accurate branded packaging when no reference images or brand names are supplied.
- Adding text, price badges, discounts, or logos inside the images.
- Changing the product catalogue, product copy, or promotion rules.

## Acceptance criteria

- Every seeded product has its own square local image asset and uses it in the storefront, product detail, cart, and existing product management surfaces.
- All eight seeded categories have reusable landscape artwork, including Specials.
- The home promotional image follows the tabletop direction and contains no baked-in copy.
- Product names, local Maloti prices, and specials remain readable interface content outside the images.
- Existing image fallback and admin image override behaviour still work.
- Assets use consistent lighting and background treatment across categories, with realistic produce and unobstructed package silhouettes.

## Risks and limits

The demo data does not identify exact supplier brands or package designs. Generic packaging is therefore illustrative, not a claim that a specific branded item is stocked. Future store photography can replace each local image at the same path without changing product data or layout.
