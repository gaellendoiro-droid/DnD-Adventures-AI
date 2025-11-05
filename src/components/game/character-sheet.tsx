
"use client";

import type { Character } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "../ui/scroll-area";
import {
  Swords,
  Feather,
  Shield,
  Brain,
  BookOpen,
  Sparkles,
  Heart,
  ShieldCheck,
  ScrollText,
  Package,
  Info,
  BookUser,
} from "lucide-react";
import { Badge } from "../ui/badge";

interface CharacterSheetProps {
  character: Character | null;
}

const abilityIcons = {
  fuerza: <Swords className="w-5 h-5 text-red-500" />,
  destreza: <Feather className="w-5 h-5 text-green-500" />,
  constitución: <Shield className="w-5 h-5 text-blue-500" />,
  inteligencia: <Brain className="w-5 h-5 text-purple-500" />,
  sabiduría: <BookOpen className="w-5 h-5 text-yellow-500" />,
  carisma: <Sparkles className="w-5 h-5 text-pink-500" />,
};

export function CharacterSheet({ character }: CharacterSheetProps) {
  if (!character) {
    return (
      <div className="p-4 h-full flex items-center justify-center text-muted-foreground">
        <p>Selecciona un personaje para ver su ficha.</p>
      </div>
    );
  }

  const getModifier = (score: number) => {
    const modifier = Math.floor((score - 10) / 2);
    return modifier >= 0 ? `+${modifier}` : modifier;
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-headline font-bold">
              {character.name}
            </h2>
            <p className="text-muted-foreground">
              {character.race} {character.class}, Nivel {character.level}
            </p>
            <p className="text-sm text-muted-foreground">
              {character.sex}
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <Heart className="w-5 h-5 text-destructive" />
              <h3 className="font-semibold text-sm text-muted-foreground">
                Puntos de Golpe
              </h3>
            </div>
            <p className="font-bold text-xl font-mono">
              {character.hp.current} / {character.hp.max}
            </p>
            <Progress
              value={(character.hp.current / character.hp.max) * 100}
              className="h-2 mt-2"
            />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-sm text-muted-foreground">
                AC
              </h3>
            </div>
            <p className="font-bold text-xl">{character.ac}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-headline">
              Habilidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {Object.entries(character.abilityScores).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-3">
                  <div className="p-2 bg-secondary rounded-md">
                    {abilityIcons[key as keyof typeof abilityIcons]}
                  </div>
                  <div>
                    <p className="text-sm capitalize text-muted-foreground">
                      {key}
                    </p>
                    <p className="font-bold text-lg">
                      {value}{" "}
                      <span className="text-sm font-mono text-muted-foreground">
                        ({getModifier(value)})
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Accordion type="single" collapsible className="w-full" defaultValue="inventory">
          <AccordionItem value="personality">
            <AccordionTrigger className="font-semibold text-base">
                <Info className="mr-2"/> Personalidad
            </AccordionTrigger>
            <AccordionContent>
                <p className="text-sm text-muted-foreground italic p-2">
                "{character.personality}"
                </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="background">
            <AccordionTrigger className="font-semibold text-base">
                <BookUser className="mr-2"/> Trasfondo
            </AccordionTrigger>
            <AccordionContent>
                <p className="text-sm text-muted-foreground p-2">
                  El trasfondo de un personaje revela de dónde viene, cómo se convirtió en un aventurero y cuál es su lugar en el mundo. El trasfondo de {character.name} es: <strong>{character.background}</strong>.
                </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="skills">
            <AccordionTrigger className="font-semibold text-base">
              <ScrollText className="mr-2"/> Competencias
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {character.skills.map((skill) => (
                  <div
                    key={skill.name}
                    className="flex justify-between items-center p-2 rounded-md transition-colors hover:bg-secondary"
                  >
                    <span className="text-sm">{skill.name}</span>
                    {skill.proficient && (
                      <Badge variant="outline">Competente</Badge>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="inventory">
            <AccordionTrigger className="font-semibold text-base">
              <Package className="mr-2" /> Inventario
            </AccordionTrigger>
            <AccordionContent>
               {character.inventory.length === 0 ? (
                 <p className="text-muted-foreground text-sm p-2">
                    El inventario está vacío.
                 </p>
               ) : (
                <div className="space-y-3">
                    {character.inventory.map(item => (
                        <div key={item.id} className="p-2 rounded-md transition-colors hover:bg-secondary">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold">{item.name}</span>
                                {item.quantity > 1 && <Badge variant="secondary">x{item.quantity}</Badge>}
                            </div>
                            {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                        </div>
                    ))}
                </div>
               )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </ScrollArea>
  );
}
