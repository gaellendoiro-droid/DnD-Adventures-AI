'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Save, Upload } from 'lucide-react';

interface MainMenuProps {
  onNewGame: () => void;
}

export function MainMenu({ onNewGame }: MainMenuProps) {
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
            <Button size="lg" onClick={onNewGame}>
              <Play className="mr-2 h-5 w-5" />
              Nueva Partida
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
