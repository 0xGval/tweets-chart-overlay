import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { Search } from 'lucide-react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import TweetList from './components/TweetList';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tweets, setTweets] = useState([]);
  const [timeframe, setTimeframe] = useState('1D');
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const [tokenInfo, setTokenInfo] = useState(null);

  const initChart = useCallback(() => {
    console.log("Initializing chart");
    if (chartRef.current) {
      console.log("Chart already initialized, removing old instance");
      try {
        chartRef.current.remove();
      } catch (error) {
        console.error("Error while removing chart:", error);
      }
    }

    if (!chartContainerRef.current) {
      console.error("Chart container not found");
      return;
    }

    const chartOptions = {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: 'solid', color: 'white' },
        textColor: 'black',
      },
      grid: {
        vertLines: { color: 'rgba(197, 203, 206, 0.5)' },
        horzLines: { color: 'rgba(197, 203, 206, 0.5)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        locale: 'en-US',
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    };

    chartRef.current = createChart(chartContainerRef.current, chartOptions);
    console.log("Chart created:", chartRef.current);

    seriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    console.log("Candlestick series added:", seriesRef.current);

    // Enable markers on the series
    seriesRef.current.setMarkers([]);

    console.log("Chart initialized successfully");
    addCustomTooltip();
  }, []);

  useEffect(() => {
    console.log("Component mounted, calling initChart");
    initChart();
    return () => {
      console.log("Component unmounting, cleaning up");
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (error) {
          console.error("Error while removing chart:", error);
        }
      }
    };
  }, [initChart]);

  const handleResize = useCallback(() => {
    console.log("Resize event triggered");
    if (chartRef.current && chartContainerRef.current) {
      chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const getResolution = (timeframe) => {
    switch (timeframe) {
      case '1H': return '60';
      case '4H': return '240';
      case '1D': return '1D';
      default: return '1D';
    }
  };

  const fetchData = async (tokenAddress, timeframe = '1D') => {
    console.log(`Fetching data for token: ${tokenAddress}, timeframe: ${timeframe}`);
    setLoading(true);
    setError(null);
    try {
      console.log("Making API request...");
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/proxy`,
        {
          url: "https://graph.defined.fi/graphql",
          method: "POST",
          data: {
            query: `
              {
                getBars(
                  symbol: "${tokenAddress}:1"
                  from: ${Math.floor(Date.now() / 1000) - getTimeframeSeconds(timeframe)}
                  to: ${Math.floor(Date.now() / 1000)}
                  resolution: "${getResolution(timeframe)}"
                  countback: ${getCountback(timeframe)}
                ) {
                  t
                  o
                  h
                  l
                  c
                  v
                }
              }
            `
          },
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      console.log("API Response received:", JSON.stringify(response.data, null, 2));

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      const barsData = response.data.data?.getBars;
      if (!barsData) {
        throw new Error("No data available for this token");
      }

      console.log("Processing bar data...");
      let chartData;

      if (Array.isArray(barsData)) {
        chartData = barsData.map(bar => ({
          time: bar.t,
          open: parseFloat(bar.o),
          high: parseFloat(bar.h),
          low: parseFloat(bar.l),
          close: parseFloat(bar.c)
        }));
      } else if (typeof barsData === 'object' && barsData.t) {
        const { t, o, h, l, c } = barsData;
        chartData = t.map((time, index) => ({
          time: time,
          open: parseFloat(o[index]),
          high: parseFloat(h[index]),
          low: parseFloat(l[index]),
          close: parseFloat(c[index])
        }));
      } else {
        throw new Error("Unexpected data format received from API");
      }

      console.log("Processed chart data:", chartData);

      if (chartData.length === 0) {
        throw new Error("No valid data points after processing");
      }

      console.log("Setting chart data...");
      if (seriesRef.current && chartRef.current) {
        seriesRef.current.setData(chartData);
        chartRef.current.timeScale().fitContent();
        
        // Force a redraw of the chart
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
        
        console.log("Chart data set and fitted successfully");
      } else {
        console.error("Chart or series not initialized");
        initChart(); // Re-initialize the chart if it's not available
        if (seriesRef.current) {
          seriesRef.current.setData(chartData);
          chartRef.current.timeScale().fitContent();
        }
      }

      // Fetch tweets
      console.log(`Initiating tweet fetch for token address: ${tokenAddress}`);
      let newTweets = [];
      try {
        const tweetResponse = await axios.post('http://localhost:3001/api/tweets', { query: tokenAddress });
        console.log('Tweet response received:', tweetResponse);
        console.log(`Received ${tweetResponse.data.length} tweets from the server`);
        newTweets = tweetResponse.data;
        console.log('Tweets data:', JSON.stringify(newTweets, null, 2));
      } catch (tweetError) {
        console.error('Error fetching tweets:', tweetError);
        setError(prevError => prevError ? `${prevError}. Failed to fetch tweets.` : 'Failed to fetch tweets.');
      }

      return { chartData, newTweets };
    } catch (err) {
      console.error("Error in fetchData:", err);
      setError(`Failed to fetch data: ${err.message}`);
      return { chartData: [], newTweets: [] };
    } finally {
      setLoading(false);
    }
  };

  const getTimeframeSeconds = (timeframe) => {
    switch (timeframe) {
      case '1H': return 7 * 24 * 60 * 60; // 7 days
      case '4H': return 30 * 24 * 60 * 60; // 30 days
      case '1D': return 365 * 24 * 60 * 60; // 365 days
      default: return 30 * 24 * 60 * 60; // Default to 30 days
    }
  };

  const getCountback = (timeframe) => {
    switch (timeframe) {
      case '1H': return 168; // 7 days * 24 hours
      case '4H': return 180; // 30 days * 6 (4-hour periods per day)
      case '1D': return 365; // 365 days
      default: return 30; // Default to 30 days
    }
  };

  const handleSearch = async () => {
    console.log("Search button clicked");
    if (!searchQuery) {
      console.log("Search query is empty, not fetching");
      return;
    }
    setTweets([]); // Clear existing tweets
    if (seriesRef.current) {
      seriesRef.current.setMarkers([]); // Clear existing markers
    }
    console.log(`Initiating search for token: ${searchQuery}, timeframe: ${timeframe}`);
    const { chartData, newTweets } = await fetchData(searchQuery, timeframe);
    
    console.log("Chart data received:", chartData);
    console.log("Tweets received:", newTweets);
  
    if (chartData && chartData.length > 0) {
      if (seriesRef.current) {
        seriesRef.current.setData(chartData);
        updateChartVisibleRange(chartData);
      } else {
        console.error("Series reference is not available");
      }
    }
  
    if (newTweets && newTweets.length > 0) {
      console.log("Processing tweets for markers");
      
      setTweets(newTweets); // Set new tweets
      
      const tweetMarkers = createTweetMarkers(newTweets, chartData);
      console.log("Created tweet markers:", tweetMarkers);
      
      if (seriesRef.current) {
        console.log("Setting markers on the chart");
        seriesRef.current.setMarkers(tweetMarkers);
        console.log("Markers set on the chart");
      } else {
        console.error("Series reference is not available");
      }
    } else {
      console.log("No tweets found or tweets array is empty");
    }

    await fetchTokenInfo(searchQuery);
  };

  const createTweetMarkers = (tweets, chartData) => {
    if (!chartData || chartData.length === 0) {
      console.error("Chart data is empty or undefined");
      return [];
    }

    const chartStartTime = chartData[0].time;
    const chartEndTime = chartData[chartData.length - 1].time;

    // Group tweets by candlestick
    const groupedTweets = tweets.reduce((acc, tweet) => {
      const tweetTime = Math.floor(new Date(tweet.timestamp).getTime() / 1000);
      if (tweetTime >= chartStartTime && tweetTime <= chartEndTime) {
        const candleIndex = chartData.findIndex(candle => candle.time > tweetTime) - 1;
        if (candleIndex >= 0) {
          if (!acc[candleIndex]) acc[candleIndex] = [];
          acc[candleIndex].push(tweet);
        }
      }
      return acc;
    }, {});

    // Create markers for grouped tweets
    const markers = Object.entries(groupedTweets).map(([index, tweets]) => ({
      time: chartData[index].time,
      position: 'aboveBar',
      color: '#2196F3',
      shape: 'circle',
      size: Math.min(3, 1 + Math.log(tweets.length)),
      tweets: tweets, // Include the tweets in the marker data
    })).sort((a, b) => a.time - b.time);

    console.log("Created markers:", markers);
    return markers;
  };
  
  const updateChartVisibleRange = (chartData) => {
    if (chartData.length > 0 && chartRef.current) {
      const firstDataTime = chartData[0].time;
      const lastDataTime = chartData[chartData.length - 1].time;
      chartRef.current.timeScale().setVisibleRange({
        from: firstDataTime,
        to: lastDataTime
      });
    }
  };

  const fetchChartData = async (tokenAddress, timeframe) => {
    try {
      setLoading(true);
      setError(null);
      // Fetch chart data here (implement this part based on your API)
      // Update the chart with new data
    } catch (err) {
      console.error("Error in fetchChartData:", err);
      setError(`Failed to fetch chart data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addCustomTooltip = () => {
    const toolTip = document.createElement('div');
    toolTip.style = `
      position: absolute;
      display: none;
      padding: 12px;
      box-sizing: border-box;
      font-size: 14px;
      text-align: left;
      z-index: 1000;
      pointer-events: auto;
      border-radius: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background: rgba(255, 255, 255, 0.8);
      color: #14171a;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
      width: 300px;
      max-height: 300px;
    `;
    chartContainerRef.current.appendChild(toolTip);

    chartRef.current.subscribeClick(param => {
      if (param.time && seriesRef.current) {
        const markers = seriesRef.current.markers();
        const clickedMarker = markers.find(marker => marker.time === param.time);

        if (clickedMarker && clickedMarker.tweets) {
          let content = '<div style="max-height: 280px; overflow-y: auto; padding-right: 10px;">';
          clickedMarker.tweets.forEach(tweet => {
            content += `
              <div style="border-bottom: 1px solid #e1e8ed; padding: 10px 0;">
                <strong style="color: #1da1f2;">${tweet.username}</strong>
                <span style="color: #657786;"> @${tweet.username}</span>
                <p style="margin: 5px 0;">${tweet.text}</p>
                <small style="color: #657786;">${new Date(tweet.timestamp).toLocaleString()}</small>
              </div>
            `;
          });
          content += '</div>';
          toolTip.innerHTML = content;
          toolTip.style.display = 'block';

          // Position the tooltip closer to the chart
          const chartRect = chartContainerRef.current.getBoundingClientRect();
          const xPosition = param.point.x + chartRect.left;
          const yPosition = param.point.y + chartRect.top - 10; // Slightly above the clicked point
          
          toolTip.style.left = `${xPosition}px`;
          toolTip.style.top = `${yPosition}px`;
          
          // Ensure the tooltip doesn't go off-screen
          const tooltipRect = toolTip.getBoundingClientRect();
          if (tooltipRect.right > window.innerWidth) {
            toolTip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
          }
          if (tooltipRect.bottom > window.innerHeight) {
            toolTip.style.top = `${window.innerHeight - tooltipRect.height - 10}px`;
          }
        } else {
          toolTip.style.display = 'none';
        }
      } else {
        toolTip.style.display = 'none';
      }
    });
  };

  const fetchTokenInfo = async (tokenAddress) => {
    try {
      const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
      const data = response.data;
      if (data.pairs && data.pairs.length > 0) {
        // Sort pairs by FDV (Fully Diluted Valuation) in descending order
        const sortedPairs = data.pairs.sort((a, b) => b.fdv - a.fdv);
        const highestFdvPair = sortedPairs[0];
        
        setTokenInfo({
          name: highestFdvPair.baseToken.name,
          symbol: highestFdvPair.baseToken.symbol,
          priceUsd: highestFdvPair.priceUsd,
          fdv: highestFdvPair.fdv,
          volume24h: highestFdvPair.volume.h24,
          liquidity: highestFdvPair.liquidity.usd,
          priceChange24h: highestFdvPair.priceChange.h24,
          imageUrl: highestFdvPair.info?.imageUrl
        });
      } else {
        setError("No token information found");
      }
    } catch (err) {
      console.error("Error fetching token info:", err);
      setError(`Failed to fetch token info: ${err.message}`);
    }
  };

  const TokenInfo = ({ info }) => {
    if (!info) return null;

    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            {info.imageUrl && <img src={info.imageUrl} alt={info.name} className="w-6 h-6 mr-2" />}
            {info.name} ({info.symbol})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold">Price:</p>
              <p>${parseFloat(info.priceUsd).toFixed(6)}</p>
            </div>
            <div>
              <p className="font-semibold">24h Change:</p>
              <p className={info.priceChange24h >= 0 ? "text-green-500" : "text-red-500"}>
                {info.priceChange24h.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="font-semibold">24h Volume:</p>
              <p>${info.volume24h.toLocaleString()}</p>
            </div>
            <div>
              <p className="font-semibold">Liquidity:</p>
              <p>${info.liquidity.toLocaleString()}</p>
            </div>
            <div>
              <p className="font-semibold">Fully Diluted Valuation:</p>
              <p>${info.fdv.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Token Chart Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-4">
            <Input
              type="text"
              placeholder="Enter token contract address"
              value={searchQuery}
              onChange={(e) => {
                console.log("Search query changed:", e.target.value);
                setSearchQuery(e.target.value);
              }}
              className="flex-grow"
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="mr-2 h-4 w-4" /> {loading ? 'Loading...' : 'Search'}
            </Button>
          </div>
          <div className="flex space-x-2">
            {['1H', '4H', '1D'].map((tf) => (
              <Button
                key={tf}
                onClick={() => {
                  setTimeframe(tf);
                  if (searchQuery) fetchChartData(searchQuery, tf);
                }}
                variant={timeframe === tf ? 'default' : 'outline'}
              >
                {tf}
              </Button>
            ))}
          </div>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </CardContent>
      </Card>

      <TokenInfo info={tokenInfo} />

      <Card>
        <CardHeader>
          <CardTitle>Token Price Chart ({timeframe})</CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={chartContainerRef} style={{ height: '400px', width: '100%' }} />
        </CardContent>
      </Card>

      <TweetList tweets={tweets} />
    </div>
  );
}

export default App;