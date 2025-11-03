import { ScrollText } from "lucide-react";

export function AppHeader() {
  return (
    <header className="flex items-center h-16 px-6 bg-primary text-primary-foreground shadow-md z-10">
      <ScrollText className="h-7 w-7 mr-3" />
      <h1 className="text-xl font-headline font-bold">D&D Adventures AI</h1>
    </header>
  );
}
