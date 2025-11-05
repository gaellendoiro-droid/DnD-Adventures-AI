import { ScrollText, Home } from "lucide-react";
import { Button } from "../ui/button";
import { version } from '../../../package.json';
import { Badge } from "../ui/badge";

interface AppHeaderProps {
  onGoToMenu?: () => void;
  showMenuButton?: boolean;
}

export function AppHeader({ onGoToMenu, showMenuButton = false }: AppHeaderProps) {
  return (
    <header className="flex items-center h-16 px-4 md:px-6 bg-primary text-primary-foreground shadow-md z-10">
      <ScrollText className="h-7 w-7 mr-3" />
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-headline font-bold">D&D Adventures AI</h1>
        <Badge variant="secondary" className="font-mono">v{version}</Badge>
      </div>
      {showMenuButton && (
        <div className="ml-auto">
          <Button variant="ghost" size="icon" onClick={onGoToMenu}>
            <Home className="h-6 w-6" />
            <span className="sr-only">Menú Principal</span>
          </Button>
        </div>
      )}
    </header>
  );
}
