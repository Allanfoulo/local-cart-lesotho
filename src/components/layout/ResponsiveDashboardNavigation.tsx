import { useState, type ComponentType } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type DashboardNavigationItem<T extends string> = {
  id: T;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type ResponsiveDashboardNavigationProps<T extends string> = {
  title: string;
  items: readonly DashboardNavigationItem<T>[];
  activeItem: T;
  onSelect: (item: T) => void;
  children: React.ReactNode;
  className?: string;
  sidebarClassName?: string;
  contentClassName?: string;
};

export function ResponsiveDashboardNavigation<T extends string>({
  title,
  items,
  activeItem,
  onSelect,
  children,
  className,
  sidebarClassName,
  contentClassName,
}: ResponsiveDashboardNavigationProps<T>) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderItems = (mobile = false) => (
    <nav aria-label={`${title} sections`}>
      <ul className="flex flex-col gap-1.5">
        {items.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              type="button"
              aria-current={activeItem === id ? "page" : undefined}
              aria-label={label}
              title={collapsed && !mobile ? label : undefined}
              onClick={() => {
                onSelect(id);
                if (mobile) setMobileOpen(false);
              }}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeItem === id
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted",
                collapsed && !mobile && "justify-center px-2",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className={cn("truncate", collapsed && !mobile && "sr-only")}>{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <div className={cn("mx-auto flex w-full max-w-7xl items-start gap-4 md:gap-6", className)}>
      <aside
        className={cn(
          "sticky top-0 hidden h-full max-h-dvh shrink-0 flex-col overflow-y-auto border-r border-border py-2 pr-3 transition-[width] duration-200 md:flex",
          collapsed ? "w-[4.5rem]" : "w-60",
          sidebarClassName,
        )}
      >
        <div
          className={cn(
            "mb-4 flex min-h-11 items-center",
            collapsed ? "justify-center" : "justify-between gap-2 pl-3",
          )}
        >
          {!collapsed && (
            <span className="truncate text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {title}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            aria-label={collapsed ? "Expand dashboard sidebar" : "Collapse dashboard sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5" />
            ) : (
              <PanelLeftClose className="size-5" />
            )}
          </Button>
        </div>
        {renderItems()}
      </aside>

      <div
        className={cn(
          "min-w-0 flex-1 md:h-full md:overflow-y-auto md:overscroll-contain",
          contentClassName,
        )}
      >
        <div className="mb-4 md:hidden">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            aria-label={`Open ${title.toLowerCase()} navigation`}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" aria-hidden="true" />
            <span>Menu</span>
          </Button>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[min(19rem,calc(100vw-2.5rem))] p-4">
            <SheetHeader className="mb-6 pr-8 text-left">
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>Choose a section to open.</SheetDescription>
            </SheetHeader>
            {renderItems(true)}
          </SheetContent>
        </Sheet>
        {children}
      </div>
    </div>
  );
}
