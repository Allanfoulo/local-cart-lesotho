type RuntimeProcess = { env?: Record<string, string | undefined> };

export function getDeploymentEnv(name: string) {
  const runtime = globalThis as typeof globalThis & { process?: RuntimeProcess };
  return runtime.process?.env?.[name];
}
