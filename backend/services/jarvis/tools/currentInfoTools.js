const { RISK_LEVELS } = require('./toolRegistry');

/**
 * currentInfoTools
 * Live real-time current affairs and news retrieval tool for JARVIS.
 * Fetches real live RSS feeds from Google News / BBC / TechCrunch / Topic feeds.
 * Never fabricates news.
 */
async function fetchLiveNews(topicOrQuery = '') {
  const query = (topicOrQuery || '').trim();
  const lower = query.toLowerCase();

  let url = 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';

  if (lower.includes('tech') || lower.includes('ai') || lower.includes('software')) {
    url = 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en';
  } else if (lower.includes('world') || lower.includes('international')) {
    url = 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en';
  } else if (lower.includes('business') || lower.includes('economy') || lower.includes('market')) {
    url = 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en';
  } else if (lower.includes('sport')) {
    url = 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en';
  } else if (query && !lower.includes('today') && !lower.includes('current') && !lower.includes('news') && !lower.includes('affair')) {
    url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(7000)
    });

    if (!response.ok) {
      return {
        success: false,
        error: `News source returned HTTP ${response.status}`,
        articles: []
      };
    }

    const xml = await response.text();
    const articles = [];
    const itemMatches = xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<\/item>/g);

    for (const m of itemMatches) {
      let rawTitle = m[1] || '';
      rawTitle = rawTitle
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();

      const pubDate = m[2] ? m[2].trim() : new Date().toUTCString();

      // Extract source if present in title (e.g. "Headline - SourceName")
      let headline = rawTitle;
      let source = 'News';
      const lastDash = rawTitle.lastIndexOf(' - ');
      if (lastDash > 0) {
        headline = rawTitle.substring(0, lastDash).trim();
        source = rawTitle.substring(lastDash + 3).trim();
      }

      articles.push({
        title: headline,
        source,
        publishedAt: pubDate
      });

      if (articles.length >= 7) break;
    }

    if (articles.length === 0) {
      return {
        success: false,
        error: 'No news articles found for the given query',
        articles: []
      };
    }

    return {
      success: true,
      topic: query || 'Top Stories',
      fetchedAt: new Date().toISOString(),
      count: articles.length,
      articles
    };
  } catch (err) {
    return {
      success: false,
      error: `Network error retrieving live news: ${err.message}`,
      articles: []
    };
  }
}

const currentInfoTools = [
  {
    name: 'get_current_information',
    description: 'Retrieve real-time live news headlines and current events for today. Use when the user asks about today news, current affairs, recent developments, technology news, country news, or what is happening today.',
    category: 'information',
    permissionKey: 'get_current_information',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Topic or search term, e.g. "technology", "world", "India", "AI", "business", or "today"'
        }
      }
    },
    execute: async (context, input) => {
      const topic = input?.topic || '';
      const newsResult = await fetchLiveNews(topic);
      return newsResult;
    }
  },
  {
    name: 'get_live_news',
    description: 'Retrieve real-time live news headlines, current events, or world info (alias for get_current_information).',
    category: 'information',
    permissionKey: 'get_current_information',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Topic or search query e.g. "world", "technology", "news"' }
      }
    },
    execute: async (context, input) => {
      const topic = input?.topic || input?.query || '';
      return await fetchLiveNews(topic);
    }
  },
  {
    name: 'get_weather',
    description: 'Retrieve real-time/current weather data from Open-Meteo weather models for the specified city or location. Handles current conditions, rain queries, and daily forecasts.',
    category: 'information',
    permissionKey: 'get_current_information',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City or location e.g. "Chennai", "San Francisco", "London"' },
        queryType: { type: 'string', enum: ['general', 'rain', 'temperature'], description: 'Specific weather query type' },
        date: { type: 'string', description: 'Date for forecast e.g. "today", "tomorrow", "YYYY-MM-DD"' }
      }
    },
    execute: async (context, input) => {
      let loc = (input?.location || '').trim();
      const queryType = input?.queryType || 'general';
      const isTomorrow = input?.date === 'tomorrow' || (input?.date && input.date.toLowerCase().includes('tomorrow'));

      // If location is missing or generic, require clarification
      if (!loc || loc.toLowerCase() === 'current' || loc.toLowerCase() === 'current location' || loc.toLowerCase() === 'here') {
        const contextLoc = context?.userLocation || context?.workingMemory?.lastWeatherLocation;
        if (contextLoc) {
          loc = contextLoc;
        } else {
          return {
            success: false,
            requiresClarification: true,
            missingSlot: 'location',
            message: 'Which city or location would you like the weather for?'
          };
        }
      }

      // WMO Weather code interpreter helper
      const decodeWmoCode = (code) => {
        if (code === 0) return 'Clear sky';
        if (code === 1) return 'Mainly clear';
        if (code === 2) return 'Partly cloudy';
        if (code === 3) return 'Overcast';
        if (code === 45 || code === 48) return 'Foggy';
        if (code >= 51 && code <= 55) return 'Drizzle';
        if (code >= 61 && code <= 65) return 'Rain';
        if (code === 66 || code === 67) return 'Freezing rain';
        if (code >= 71 && code <= 77) return 'Snow';
        if (code >= 80 && code <= 82) return 'Rain showers';
        if (code >= 95 && code <= 99) return 'Thunderstorm';
        return 'Partly cloudy';
      };

      try {
        // Step 1: Geocoding via Open-Meteo
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=5&language=en&format=json`;
        const geoRes = await fetch(geoUrl, {
          headers: { 'User-Agent': 'WellWisher-JARVIS/2.0' },
          signal: AbortSignal.timeout(6000)
        });

        if (!geoRes.ok) {
          return {
            success: false,
            error: 'GEOCODING_SERVICE_ERROR',
            message: `Unable to look up location '${loc}'. Please try again.`
          };
        }

        const geoData = await geoRes.json();
        const results = geoData.results || [];

        // 0 matches: ask for clarification
        if (results.length === 0) {
          return {
            success: false,
            requiresClarification: true,
            missingSlot: 'location',
            message: `I couldn't find a location matching '${loc}'. Which city would you like to check?`
          };
        }

        // Multiple plausible matches check (e.g. Springfield IL vs Springfield MO)
        if (results.length > 1) {
          const exactMatches = results.filter(r => r.name.toLowerCase() === loc.toLowerCase());
          if (exactMatches.length > 1) {
            const distinctRegions = new Set(exactMatches.map(r => `${r.name}, ${r.admin1 || ''} ${r.country || ''}`.trim()));
            if (distinctRegions.size > 1) {
              const optionsStr = Array.from(distinctRegions).slice(0, 3).join(' or ');
              return {
                success: false,
                requiresClarification: true,
                missingSlot: 'location',
                message: `I found multiple locations for '${loc}'. Did you mean ${optionsStr}?`
              };
            }
          }
        }

        const matchedPlace = results[0];
        const lat = matchedPlace.latitude;
        const lon = matchedPlace.longitude;
        const resolvedName = matchedPlace.name;
        const resolvedRegion = matchedPlace.admin1 ? `${resolvedName}, ${matchedPlace.admin1}` : resolvedName;

        // Step 2: Forecast via Open-Meteo
        const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
        const forecastRes = await fetch(forecastUrl, {
          headers: { 'User-Agent': 'WellWisher-JARVIS/2.0' },
          signal: AbortSignal.timeout(7000)
        });

        if (!forecastRes.ok) {
          return {
            success: false,
            error: 'FORECAST_SERVICE_ERROR',
            message: `Unable to retrieve weather forecast for ${resolvedRegion}.`
          };
        }

        const forecastData = await forecastRes.json();
        const current = forecastData.current || {};
        const daily = forecastData.daily || {};

        if (isTomorrow) {
          const tmrCode = daily.weather_code?.[1] ?? 2;
          const tmrCondition = decodeWmoCode(tmrCode);
          const tmrMax = daily.temperature_2m_max?.[1] ?? 'N/A';
          const tmrMin = daily.temperature_2m_min?.[1] ?? 'N/A';
          const tmrRainProb = daily.precipitation_probability_max?.[1] ?? 0;
          const willRain = tmrRainProb >= 40 || tmrCondition.toLowerCase().includes('rain') || tmrCondition.toLowerCase().includes('shower') || tmrCondition.toLowerCase().includes('thunderstorm');

          const speech = `Tomorrow in ${resolvedRegion}, expect ${tmrCondition} with a high of ${tmrMax}°C and a low of ${tmrMin}°C. Precipitation chance is ${tmrRainProb}%. ${willRain ? 'Carrying an umbrella is advisable.' : 'No umbrella should be needed.'}`;

          return {
            success: true,
            location: resolvedRegion,
            date: 'tomorrow',
            condition: tmrCondition,
            tempMaxC: tmrMax,
            tempMinC: tmrMin,
            precipitationProbability: `${tmrRainProb}%`,
            umbrellaNeeded: willRain,
            message: speech,
            speech
          };
        }

        const tempC = current.temperature_2m;
        const feelsLikeC = current.apparent_temperature;
        const humidity = current.relative_humidity_2m;
        const condition = decodeWmoCode(current.weather_code);
        const rainProbToday = daily.precipitation_probability_max?.[0] ?? 0;
        const currentRain = current.precipitation || current.rain || 0;
        const isRainingNow = currentRain > 0;
        const rainLikely = rainProbToday >= 40 || isRainingNow;

        let message = '';
        if (queryType === 'rain' || (input?.query && input.query.toLowerCase().includes('rain'))) {
          if (isRainingNow) {
            message = `It is currently raining in ${resolvedRegion} with ${condition} at ${tempC}°C. Rain probability today is ${rainProbToday}%, so definitely take an umbrella.`;
          } else if (rainLikely) {
            message = `There is a ${rainProbToday}% chance of rain in ${resolvedRegion} today with ${condition} and temperatures around ${tempC}°C. You should carry an umbrella.`;
          } else {
            message = `Rain is unlikely in ${resolvedRegion} today with a ${rainProbToday}% chance. Conditions are ${condition} at ${tempC}°C.`;
          }
        } else {
          message = `Currently in ${resolvedRegion}, it's ${condition} at ${tempC}°C (feels like ${feelsLikeC}°C) with ${humidity}% humidity. There is a ${rainProbToday}% chance of rain today.`;
        }

        return {
          success: true,
          location: resolvedRegion,
          latitude: lat,
          longitude: lon,
          temperatureC: tempC,
          apparentTemperatureC: feelsLikeC,
          humidity: `${humidity}%`,
          condition,
          precipitationProbabilityToday: `${rainProbToday}%`,
          isRainingNow,
          umbrellaNeeded: rainLikely,
          message,
          speech: message
        };
      } catch (err) {
        return {
          success: false,
          error: 'WEATHER_FETCH_FAILED',
          message: `Unable to load live weather data: ${err.message}`
        };
      }
    }
  }
];

module.exports = {
  currentInfoTools,
  fetchLiveNews
};
