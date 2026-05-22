let finalizeInProgress = false;

export function isFinalizeInProgress(): boolean {
  return finalizeInProgress;
}

export function runWithFinalizeGuard(work: () => void) {
  if (finalizeInProgress) return;
  finalizeInProgress = true;
  try {
    work();
  } finally {
    finalizeInProgress = false;
  }
}
