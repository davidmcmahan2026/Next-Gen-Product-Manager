import { NavLink } from "react-router-dom";
import { PersonaSwitcher } from "@/components/PersonaSwitcher";
import { cn } from "@/lib/utils";
import type { PersonaId } from "@/lib/mockData";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface PageShellProps {
  activePersona: PersonaId;
  navItems: NavItem[];
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function PageShell({ activePersona, navItems, title, description, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <PersonaSwitcher activePersona={activePersona} />

      <div className="flex">
        <nav className="w-56 shrink-0 border-r border-border bg-background/60 px-3 py-6">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#2c6e8c]/10 text-[#2c6e8c]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <main className="flex-1 px-8 py-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
