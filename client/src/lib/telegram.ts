
export interface VerificationStep {
  step: string;
  timestamp?: string;
  success: boolean;
  details?: any;
}

export async function notifyVerificationStart(username: string): Promise<void> {
  try {
    await fetch('/api/verification/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });
  } catch (error) {
    console.error('Failed to send start notification:', error);
  }
}

export async function notifyVerificationStep(
  username: string,
  step: VerificationStep
): Promise<void> {
  try {
    await fetch('/api/verification/step', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        username, 
        step: {
          ...step,
          timestamp: step.timestamp || new Date().toISOString()
        }
      }),
    });
  } catch (error) {
    console.error('Failed to send step notification:', error);
  }
}

export async function notifyVerificationComplete(
  username: string,
  steps: VerificationStep[],
  success: boolean
): Promise<void> {
  try {
    await fetch('/api/verification/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, steps, success }),
    });
  } catch (error) {
    console.error('Failed to send completion notification:', error);
  }
}
