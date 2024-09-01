// Function to remove duplicate tweets based on text similarity
function removeDuplicateTweets(tweets) {
    const uniqueTweets = [];
    const seenTexts = new Set();

    for (const tweet of tweets) {
        // Normalize the tweet text by converting to lowercase and removing URLs
        const normalizedText = tweet.text.toLowerCase().replace(/https?:\/\/\S+/g, '').trim();
        
        // Check if we've seen a similar tweet
        let isDuplicate = false;
        for (const seenText of seenTexts) {
            if (similarity(normalizedText, seenText) > 0.9) {
                isDuplicate = true;
                break;
            }
        }

        if (!isDuplicate) {
            seenTexts.add(normalizedText);
            uniqueTweets.push(tweet);
        }
    }

    return uniqueTweets;
}

// Function to calculate the similarity between two strings
function similarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    const longerLength = longer.length;
    if (longerLength === 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

// Function to calculate the edit distance (Levenshtein distance) between two strings
function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    const costs = new Array();
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0)
                costs[j] = j;
            else {
                if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue),
                            costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0)
            costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

// Function to format a tweet object for logging purposes
function formatTweetForLogging(tweet) {
    return `
    Username: ${tweet.username}
    Text: ${tweet.text}
    Timestamp: ${new Date(tweet.timestamp).toLocaleString()}
    Likes: ${tweet.likes}
    Retweets: ${tweet.retweets}
    Replies: ${tweet.replies}
    ID: ${tweet.id}
    Conversation ID: ${tweet.conversationId}
    Hashtags: ${tweet.hashtags.join(', ')}
    Mentions: ${tweet.mentions.join(', ')}
    URLs: ${tweet.urls.join(', ')}
    Photos: ${tweet.photos.length}
    Videos: ${tweet.videos.length}
    Is Retweet: ${tweet.isRetweet}
    Is Quoted: ${tweet.isQuoted}
    Is Reply: ${tweet.isReply}
    `;
}

module.exports = { removeDuplicateTweets, similarity, editDistance, formatTweetForLogging };