declare module 'uuid' {
    export function v4(): string;
    export function v1(): string;
    export function v3(name: string | number[], namespace: string | number[]): string;
    export function v5(name: string | number[], namespace: string | number[]): string;
    export function validate(uuid: string): boolean;
    export function version(uuid: string): number;
    export const NIL: string;
    export const MAX: string;
}

declare module 'recharts' {
    import * as React from 'react';
    export const ResponsiveContainer: React.ComponentType<any>;
    export const Tooltip: React.ComponentType<any>;
    export const Legend: React.ComponentType<any>;
    export type LegendProps = {
        payload?: any[];
        verticalAlign?: string;
        [key: string]: any;
    };
    export type TooltipProps<TValue = any, TName = any> = {
        payload?: any[];
        [key: string]: any;
    };
}
