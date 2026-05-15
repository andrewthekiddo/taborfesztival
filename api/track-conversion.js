// Vercel serverless function for Meta Conversions API (CAPI)
// Sends events to Meta for server-side conversion tracking

const PIXEL_ID = '940012236371499';
const API_VERSION = 'v18.0';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('META_CAPI_ACCESS_TOKEN not set');
    return res.status(500).json({ error: 'Configuration error' });
  }

  try {
    const { eventName, eventData } = req.body;
    if (!eventName) {
      return res.status(400).json({ error: 'Missing eventName' });
    }

    // Prepare CAPI payload
    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: eventData?.url || req.headers.referer || '',
          user_data: {
            client_ip_address: req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress,
            client_user_agent: req.headers['user-agent'],
            fbc: eventData?.fbc,
            fbp: eventData?.fbp,
          },
          event_id: eventData?.eventId || `${Date.now()}`,
          custom_data: eventData?.customData || {},
        },
      ],
      access_token: accessToken,
    };

    // Send to Meta Conversions API
    const response = await fetch(
      `https://graph.instagram.com/${API_VERSION}/${PIXEL_ID}/conversions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('Meta CAPI error:', result);
      return res.status(response.status).json(result);
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('CAPI endpoint error:', error);
    return res.status(500).json({ error: error.message });
  }
}
