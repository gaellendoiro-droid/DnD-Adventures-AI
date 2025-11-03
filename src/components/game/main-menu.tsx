'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Save, Upload, Gamepad2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MainMenuProps {
  onNewGame: () => void;
  onContinueGame: () => void;
  onLoadAdventure: (file: File) => void;
  gameInProgress: boolean;
  isLoading?: boolean;
}

export function MainMenu({ onNewGame, onContinueGame, onLoadAdventure, gameInProgress, isLoading = false }: MainMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/json') {
        onLoadAdventure(file);
      } else {
        toast({
          variant: 'destructive',
          title: 'Archivo no válido',
          description: 'Por favor, selecciona un archivo JSON.',
        });
      }
    }
    // Reset file input to allow uploading the same file again
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };


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
              <Button size="lg" onClick={onContinueGame} disabled={isLoading}>
                <Gamepad2 className="mr-2 h-5 w-5" />
                Continuar Partida
              </Button>
            )}
            <Button size="lg" variant={gameInProgress ? 'secondary' : 'default'} onClick={onNewGame} disabled={isLoading}>
              <Play className="mr-2 h-5 w-5" />
              Nueva Partida
            </Button>
             <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/json"
              className="hidden"
              disabled={isLoading}
            />
            <Button size="lg" variant="secondary" onClick={handleLoadClick} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Upload className="mr-2 h-5 w-5" />
              )}
              {isLoading ? 'Cargando Aventura...' : 'Cargar Aventura (JSON)'}
            </Button>
            <Button size="lg" variant="secondary" disabled>
              <Upload className="mr-2 h-5 w-5" />
              Cargar Partida
            </Button>
            <Button size="lg" variant="secondary" disabled>
              <Save className="mr-2 h-5 w-5" />
              Guardar Partida
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
