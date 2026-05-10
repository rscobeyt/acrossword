exports.handler = async function(event, context) {
  const sources = {
    wsj: 'https://herbach.dnsalias.com/wsj/wsj.puz',
    universal: 'https://herbach.dnsalias.com/Uni/uni.puz',
    jonesin: 'https://herbach.dnsalias.com/Jonesin/jonesin.puz',
  };

  const source = event.queryStringParameters?.source || 'wsj';
  const url = sources[source];

  if (!url) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown source' }) };
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Upstream ${response.status}`);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({ data: base64, source }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
