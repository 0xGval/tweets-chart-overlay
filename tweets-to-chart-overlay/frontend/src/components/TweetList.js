import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const TweetList = ({ tweets }) => {
  // Sort tweets from oldest to newest
  const sortedTweets = [...tweets].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Recent Tweets (Oldest to Newest)</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedTweets.map((tweet, index) => (
          <div key={index} className="mb-4 p-4 border rounded">
            <p className="font-bold">{tweet.username}</p>
            <p>{tweet.text}</p>
            <p className="text-sm text-gray-500">{new Date(tweet.timestamp).toLocaleString()}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default TweetList;