
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
    Wand2,
} from "lucide-react";
import { Badge } from "../ui/badge";

interface CharacterSheetProps {
    character: Character | null;
}

const abilityIcons = {
    fuerza: <Swords className="w-4 h-4 text-red-500" />,
    destreza: <Feather className="w-4 h-4 text-green-500" />,
    constitución: <Shield className="w-4 h-4 text-blue-500" />,
    inteligencia: <Brain className="w-4 h-4 text-purple-500" />,
    sabiduría: <BookOpen className="w-4 h-4 text-yellow-500" />,
    carisma: <Sparkles className="w-4 h-4 text-pink-500" />,
};

const backgroundDescriptions: { [key: string]: string } = {
    "Noble": "Como noble, provienes de una familia de la alta sociedad. Tienes privilegios, pero también grandes responsabilidades. Es posible que te traten con respeto en ciertos círillos, y tu linaje puede abrirte puertas... o granjearte enemigos.",
    "Acólita": "Has pasado tu vida al servicio de un templo o una orden sagrada. Tu entrenamiento te ha proporcionado conocimientos sobre el reino divino y los ritos sagrados. La gente de fe podría acudir a ti en busca de guía.",
    "Erudito": "Has dedicado años al estudio y la investigación, acumulando conocimientos. Tu mente es tu mayor herramienta y tu mayor tesoro. Puedes recordar información sobre historia, magia o cualquier otro tema que hayas estudiado.",
    "Default": "El trasfondo de un personaje revela de dónde viene, cómo se convirtió en un aventurero y cuál es su lugar en el mundo."
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

    const backgroundDescription = backgroundDescriptions[character.background] || backgroundDescriptions["Default"];

    return (
        <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
                <div className="flex flex-col items-center space-y-2">
                    <div className="text-center">
                        <h2 className="text-xl font-headline font-bold">
                            {character.name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {character.race} {character.characterClass}, Nivel {character.level}
                        </p>
                    </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <Heart className="w-4 h-4 text-destructive" />
                            <h3 className="font-semibold text-xs text-muted-foreground">
                                Puntos de Golpe
                            </h3>
                        </div>
                        <p className="font-bold text-lg font-mono">
                            {character.hp.current} / {character.hp.max}
                        </p>
                        <Progress
                            value={(character.hp.current / character.hp.max) * 100}
                            className="h-1.5 mt-1.5"
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <ShieldCheck className="w-4 h-4 text-blue-400" />
                            <h3 className="font-semibold text-xs text-muted-foreground">
                                AC
                            </h3>
                        </div>
                        <p className="font-bold text-lg">{character.ac}</p>
                    </div>
                </div>

                <Card>
                    <CardHeader className="py-2">
                        <CardTitle className="text-base font-headline">
                            Atributos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 pb-2">
                        <div className="grid grid-cols-3 gap-1 text-center">
                            {Object.entries(character.abilityScores).map(([key, value]) => (
                                <div key={key} className="flex flex-col items-center p-1.5 rounded-md bg-secondary">
                                    <div className="p-1 rounded-md bg-secondary">
                                        {abilityIcons[key as keyof typeof abilityIcons]}
                                    </div>
                                    <p className="font-semibold text-xs leading-tight mt-0.5 whitespace-nowrap">
                                        <span className="font-sans uppercase text-muted-foreground">{key.substring(0, 3)}:</span> {value} <span className="font-mono text-[10px] text-muted-foreground">({getModifier(value)})</span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="personality">
                        <AccordionTrigger className="font-semibold text-sm py-2">
                            <div className="flex items-center">
                                <Info className="mr-2 h-4 w-4" />
                                <span>Personalidad</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <p className="text-xs text-muted-foreground italic p-2">
                                "{character.personality}"
                            </p>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="background">
                        <AccordionTrigger className="font-semibold text-sm py-2">
                            <div className="flex items-center">
                                <BookUser className="mr-2 h-4 w-4" />
                                <span>Trasfondo: {character.background}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <p className="text-xs text-muted-foreground p-2">
                                {backgroundDescription}
                            </p>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="skills">
                        <AccordionTrigger className="font-semibold text-sm py-2">
                            <div className="flex items-center">
                                <ScrollText className="mr-2 h-4 w-4" />
                                <span>Competencias</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-1">
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                                {character.skills.map((skill) => (
                                    <div
                                        key={skill.name}
                                        className="flex justify-between items-center px-1.5 py-0.5 rounded transition-colors hover:bg-secondary"
                                    >
                                        <span className={`text-xs truncate ${skill.proficient ? 'font-semibold' : ''}`}>{skill.name}</span>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {skill.proficient && (
                                                <Badge variant="outline" className="text-[9px] h-4 px-1">Comp.</Badge>
                                            )}
                                            <span className="text-xs font-mono font-semibold min-w-[2ch] text-right">
                                                {skill.modifier >= 0 ? '+' : ''}{skill.modifier}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="inventory">
                        <AccordionTrigger className="font-semibold text-sm py-2">
                            <div className="flex items-center">
                                <Package className="mr-2 h-4 w-4" />
                                <span>Inventario</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-1">
                            {character.inventory.length === 0 ? (
                                <p className="text-muted-foreground text-xs px-2 py-1">
                                    El inventario está vacío.
                                </p>
                            ) : (
                                <div className="space-y-1">
                                    {character.inventory.map(item => (
                                        <div key={item.id} className="px-1.5 py-1 rounded transition-colors hover:bg-secondary">
                                            <div className="flex justify-between items-center gap-2">
                                                <span className="font-semibold text-xs truncate">{item.name}</span>
                                                {item.quantity > 1 && <Badge variant="secondary" className="text-[9px] h-4 px-1 flex-shrink-0">x{item.quantity}</Badge>}
                                            </div>
                                            {item.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="spells">
                        <AccordionTrigger className="font-semibold text-sm py-2">
                            <div className="flex items-center">
                                <Wand2 className="mr-2 h-4 w-4" />
                                <span>Conjuros</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-1">
                            {character.spells.length === 0 ? (
                                <p className="text-muted-foreground text-xs px-2 py-1">
                                    Este personaje no conoce conjuros.
                                </p>
                            ) : (
                                <div className="space-y-1">
                                    {character.spells.map(spell => (
                                        <div key={spell.id} className="px-1.5 py-1 rounded transition-colors hover:bg-secondary">
                                            <div className="flex justify-between items-center gap-2">
                                                <span className="font-semibold text-xs truncate">{spell.name}</span>
                                                <Badge variant={spell.level === 0 ? "outline" : "secondary"} className="text-[9px] h-4 px-1 flex-shrink-0">
                                                    {spell.level > 0 ? `Nv${spell.level}` : 'Truco'}
                                                </Badge>
                                            </div>
                                            {spell.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{spell.description}</p>}
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
