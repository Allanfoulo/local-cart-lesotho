# Local Cart Lesotho

Build a polished, mobile-first hyperlocal grocery e-commerce platform for a local shop in Lesotho.

The product should feel like a modern, trustworthy online grocery store: simple enough for non-technical users, fast on mobile devices, and easy for shop staff to manage.

The platform is initially for ONE branded shop, not a marketplace. However, structure the frontend and data model cleanly enough that multi-store support could be added later.

Use a clean, warm, practical visual style. The interface should feel modern like a lightweight combination of Takealot, Checkers Sixty60, and a well-designed WhatsApp Business catalogue, but much simpler and more local.

Core product goal

Customers should be able to:

Browse products

Search products

Filter by category

View current prices

See stock availability

Add products to a cart

Buy products sold by unit or weight

Checkout

Select payment method

Enter delivery details

Place an order

Track order status

Review previous orders

Quickly reorder previous purchases

The platform should be optimized for customers ordering common grocery and household essentials such as:

vegetables

tissue

bread

drinks

household products

snacks

basic groceries

products sold individually

products sold per kilogram

products sold in packs or crates

Recommended frontend stack

Build the frontend using:

Next.js

React

TypeScript

Tailwind CSS

shadcn/ui where appropriate

Design it as a responsive Progressive Web App.

The primary target is mobile, but the desktop experience should still look polished.

Do not create a generic SaaS dashboard aesthetic for the customer-facing storefront.

The customer storefront must feel like an actual retail store.

Main navigation

Mobile bottom navigation:

Home
Categories
Search
Orders
Account

Include a floating or persistent cart button showing the number of items in the cart and current subtotal.

Desktop navigation can use a traditional top navigation bar.

Home page

Create a high-quality grocery storefront homepage.

Include:

Header

Shop logo

Shop name

Delivery area indicator

Search bar

Cart icon

Account icon

Example delivery indicator:

Delivering to
Ha-Mabote, Maseru

Do not hard-code the area permanently. Make it reusable.

Hero section

Use a clean retail hero section.

Example:

"Groceries delivered from your local shop."

Secondary text:

"Everyday essentials, fresh produce and household items delivered straight to you."

Buttons:

Shop Now
Browse Categories

Avoid giant corporate-style hero sections. This is primarily a shopping application.

Category shortcuts

Display horizontally scrollable category cards.

Example categories:

Fresh Produce
Groceries
Drinks
Snacks
Household
Personal Care
Bread & Bakery
Specials

Use friendly icons or product photography.

Featured products

Grid of popular products.

Each product card should contain:

Product image

Product name

Price

Pricing unit

Availability

Add button

Quantity controls after adding

Example:

Tomatoes

M12.00 / kg

In stock

[ + Add ]

Another example:

2-Ply Tissue

M8.00 each

Specials section

Show promotional products with:

old price

promotional price

savings badge

Example:

Was M30
Now M25

Popular this week

Display frequently purchased products.

Reorder section

For returning customers:

"Buy again"

Show products from previous purchases.

Product catalogue

Create a dedicated shopping page.

Use:

Search

Category filters

Price filters

Availability filters

Sorting

Sorting options:

Popular
Price low to high
Price high to low
Newest

Product cards must clearly distinguish how an item is sold.

Supported pricing units:

each

pack

kilogram

gram

litre

crate

Examples:

Potatoes
M18 / kg

Milk
M22 / litre

Tissue
M8 each

Soft Drink
M75 / crate

Product detail page

Include:

Large product image

Product name

Current price

Pricing unit

Description

Stock status

Quantity selector

Weight selector when required

Add to cart

Related products

For weight-based products allow values such as:

0.5 kg
1 kg
1.5 kg
2 kg

Also allow a custom weight when appropriate.

Display an estimated product subtotal.

Example:

Tomatoes
M12/kg

Selected:
1.5kg

Estimated subtotal:
M18.00

Shopping cart

Build a full cart page or cart drawer.

Display:

Product image

Product name

Quantity

Selected weight where applicable

Price

Item subtotal

Remove item

Show:

Subtotal
Delivery fee
Discount
Total

Include:

Continue Shopping
Checkout

Support an empty-cart experience with a button returning the customer to products.

Checkout

Create a clean multi-step checkout.

Steps:

Customer information

Delivery details

Payment

Review

Confirmation

Customer information

Fields:

Full name
Phone number
Optional email

Allow guest checkout.

Do not force account registration before placing an order.

Delivery details

Fields:

Delivery area
Delivery address
Nearest landmark
Delivery instructions

Example:

Nearest landmark:
"Opposite Mabote Primary School"

Delivery instructions:
"Blue gate, second house after the shop."

Include a placeholder UI area for a future map-based location selector.

Do NOT implement the advanced 3D mapping system yet.

However, design the component architecture so a future map component can replace or augment the location selector.

For now include:

Use Current Location

and a simple map/location placeholder.

Payment

Support these initial payment types:

Mobile Money

Cash on Delivery

Card can appear as:

"Coming soon"

For Mobile Money, design a provider-selection area that can support multiple Lesotho payment providers later.

Do not hard-code payment business logic.

Cash on delivery

This is an important feature.

If the customer selects Cash on Delivery, ask:

"How much will you be paying with?"

Example:

Order total:
M87

Customer cash:
M100

Change required:
M13

Calculate and display the expected change clearly.

If the customer selects:

"Exact amount"

then no additional field is required.

Order review

Before final submission show:

Items
Quantities
Prices
Delivery address
Payment method
Delivery fee
Total

Primary CTA:

Place Order

Order confirmation

After successfully placing the order show:

Order confirmed

Order Number:
#ORD-1042

Estimated delivery information

Payment method

Delivery location

Button:

Track Order

Secondary button:

Continue Shopping

Order tracking

Create an order-status screen.

Statuses:

Order Received
Confirmed
Preparing
Ready for Delivery
Out for Delivery
Delivered

Display a visual progress timeline.

Show:

Order number
Items
Order total
Delivery information
Payment status
Current status
Estimated delivery time

Include:

Call Shop
Contact Support

When status is Out for Delivery, reserve space for future driver tracking.

Order history

Customer account should include:

Current Orders
Previous Orders

Each order card includes:

Order number
Date
Total
Status
Number of products

Buttons:

View Order
Reorder

Reorder should reconstruct the previous cart while warning the customer if a product is unavailable or its price has changed.

Account section

Include:

Profile
Saved delivery addresses
Order history
Favourite products
Notification preferences
Logout

Keep account creation optional until the customer wants features such as saved addresses or order history.

Admin dashboard

Create a separate protected admin interface.

Desktop-first, but still responsive.

Sidebar:

Dashboard
Orders
Products
Categories
Inventory
Customers
Deliveries
Promotions
Reports
Settings

Admin dashboard home

Show summary cards:

Today's Orders
Today's Revenue
Pending Orders
Orders Out for Delivery
Low Stock Items

Include:

Recent Orders

Best Selling Products

Sales Overview

Low Stock Alerts

Order management

Create an order table.

Columns:

Order Number
Customer
Time
Total
Payment
Status
Delivery Area

Allow filtering by:

New
Confirmed
Preparing
Ready
Out for Delivery
Delivered
Cancelled

Clicking an order opens detailed order information.

Order details should contain:

Customer information
Phone
Items
Quantities
Delivery address
Nearest landmark
Instructions
Payment method
Payment status
Cash amount
Change required

Staff controls:

Confirm Order
Start Preparing
Ready for Delivery
Assign Driver
Out for Delivery
Mark Delivered
Cancel Order

Maintain an order activity timeline.

Product management

Admin should be able to:

Create product
Edit product
Delete or archive product
Upload image
Set product name
Add description
Set category
Set price
Set pricing unit
Set stock quantity
Mark product available
Mark product unavailable
Create promotional price

Product units:

each
pack
kg
gram
litre
crate

Inventory

Build a simple inventory management view.

Fields:

Product
Available quantity
Low-stock threshold
Status

Statuses:

In Stock
Low Stock
Out of Stock

Allow quick stock updates.

Categories

Admin can:

Create category
Edit category
Upload category image
Reorder categories
Enable or disable category

Promotions

Allow:

Percentage discount
Fixed discount
Promotional product price
Coupon codes

Include:

Start date
End date
Active status

Customer management

Display:

Customer name
Phone
Number of orders
Lifetime spend
Last order

Allow admin to view customer order history.

Delivery management

Create a simple delivery management screen.

Show:

Orders waiting for dispatch
Assigned driver
Delivery address
Status
Customer contact details

Include placeholder architecture for future map and live-driver features.

Reports

Create a simple analytics section.

Include:

Daily revenue
Weekly revenue
Monthly revenue
Number of orders
Average order value
Most popular products
Best performing categories
Cash vs mobile-money orders

Use clean charts.

Settings

Include:

Shop name
Logo
Phone number
WhatsApp number
Store address
Opening hours
Delivery areas
Delivery fee
Minimum order amount
Currency
Payment options

Currency should initially support:

LSL / Maloti

Display monetary values using:

M

Example:

M125.50

Data and component architecture

Build reusable frontend models/components for:

Shop
User
Customer
Category
Product
ProductVariant
Cart
CartItem
Order
OrderItem
Payment
DeliveryAddress
Delivery
Promotion
Notification

Products must support both quantity-based and weight-based ordering.

The UI must be prepared for a Convex backend later.

Do not tightly couple mock frontend data to the UI.

Create clear mock data files or service abstractions so they can easily be replaced by Convex queries and mutations.

Future stack compatibility

The final production architecture will likely use:

Convex
for application data, real-time order state, customers, products and inventory.

Mastra
for future intelligent features such as catalogue enrichment, sales analysis, customer support and inventory insights.

Windmill
for business workflows such as notifications, reports, payment reconciliation and low-stock alerts.

Docker and Dokploy
for supporting infrastructure and deployments.

Do not attempt to recreate these backend systems inside the frontend.

Instead, prepare clean integration boundaries.

Important UX requirements

The application must be:

Mobile-first
Fast
Easy to understand
Friendly to non-technical users
Usable on lower-end smartphones
Readable in bright daylight
Simple enough for elderly customers
Simple enough for someone ordering groceries for the first time

Use large touch targets.

Keep forms short.

Avoid excessive animations.

Avoid tiny text.

Avoid complicated nested menus.

Avoid a generic admin-dashboard look on the customer storefront.

Visual direction

Use a fresh modern grocery aesthetic.

Prefer:

Warm neutral backgrounds
White cards
Dark readable typography
One strong brand accent colour
Soft borders
Subtle shadows
Rounded corners
High-quality product photography
Clear spacing
Large prices
Strong checkout CTAs

The storefront should feel trustworthy, approachable and local.

Use tasteful micro-interactions for:

Adding to cart
Changing quantity
Opening cart
Order confirmation
Status updates

Do not make the interface overly futuristic.

Do not use glassmorphism excessively.

Do not use a dark theme by default.

Responsive behaviour

Mobile:
2-column product grid where practical.

Small mobile:
1 or 2 columns depending on product-card readability.

Tablet:
3 columns.

Desktop:
4-5 columns.

The admin dashboard should use a desktop sidebar and collapse into mobile navigation on smaller screens.

Initial pages to generate

Create all of these pages and connect them through working navigation:

/
Home

/shop
Product catalogue

/category/[slug]
Category products

/product/[id]
Product details

/cart
Shopping cart

/checkout
Checkout

/order-confirmation/[id]
Confirmation

/orders
Customer orders

/orders/[id]
Order tracking

/account
Customer account

/admin
Admin dashboard

/admin/orders
Orders

/admin/orders/[id]
Order details

/admin/products
Products

/admin/products/new
Create product

/admin/inventory
Inventory

/admin/customers
Customers

/admin/deliveries
Deliveries

/admin/promotions
Promotions

/admin/reports
Reports

/admin/settings
Store settings

Seed data

Populate the prototype with realistic Lesotho grocery-store demo content and Maloti pricing.

Example products:

Tomatoes
M12/kg

Potatoes
M18/kg

Green Peppers
M5 each

Brown Bread
M15

2-Ply Tissue
M8 each

2L Milk
M32

Cooking Oil 2L
M55

Maize Meal 10kg
M95

Eggs 30 Pack
M85

Soft Drink 2L
M22

Use realistic placeholder product images.

Create enough products and categories for the storefront to feel like a real working shop rather than an empty prototype.

Final requirement

Build this as a coherent working e-commerce prototype, not disconnected UI mockups.

Users must be able to follow a complete flow:

Browse products
→ add items
→ modify cart
→ checkout
→ select delivery
→ select payment
→ place order
→ see confirmation
→ track order

The admin interface should reflect those orders and support the complete fulfilment flow.

Prioritize the shopping experience first, then the admin interface.

Do not implement the advanced 3D mapping system yet, but keep the delivery-location architecture modular so that a CesiumJS-based mapping interface can be integrated later.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/de45cc37-ba5c-453f-83ef-c34671924158).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
