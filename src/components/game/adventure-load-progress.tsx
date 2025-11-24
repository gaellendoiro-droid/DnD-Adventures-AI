
import React from 'react';
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type LoadStep = 'parsing' | 'validating' | 'connecting' | 'initializing' | 'narrating' | 'complete' | 'error';

interface StepInfo {
    id: LoadStep;
    label: string;
    description: string;
}

const STEPS: StepInfo[] = [
    { id: 'parsing', label: 'Analizando Archivo', description: 'Leyendo estructura JSON...' },
    { id: 'validating', label: 'Validando Aventura', description: 'Verificando integridad y reglas...' },
    { id: 'connecting', label: 'Conectando', description: 'Verificando estado del servidor...' },
    { id: 'initializing', label: 'Inicializando Mundo', description: 'Preparando caché y estados...' },
    { id: 'narrating', label: 'Generando Historia', description: 'El Dungeon Master está escribiendo...' },
];

interface AdventureLoadProgressProps {
    currentStep: LoadStep;
    error?: { title: string; message: string } | null;
    onRetry?: () => void;
    onCancel?: () => void;
}

export function AdventureLoadProgress({ currentStep, error, onRetry, onCancel }: AdventureLoadProgressProps) {
    const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
    const progress = Math.max(5, Math.min(100, ((currentStepIndex + 1) / STEPS.length) * 100));

    if (error) {
        return (
            <div className="w-full max-w-md mx-auto p-6 space-y-4 bg-card rounded-lg border shadow-lg">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{error.title}</AlertTitle>
                    <AlertDescription>{error.message}</AlertDescription>
                </Alert>
                <div className="flex justify-end gap-2">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Cancelar
                        </button>
                    )}
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        >
                            Reintentar
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto p-6 space-y-6 bg-card rounded-lg border shadow-lg animate-in fade-in zoom-in duration-300">
            <div className="space-y-2">
                <h3 className="text-lg font-semibold tracking-tight text-center">
                    Cargando Aventura
                </h3>
                <p className="text-sm text-muted-foreground text-center">
                    {STEPS[currentStepIndex]?.description || 'Procesando...'}
                </p>
            </div>

            <Progress value={progress} className="h-2 w-full transition-all duration-500" />

            <div className="space-y-2">
                {STEPS.map((step, index) => {
                    const isCompleted = index < currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    const isPending = index > currentStepIndex;

                    return (
                        <div
                            key={step.id}
                            className={`flex items-center gap-3 text-sm transition-colors duration-300 ${isPending ? 'text-muted-foreground/40' :
                                    isCurrent ? 'text-foreground font-medium' :
                                        'text-muted-foreground'
                                }`}
                        >
                            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                {isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : isCurrent ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                                )}
                            </div>
                            <span>{step.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
