exports.handler = async function(event, context) {
  const source = event.queryStringParameters?.source || 'wsj';
  const dateParam = event.queryStringParameters?.date; // YYMMDD format, optional

  // URL patterns per source
  const patterns = {
    wsj:       ds => `https://herbach.dnsalias.com/wsj/wsj${ds}.puz`,
    universal: ds => `https://herbach.dnsalias.com/Uni/uc${ds}.puz`,
    jonesin:   ds => `https://herbach.dnsalias.com/Jonesin/jz${ds}.puz`,
  };

  const pattern = patterns[source];
  if (!pattern) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Unknown source: ' + source }),
    };
  }

  // Build list of dates to try
  let datesToTry = [];
  if (dateParam) {
    // Specific date requested — try it and one day either side
    datesToTry = [dateParam];
  } else {
    // No date — try today and past 7 days (catches weekly puzzles)
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const yy = String(d.getFullYear()).slice(2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      datesToTry.push(`${yy}${mm}${dd}`);
    }
  }

  const urls = datesToTry.map(pattern);
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
    body: JSON.stringify({ error: 'Puzzle not found for that date. Last error: ' + lastError }),
  };
};
