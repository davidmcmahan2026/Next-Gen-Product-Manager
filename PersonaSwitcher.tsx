import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, Sparkles } from "lucide-react";
import { personas, type PersonaId } from "@/lib/mockData";

interface PersonaSwitcherProps {
  activePersona: PersonaId;
}

const personaHome: Record<PersonaId, string> = {
  maya: "/upload",
  ethan: "/upload",
  priya: "/governance",
  daniel: "/dashboard",
};

export function PersonaSwitcher({ activePersona }: PersonaSwitcherProps) {
  const navigate = useNavigate();
  const active = personas.find((p) => p.id === activePersona) ?? personas[0];

  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-6 py-3">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2c6e8c] text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">DataClean Studio</span>
        <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          prototype
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px] bg-[#2c6e8c]/10 text-[#2c6e8c]">
                {active.initials}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{active.name}</span>
            <span className="text-muted-foreground hidden sm:inline">· {active.role}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Switch persona</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {personas.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => navigate(personaHome[p.id])}
              className="gap-2"
            >
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px] bg-[#2c6e8c]/10 text-[#2c6e8c]">
                  {p.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.role}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
