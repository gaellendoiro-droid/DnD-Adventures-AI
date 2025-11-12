
'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Upload, Gamepad2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MainMenuProps {
  onNewGame: () => void;
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

  const handleLoadAdventureClick = () => {
    adventureInputRef.current?.click();
  };
  
  const handleLoadGameClick = () => {
    saveGameInputRef.current?.click();
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
            <Button size="lg" variant={gameInProgress ? 'secondary' : 'default'} onClick={onNewGame} disabled={isAnyLoading}>
              <Play className="mr-2 h-5 w-5" />
              Nueva Partida
            </Button>
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
