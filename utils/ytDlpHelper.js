// video-downloader/backend/utils/ytDlpHelper.js

import * as ytdlpWrapAll from 'yt-dlp-wrap';

// Attempt to get the actual constructor function:
// Based on the logs, ytdlpWrapAll.default is an object like { default: [Function: Constructor] }
// So, the actual constructor is (ytdlpWrapAll.default).default
let ActualYTDlpWrapConstructor;
if (ytdlpWrapAll.default && typeof ytdlpWrapAll.default.default === 'function') {
    ActualYTDlpWrapConstructor = ytdlpWrapAll.default.default;
} else if (typeof ytdlpWrapAll.default === 'function') { // Fallback if .default itself was the constructor
    ActualYTDlpWrapConstructor = ytdlpWrapAll.default;
} else if (typeof ytdlpWrapAll === 'function') { // Fallback if the entire module was the constructor
    ActualYTDlpWrapConstructor = ytdlpWrapAll;
}


let ytDlpWrapInstance;
try {
    console.log('[ytDlpHelper] Attempting to initialize YTDlpWrap.');
    
    if (typeof ActualYTDlpWrapConstructor !== 'function') {
        console.error('[ytDlpHelper] ActualYTDlpWrapConstructor is NOT a function after import attempts.');
        console.error('[ytDlpHelper] Value of ActualYTDlpWrapConstructor:', ActualYTDlpWrapConstructor);
        console.error('[ytDlpHelper] Value of ytdlpWrapAll (the entire module import * as ...):', ytdlpWrapAll);
        throw new TypeError('YTDlpWrap constructor could not be resolved correctly. Check import method and library structure.');
    }
    
    console.log('[ytDlpHelper] Initializing with ActualYTDlpWrapConstructor.');
    ytDlpWrapInstance = new ActualYTDlpWrapConstructor();

    console.log('[ytDlpHelper] YTDlpWrap instance created successfully.');

} catch (error) {
    console.error("[ytDlpHelper] Failed to initialize YTDlpWrap. Ensure yt-dlp CLI is installed and accessible in PATH.", error);
}


/**
 * Fetches video information using yt-dlp.
 * @param {string} videoUrl The URL of the video.
 * @returns {Promise<object>} A promise that resolves to an object containing video details.
 */
export const getVideoInfo = async (videoUrl) => {
  if (!ytDlpWrapInstance) {
    console.error("[ytDlpHelper] YTDlpWrap instance is not available. yt-dlp might not be configured correctly or failed to initialize.");
    throw new Error("yt-dlp service not available. Initialization failed. Ensure yt-dlp CLI is installed and in system PATH.");
  }
  console.log(`[ytDlpHelper] Fetching info for: ${videoUrl}`);
  try {
    const metadata = await ytDlpWrapInstance.getVideoInfo(videoUrl);

    const videoDetails = {
      title: metadata.title || 'N/A',
      thumbnail_url: metadata.thumbnail || null,
      uploader: metadata.uploader || 'N/A',
      duration: metadata.duration || 0,
      duration_string: metadata.duration_string || 'N/A',
      view_count: metadata.view_count || 0,
      original_url: metadata.webpage_url || videoUrl,
      formats: [],
    };

    if (metadata.formats && Array.isArray(metadata.formats)) {
      videoDetails.formats = metadata.formats
        .filter(f => f.url)
        .map(format => ({
          format_id: format.format_id,
          ext: format.ext,
          resolution: format.resolution || (format.height ? `${format.width || '?'}x${format.height}` : 'audio only'),
          quality_note: format.format_note || 'N/A',
          fps: format.fps || null,
          filesize: format.filesize || format.filesize_approx || null,
          filesize_string: format.filesize ? formatBytes(format.filesize) : (format.filesize_approx ? `${formatBytes(format.filesize_approx)} (approx)` : 'N/A'),
          vcodec: format.vcodec,
          acodec: format.acodec,
          url: format.url,
          protocol: format.protocol,
          is_audio_only: format.vcodec === 'none' && format.acodec !== 'none',
          is_video_only: format.vcodec !== 'none' && format.acodec === 'none',
        }))
        .sort((a, b) => {
            const typeA = a.is_audio_only ? 2 : (a.is_video_only ? 1 : 0);
            const typeB = b.is_audio_only ? 2 : (b.is_video_only ? 1 : 0);
            if (typeA !== typeB) return typeA - typeB;
            if (!a.is_audio_only && !b.is_audio_only) {
                 const heightA = parseInt(a.resolution?.split('x')[1] || 0);
                 const heightB = parseInt(b.resolution?.split('x')[1] || 0);
                 if (heightB !== heightA) return heightB - heightA;
            }
            return 0;
        });
    } else {
      console.warn(`[ytDlpHelper] No formats array found in metadata for ${videoUrl}`);
    }

    if (videoDetails.formats.length === 0 && metadata.formats && metadata.formats.length > 0) {
        console.warn(`[ytDlpHelper] No formats with direct URLs found for ${videoUrl} after filtering, though ${metadata.formats.length} raw formats were present.`);
    } else if (videoDetails.formats.length === 0) {
        console.warn(`[ytDlpHelper] No downloadable formats found for ${videoUrl}.`);
    }

    console.log(`[ytDlpHelper] Successfully processed: ${videoUrl}, found ${videoDetails.formats.length} filtered formats.`);
    return videoDetails;

  } catch (error) {
    console.error(`[ytDlpHelper] Error executing yt-dlp for URL "${videoUrl}":`, error.message || error);
    let detailedErrorMessage = 'Failed to fetch video information using yt-dlp.';
    // ... (rest of the error handling logic from before)
    if (error.message) {
        if (error.message.toLowerCase().includes('unsupported url')) {
            detailedErrorMessage = 'Unsupported URL.';
        } else if (error.message.toLowerCase().includes('private video') || error.message.toLowerCase().includes('video unavailable')) {
            detailedErrorMessage = 'Video is private or unavailable.';
        } else if (error.message.toLowerCase().includes('no such file or directory') || error.message.toLowerCase().includes('command not found')) {
            detailedErrorMessage = 'yt-dlp command not found. Ensure it is installed and in your system PATH.';
        } else if (error.message.toLowerCase().includes('unable to extract video data') || error.message.toLowerCase().includes('no video formats found')) {
            detailedErrorMessage = 'Unable to extract video data or no video formats found for the URL.';
        } else {
            const ytDlpErrorSnippet = error.message.split('\n')[0];
            detailedErrorMessage = `yt-dlp process failed: ${ytDlpErrorSnippet}`;
        }
    }
    throw new Error(detailedErrorMessage);
  }
};

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0 || !bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}