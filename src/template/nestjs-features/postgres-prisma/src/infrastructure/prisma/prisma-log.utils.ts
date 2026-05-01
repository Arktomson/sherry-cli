export type PrismaLogLevel = 'query' | 'info' | 'warn' | 'error';

export function resolvePrismaLogLevels(nodeEnv: string): PrismaLogLevel[] {
  if (nodeEnv === 'development') {
    return ['warn', 'error'];
  }

  return ['error'];
}
