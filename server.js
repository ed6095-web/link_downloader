import express from 'express';
import cors from 'cors';
import { getVideoInfo } from './utils/ytDlpHelper.js';

// --- Configuration ---
const PORT = process.env.PORT || 3001; // Use environment variable or default to 3001

// --- Express App Setup ---
const app = express();

// --- Middlewares ---
// 1. Enable CORS for all routes and origins
app.use(cors()); // For production, configure specific origins: app.use(cors({ origin: 'https://yourfrontenddomain.com' }));

// 2. Enable JSON body parsing for POST requests
app.use(express.json());

// 3. Enable URL-encoded body parsing (optional, but good practice)
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
// Welcome route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Droporia Backend API is up and running! 🚀' });
});

// API endpoint to fetch video information
app.post('/api/video-info', async (req, res) => {
  const { url: videoUrl } = req.body;

  // 1. Basic URL validation
  if (!videoUrl) {
    return res.status(400).json({ success: false, error: 'Video URL is required in the request body.' });
  }
  try {
    // A more robust URL validation can be added here (e.g., using a regex or a library)
    new URL(videoUrl); // Basic check if it's a parsable URL
  } catch (error) {
    return res.status(400).json({ success: false, error: 'Invalid URL format provided.' });
  }

  console.log(`[API] Received request for URL: ${videoUrl}`);

  try {
    // 2. Use yt-dlp to fetch video info
    const videoDetails = await getVideoInfo(videoUrl);
    console.log(`[API] Successfully fetched info for: ${videoUrl}`);
    return res.status(200).json({ success: true, data: videoDetails });
  } catch (error) {
    console.error(`[API] Error processing URL ${videoUrl}:`, error.message);
    // 3. Handle errors gracefully
    let statusCode = 500;
    let errorMessage = 'An unexpected error occurred while fetching video information.';

    if (error.message.includes('Unsupported URL')) {
      statusCode = 400;
      errorMessage = 'Unsupported URL. Please provide a valid video link from a supported platform.';
    } else if (error.message.includes('Unable to extract video data') || error.message.includes('No video formats found')) {
      statusCode = 404;
      errorMessage = 'Could not find video data or formats for the provided URL. It might be private, deleted, or from an unsupported source.';
    } else if (error.message.includes('yt-dlp process failed')) {
        statusCode = 503; // Service Unavailable
        errorMessage = 'The video processing service (yt-dlp) failed. Please try again later.';
    } else if (error.message.toLowerCase().includes('yt-dlp command not found') || error.message.toLowerCase().includes('no such file or directory')) {
        statusCode = 500; // Internal Server Error - configuration issue
        errorMessage = 'Server configuration error: yt-dlp command not found. Please ensure it is installed and in the system PATH.';
    }
    // Add more specific error checks based on yt-dlp output if needed

    return res.status(statusCode).json({ success: false, error: errorMessage, details: error.message });
  }
});

// --- Global Error Handler (Optional, for unhandled routes) ---
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: 'API endpoint not found.' });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Droporia Backend API listening on http://localhost:${PORT}`);
  console.log('--------------------------------------------------');
  console.log('Make sure yt-dlp is installed and in your system PATH.');
  console.log('You can install it via: pip install yt-dlp');
  console.log('Or download the binary from the official yt-dlp GitHub page.');
  console.log('--------------------------------------------------');
});