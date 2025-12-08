
'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Play, Upload, Gamepad2, Loader2, FileJson, Folder, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface AdventureNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: AdventureNode[];
}

interface MainMenuProps {
  onNewGame: (adventurePath?: string) => void;
  onContinueGame: () => void;
  onLoadAdventure: (file: File) => void;
  onLoadGame: (file: File) => void;
  gameInProgress: boolean;
  loading: string | null;
}

export function MainMenu({ onNewGame, onContinueGame, onLoadAdventure, onLoadGame, gameInProgress, loading }: MainMenuProps) {
  const adventureInputRef = useRef<HTMLInputElement>(null);
  const saveGameInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const [showAdventureSelector, setShowAdventureSelector] = useState(false);
  const [adventureTree, setAdventureTree] = useState<AdventureNode[]>([]);
  const [loadingAdventures, setLoadingAdventures] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const handleLoadAdventureClick = () => {
    adventureInputRef.current?.click();
  };
  
  const handleLoadGameClick = () => {
    saveGameInputRef.current?.click();
  };

  const handleNewGameClick = async () => {
    setShowAdventureSelector(true);
    setLoadingAdventures(true);
    try {
      const res = await fetch('/api/adventures/list');
      const data = await res.json();
      if (data.tree) {
        setAdventureTree(data.tree);
      } else {
        throw new Error('No adventures found');
      }
    } catch (error) {
      console.error('Error loading adventures:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar las aventuras disponibles.',
      });
    } finally {
      setLoadingAdventures(false);
    }
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  const selectAdventure = (adventure: string) => {
    setShowAdventureSelector(false);
    onNewGame(adventure);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, handler: (file: File) => void) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/json') {
        handler(file);
      } else {
        toast({
          variant: 'destructive',
          title: 'Archivo no válido',
          description: 'Por favor, selecciona un archivo JSON.',
        });
      }
    }
    // Reset file input to allow uploading the same file again
    if(event.target) {
        event.target.value = '';
    }
  };

  const renderAdventureNode = (node: AdventureNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    
    if (node.type === 'folder') {
      return (
        <div key={node.path} className="w-full">
          <Collapsible open={isExpanded} onOpenChange={() => toggleFolder(node.path)}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-left h-auto py-2 px-3",
                  level > 0 && "ml-4"
                )}
              >
                <ChevronRight className={cn(
                  "mr-2 h-4 w-4 shrink-0 transition-transform",
                  isExpanded && "rotate-90"
                )} />
                <Folder className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{node.name}</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-2">
              <div className="flex flex-col">
                {node.children?.map(child => renderAdventureNode(child, level + 1))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      );
    } else {
      return (
        <Button
          key={node.path}
          variant="outline"
          className={cn(
            "justify-start text-left h-auto py-2 px-3",
            level > 0 && "ml-4"
          )}
          onClick={() => selectAdventure(node.path)}
        >
          <FileJson className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{node.name}</span>
        </Button>
      );
    }
  };

  const isLoading = (action: string) => loading === action;
  const isAnyLoading = loading !== null;


  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-headline">
            Menú Principal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            {gameInProgress && (
              <Button size="lg" onClick={onContinueGame} disabled={isAnyLoading}>
                <Gamepad2 className="mr-2 h-5 w-5" />
                Continuar Partida
              </Button>
            )}
            <Button size="lg" variant={gameInProgress ? 'secondary' : 'default'} onClick={handleNewGameClick} disabled={isAnyLoading}>
              <Play className="mr-2 h-5 w-5" />
              Nueva Partida
            </Button>
            
            <Dialog open={showAdventureSelector} onOpenChange={setShowAdventureSelector}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Selecciona una Aventura</DialogTitle>
                  <DialogDescription>
                    Elige una de las aventuras disponibles para comenzar.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col space-y-2 mt-4">
                  {loadingAdventures ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : adventureTree.length > 0 ? (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="flex flex-col space-y-1">
                        {adventureTree.map((node) => renderAdventureNode(node))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-center text-muted-foreground p-4">No se encontraron aventuras.</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <input
              type="file"
              id="adventure-file-input"
              name="adventure-file"
              ref={adventureInputRef}
              onChange={(e) => handleFileChange(e, onLoadAdventure)}
              accept="application/json"
              className="hidden"
              disabled={isAnyLoading}
            />
            <input
              type="file"
              id="save-game-file-input"
              name="save-game-file"
              ref={saveGameInputRef}
              onChange={(e) => handleFileChange(e, onLoadGame)}
              accept="application/json"
              className="hidden"
              disabled={isAnyLoading}
            />
            <Button size="lg" variant="secondary" onClick={handleLoadAdventureClick} disabled={isAnyLoading}>
              {isLoading('loadAdventure') ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Upload className="mr-2 h-5 w-5" />
              )}
              {isLoading('loadAdventure') ? 'Cargando Aventura...' : 'Cargar Aventura (JSON)'}
            </Button>
            <Button size="lg" variant="secondary" onClick={handleLoadGameClick} disabled={isAnyLoading}>
              {isLoading('loadGame') ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-5 w-5" />
              )}
              {isLoading('loadGame') ? 'Cargando Partida...' : 'Cargar Partida'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
