const datasets = new Map<string, unknown[]>();

export function getRuntimeDataset<T>(key: string): T[] | null {
  return (datasets.get(key) as T[] | undefined) ?? null;
}

export function setRuntimeDataset<T>(key: string, data: T[]): void {
  datasets.set(key, data);
}
