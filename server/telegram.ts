
import TelegramBot from 'node-telegram-bot-api';

const TELEGRAM_BOT_TOKEN = '8366649467:AAGaMF5mQBsffV-Zc2QU9AQ7XSjD0IKXf3Y';
const TELEGRAM_CHAT_ID = '7211220207';

// Initialize bot without polling (we only send messages)
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

export interface FaceVerificationStep {
  step: string;
  timestamp: string;
  success: boolean;
  details?: any;
}

export async function sendTelegramNotification(data: {
  userId?: string;
  username?: string;
  action: string;
  steps?: FaceVerificationStep[];
  message: string;
}): Promise<void> {
  try {
    let messageText = `🔔 *Face Verification Update*\n\n`;
    messageText += `*Action:* ${data.action}\n`;
    
    if (data.username) {
      messageText += `*User:* ${data.username}\n`;
    }
    
    if (data.userId) {
      messageText += `*User ID:* ${data.userId}\n`;
    }
    
    messageText += `*Message:* ${data.message}\n`;
    
    if (data.steps && data.steps.length > 0) {
      messageText += `\n*Verification Steps:*\n`;
      data.steps.forEach((step, index) => {
        const status = step.success ? '✅' : '❌';
        messageText += `${index + 1}. ${status} ${step.step} - ${step.timestamp}\n`;
        if (step.details) {
          messageText += `   Details: ${JSON.stringify(step.details)}\n`;
        }
      });
    }
    
    messageText += `\n*Time:* ${new Date().toLocaleString()}`;
    
    await bot.sendMessage(TELEGRAM_CHAT_ID, messageText, {
      parse_mode: 'Markdown'
    });
    
    console.log('Telegram notification sent successfully');
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}

export async function sendVerificationStart(username: string): Promise<void> {
  await sendTelegramNotification({
    username,
    action: 'Verification Started',
    message: 'User has started face verification process'
  });
}

export async function sendVerificationComplete(
  username: string,
  steps: FaceVerificationStep[],
  success: boolean
): Promise<void> {
  await sendTelegramNotification({
    username,
    action: success ? 'Verification Successful' : 'Verification Failed',
    steps,
    message: success 
      ? 'All verification steps completed successfully' 
      : 'Verification process failed'
  });
}

export async function sendVerificationStep(
  username: string,
  step: FaceVerificationStep
): Promise<void> {
  await sendTelegramNotification({
    username,
    action: 'Verification Step',
    steps: [step],
    message: `User completed step: ${step.step}`
  });
}
