const { Scraper, SearchMode } = require('@the-convocation/twitter-scraper');
const utils = require('./utils');
require('dotenv').config();

const scraper = new Scraper();
let isLoggedIn = false;

// Function to log in to Twitter
async function login() {
    if (!isLoggedIn) {
        try {
            await scraper.login(process.env.TWITTER_USERNAME, process.env.TWITTER_PASSWORD);
            console.log('Logged in to Twitter');
            isLoggedIn = true;
        } catch (error) {
            console.error('Error logging in to Twitter:', error.message);
            throw error;
        }
    }
}

// Function to search Twitter for tweets
async function searchTwitter(query, searchMode = 1, maxTotalTweets = 5000) {
    try {
        console.log(`Searching Twitter for: ${query}`);
        
        await login();

        const searchQuery = query;
        const maxTweetsPerRequest = 100;
        let nextToken = null;
        let allTweets = [];

        let attempts = 0;
        const maxAttempts = 50;

        // Loop to fetch tweets until we reach the maximum or run out of results
        while (allTweets.length < maxTotalTweets && attempts < maxAttempts) {
            console.log(`Fetching tweets with nextToken: ${nextToken}`);
            const response = await scraper.fetchSearchTweets(searchQuery, maxTweetsPerRequest, searchMode, nextToken);
            
            // Check for valid response structure
            if (!response || !response.tweets || !Array.isArray(response.tweets)) {
                console.error('Unexpected response structure:', response);
                break;
            }

            // Map tweet data to a more manageable structure
            const newTweets = response.tweets.map(tweet => ({
                username: tweet.username || 'Unknown',
                text: tweet.text || 'No text available',
                timestamp: tweet.timeParsed ? tweet.timeParsed.getTime() : Date.now(),
                likes: tweet.likes || 0,
                retweets: tweet.retweets || 0,
                replies: tweet.replies || 0,
                id: tweet.id,
                conversationId: tweet.conversationId,
                hashtags: tweet.hashtags || [],
                mentions: tweet.mentions || [],
                urls: tweet.urls || [],
                photos: tweet.photos || [],
                videos: tweet.videos || [],
                isRetweet: tweet.isRetweet || false,
                isQuoted: tweet.isQuoted || false,
                isReply: tweet.isReply || false
            }));

            allTweets = allTweets.concat(newTweets);
            console.log(`Fetched ${newTweets.length} tweets, total: ${allTweets.length}`);

            // Break if no new tweets are found
            if (newTweets.length === 0) {
                console.log('No new tweets found, ending search');
                break;
            }

            // Update the next token for pagination
            if (response.next) {
                nextToken = response.next;
                console.log(`Next token: ${nextToken}`);
            } else {
                console.log('No next token available, ending search');
                break;
            }

            attempts++;

            // Break if we've reached the maximum number of tweets
            if (allTweets.length >= maxTotalTweets) {
                console.log(`Reached maximum number of tweets (${maxTotalTweets}), ending search`);
                break;
            }

            // Wait for 300ms before the next request to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        console.log(`Total tweets before deduplication: ${allTweets.length}`);
        // Remove duplicate tweets
        const uniqueTweets = utils.removeDuplicateTweets(allTweets);
        console.log(`Removed ${allTweets.length - uniqueTweets.length} duplicate tweets`);
        console.log(`Unique tweets after deduplication: ${uniqueTweets.length}`);
        return uniqueTweets.slice(0, maxTotalTweets);
    } catch (error) {
        console.error('Error fetching Twitter results:', error.message);
        return [];
    }
}

module.exports = { searchTwitter, login };