import { ScrollText, Home } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import packageJson from "../../../package.json";

const version = packageJson.version;

interface AppHeaderProps {
  onGoToMenu?: () => void;
  showMenuButton?: boolean;
  actions?: React.ReactNode;
  adventureName?: string;
}

export function AppHeader({ onGoToMenu, showMenuButton = false, actions, adventureName }: AppHeaderProps) {
  return (
    <header className="flex items-center h-16 px-4 md:px-6 bg-primary text-primary-foreground shadow-md z-10">
      <ScrollText className="h-7 w-7 mr-3" />
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-headline font-bold">D&D Adventures AI</h1>
        <Badge variant="secondary" className="font-mono">v{version}</Badge>
        {adventureName && (
          <>
            <span className="text-primary-foreground/50">|</span>
            <span className="font-semibold text-lg truncate max-w-[200px] md:max-w-[400px]">{adventureName}</span>
          </>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {actions}
        {showMenuButton && (
          <Button variant="ghost" size="icon" onClick={onGoToMenu}>
            <Home className="h-6 w-6" />
            <span className="sr-only">Menú Principal</span>
          </Button>
        )}
      </div>
    </header>
  );
}
