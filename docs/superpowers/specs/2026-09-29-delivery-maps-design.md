# Mabote Fresh Delivery Maps Design

## Goal

Help customers confirm that Mabote Fresh serves their area and understand their order's delivery status and destination. Give staff a map for seeing delivery stops and planning a route. Keep the first map experience readable and dependable on phones by using 2D maps.

## Approved direction

- Use a 2D map for the initial delivery experience.
- Put customer order tracking on the existing post-checkout order page (`/orders/$id`). Show the delivery destination and order status. Do not present a moving driver marker or describe the map as live tracking.
- Provide service-area coverage information to both customers and staff.
- Give staff both manual stop ordering and calculated road routes.
- Treat Mabote Fresh-created 3D place scans as a later capability, after the 2D flows are useful.

## User experiences

### Customer coverage

Show the supported delivery areas and their applicable fees during checkout's delivery-address step. A customer can compare their area with the supported zones before submitting an order. Keep the existing area names and text list available alongside the map so the information is usable without a map, on a small screen, or when map data cannot load.

### Customer order tracking

Extend the existing `/orders/$id` page. Preserve its order status timeline, delivery address, and contact actions. Add a 2D map that marks the confirmed delivery destination and a concise status label. The map communicates where the order is going; it does not imply a live driver position or exact arrival time. Keep delivery progress in the existing order status and timeline.

Use coordinates the customer explicitly shared or confirmed. Do not derive an exact house pin from an unverified street address, area name, or landmark. When an order has no confirmed coordinates, show the address and landmark with a clear indication that no exact pin is available; keep the status timeline fully usable.

### Staff coverage and route planning

Add a map view to the staff delivery workflow. Show service-area boundaries and the locations of ready and out-for-delivery orders. Keep a synchronized stop list so staff can inspect an order from either the map or list. Group assigned stops by driver and calculate a route for one selected driver's list at a time. Staff can assign and manually reorder stops, then request a road route for that exact order. The route starts at the shop and follows the selected stops; it does not reorder them or assume a return trip. Display route distance and duration as estimates when the routing provider supplies them.

Orders without confirmed coordinates remain visible in the list but are excluded from calculated routes. Staff can use the address and existing external-navigation fallback for those orders. If route calculation fails, retain the manual stop order and explain that a road route could not be calculated.

## Map data and architecture

Keep map rendering behind a small map component boundary so the interface does not depend directly on one map provider. The component receives typed locations, service-area shapes, route geometry, labels, and interaction callbacks. Provider selection can happen during implementation after checking Maseru coverage, attribution requirements, quotas, and whether one provider can meet the basemap, geocoding, and routing needs.

The current app data has optional customer latitude and longitude, a text-only shop address, and delivery-area names without boundaries. The map feature therefore needs:

1. A confirmed map location for the shop.
2. Optional, customer-confirmed coordinates on delivery addresses, preserving address, area, landmark, and instructions as the human-readable source of truth.
3. Geographic boundaries for each supported delivery area, with the existing area name and fee associated with each boundary.
4. Route results for the selected driver's stop order, kept separate from order status and address data.

Customer coverage is read-only. Existing staff settings continue to manage area names and fees. For the prototype, zone boundaries are curated map data associated with those areas; a boundary drawing editor is not part of this design. Existing browser-persisted demo storage remains a prototype boundary; it does not provide secure, multi-device synchronization or real-time updates.

## Data flow and behavior

1. During address entry, customers may share or confirm a destination pin. They can still enter an address and continue without a pin.
2. Checkout continues validating the selected delivery-area name against the configured area list. The coverage map supplements that validation and is not required for the text-based check to work.
3. The order tracking page reads the saved order address and status. It renders an exact destination marker only when confirmed coordinates exist.
4. The staff delivery map reads service-area shapes and eligible delivery orders, supports per-driver manual stop ordering, and submits one driver's ordered coordinates for road-route calculation.
5. A failed map or route request leaves the address, status timeline, stop list, and external-navigation path available.

## Delivery sequence

1. Establish the shop location, service-area boundaries, and customer-confirmed destination pin behavior. Add customer coverage and the post-checkout destination map with clear no-pin behavior.
2. Add the staff delivery map with order selection and manual stop ordering.
3. Add calculated road routes, with an ordered-stop fallback when routing is unavailable.
4. Explore 3D place scans as a separate future project. Keep each scan attached to a verified place and retain the 2D destination map as the default and fallback.

## Out of scope

- Live driver GPS, background location sharing, moving vehicle markers, and real-time ETA promises.
- Automatic route optimization or dispatch decisions. Staff choose the stop order; road routing calculates a path for that order.
- Replacing the address, area, landmark, or delivery instructions with map data.
- Requiring customers to share precise location to place an order.
- 3D globe views, third-party 3D building coverage, or house-scan capture in the first delivery-map release.
- Production map-provider credentials, backend synchronization, or a production dispatch system as part of the browser-persisted prototype.

## Acceptance criteria

- Customers can inspect supported delivery coverage and fees during checkout without relying on the map alone.
- Customers can view the existing order timeline and delivery destination after checkout.
- An exact destination marker appears only for a confirmed location; orders without one still show complete address details and status.
- The tracking map does not display or imply a live driver location.
- Staff can see mapped eligible delivery stops and service coverage, inspect the corresponding order, assign drivers, and manually order stops.
- Staff can request a road route for stops with confirmed coordinates. A route failure or missing location does not hide an order or block the address-based fallback.
- Map information remains usable on phone-sized screens and has a text/list equivalent for map content.
- The 2D flow remains usable if map tiles or routing services are unavailable.

## Risks and limits

- Delivery-area names do not currently define precise boundaries. Boundaries must be agreed and maintained before the coverage map can determine service by geography.
- Many delivery addresses may rely on landmarks rather than formal street addresses. Unconfirmed locations must not be shown as precise pins or included in road routes.
- Basemap, geocoding, and road-routing coverage and terms can differ in Lesotho. Select a provider only after checking the actual Maseru use case and its attribution, quota, and cost requirements.
- Road routes and travel durations are estimates. They depend on the quality and freshness of the underlying road network and do not show the driver's actual progress.
- Future 3D scans require a separate capture, review, storage, and address-association workflow. They should supplement a verified 2D location rather than replace it.
