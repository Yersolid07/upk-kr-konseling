// src/lib/fonnte.ts

/**
 * Utility to send WhatsApp messages via Fonnte API
 * Documentation: https://docs.fonnte.com/
 */

export async function sendWhatsApp(target: string, message: string) {
  const token = process.env.FONNTE_TOKEN;
  
  if (!token) {
    console.error('Fonnte token is not configured in environment variables.');
    return { success: false, error: 'Configuration missing' };
  }

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
      },
      body: new URLSearchParams({
        target,
        message,
        // Optional parameters can be added here
        // delay: '2',
        // countryCode: '62', // Default to Indonesia
      }),
    });

    const result = await response.json();
    
    if (result.status) {
      return { success: true, data: result };
    } else {
      console.error('Fonnte API error:', result.reason || 'Unknown error');
      return { success: false, error: result.reason || 'Failed to send' };
    }
  } catch (error) {
    console.error('Error calling Fonnte API:', error);
    return { success: false, error: 'Connection failed' };
  }
}
