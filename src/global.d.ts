// global types

// 百度地图GL版本全局类型声明
/// <reference types="bmapgl" />

// Transformers.js — loaded dynamically at runtime, types stubbed here
declare module '@xenova/transformers' {
  export function pipeline(task: string, model?: string, options?: Record<string, unknown>): Promise<(input: unknown, options?: Record<string, unknown>) => Promise<unknown>>;
  export function env(key: string, value: unknown): void;
}
