export type WorkspaceRole =
  | "superadmin"
  | "store_owner"
  | "store_manager"
  | "order_staff"
  | "dispatcher"
  | "catalogue_staff"
  | "driver";

export type WorkspaceDestination =
  | "/admin"
  | "/staff/dispatch"
  | "/staff/catalogue"
  | "/driver"
  | "/account";

const destinationRoles: Record<Exclude<WorkspaceDestination, "/account">, WorkspaceRole[]> = {
  "/admin": ["store_owner", "store_manager"],
  "/staff/dispatch": ["order_staff", "dispatcher", "store_owner", "store_manager"],
  "/staff/catalogue": ["catalogue_staff", "store_owner", "store_manager"],
  "/driver": ["driver"],
};

const rolePriority: [WorkspaceRole[], WorkspaceDestination][] = [
  [["superadmin", "store_owner", "store_manager"], "/admin"],
  [["order_staff", "dispatcher"], "/staff/dispatch"],
  [["catalogue_staff"], "/staff/catalogue"],
  [["driver"], "/driver"],
];

function isWorkspaceDestination(value: string): value is Exclude<WorkspaceDestination, "/account"> {
  return Object.hasOwn(destinationRoles, value);
}

export function resolveWorkspaceDestination({
  roles,
  isSuperadmin = false,
  requestedPath,
}: {
  roles: WorkspaceRole[];
  isSuperadmin?: boolean;
  requestedPath?: string;
}): WorkspaceDestination {
  if (requestedPath && isWorkspaceDestination(requestedPath)) {
    const requestedRoles = destinationRoles[requestedPath];
    if (isSuperadmin || roles.some((role) => requestedRoles.includes(role))) {
      return requestedPath;
    }
  }

  const defaultDestination = rolePriority.find(([allowedRoles]) =>
    allowedRoles.some((role) => roles.includes(role)),
  )?.[1];

  return isSuperadmin ? "/admin" : (defaultDestination ?? "/account");
}
