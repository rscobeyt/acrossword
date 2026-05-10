exports.handler = async function(event, context) {
  const source = event.queryStringParameters?.source || 'wsj';

  // Multiple URL candidates per source in case one is down
  const sources = {
    wsj: [
      'https://herbach.dnsalias.com/wsj/wsj.puz',
      'https://www.fleetingimage.com/wij/xyzzy/wsj.puz',
    ],
    universal: [
      'https://herbach.dnsalias.com/Uni/uni.puz',
      'https://www.fleetingimage.com/wij/xyzzy/uni.puz',
    ],
    jonesin: [
      'https://herbach.dnsalias.com/Jonesin/jonesin.puz',
      'https://www.fleetingimage.com/wij/xyzzy/jonesin.puz',
    ],
  };

  const urls = sources[source];
  if (!urls) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Unknown source: ' + source }),
    };
  }

  let lastError = '';
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Acrossword/1.0)' },
        redirect: 'follow',
      });
      if (!response.ok) {
        lastError = `${url} returned ${response.status}`;
        continue;
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength < 50) {
        lastError = `${url} returned empty response`;
        continue;
      }
      const base64 = Buffer.from(buffer).toString('base64');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({ data: base64, source, url }),
      };
    } catch (err) {
      lastError = `${url} threw: ${err.message}`;
      continue;
    }
  }

  return {
    statusCode: 500,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ error: 'All sources failed. Last error: ' + lastError }),
  };
};
