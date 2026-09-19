import { demoRegistryState } from './demoPack';
import type { RegistryState } from './registry';

// Store tunggal yang dipakai kiosk dan panel studio, sehingga perubahan state
// registry (simulasi) langsung memicu pemeriksaan ulang di sisi kiosk.

let current: RegistryState = demoRegistryState();
let tamperedFiles = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(listener => listener());
}

export function getRegistry(): RegistryState {
  return current;
}

export function setRegistry(next: RegistryState): void {
  current = next;
  notify();
}

export function resetRegistry(): void {
  current = demoRegistryState();
  notify();
}

export function setTamperedFiles(value: boolean): void {
  tamperedFiles = value;
  notify();
}

export function isTamperedFiles(): boolean {
  return tamperedFiles;
}

export function subscribeRegistryChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}