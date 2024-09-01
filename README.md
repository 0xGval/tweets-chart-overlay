# Token Chart Twitter Analyzer

This project is a web application that allows users to search for token-related tweets, view token price charts, and overlay tweets on the chart based on their timestamps.

## Important Notes

> **⚠️ Important Notes:**
> 1. **Use a burner Twitter account** for scraping token-related tweets.
> 2. **Implement proxy rotation** to avoid IP bans and other issues.
> 3. **Disclaimer:** I am not responsible for any loss you may incur using this product.


![image](https://github.com/user-attachments/assets/2e1d91a3-9c98-478d-9184-89d987b21480)


## Features

- Search for tokens using contract addresses
- Display token price charts with multiple timeframes (1H, 4H, 1D)
- Show token information including price, 24h change, volume, liquidity, and fully diluted valuation
- Fetch and display related tweets on the chart

## Project Structure

The project is structured as a monorepo with both frontend and backend in a single repository:

1. **Frontend:** React application in the `frontend` directory
2. **Backend:** Node.js server in the `backend` directory

## Setup

1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/token-chart-twitter-analyzer.git
   cd token-chart-twitter-analyzer
   ```

2. Install dependencies:
   ```sh
   npm run install:all
   ```

3. Set up environment variables:
   - Copy `sample.env` to `.env` in both frontend and backend directories
   - Fill in the required values in each `.env` file

4. Start the backend server:
   ```sh
   npm run start:backend
   ```

5. In a new terminal, start the frontend development server:
   ```sh
   npm run start:frontend
   ```

6. Open your browser and navigate to `http://localhost:3000`

## Environment Variables

### Backend (.env file in the backend directory)

- `TWITTER_USERNAME`: Your Twitter username
- `TWITTER_PASSWORD`: Your Twitter password
- `DEFINED_API_KEY`: Your Defined.fi API key

### Frontend (.env file in the frontend directory)

- `REACT_APP_BACKEND_URL`: URL of your backend server (default: http://localhost:3001)

## API Endpoints

- `POST /api/tweets`: Fetch tweets related to a token
  - Body: `{ "query": "token_address" }`
  - Response: Array of tweet objects

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
