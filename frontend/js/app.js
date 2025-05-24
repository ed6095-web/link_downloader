document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const htmlElement = document.documentElement;
    const themeToggleButton = document.getElementById('theme-toggle');
    const videoUrlInput = document.getElementById('videoUrlInput');
    const fetchInfoButton = document.getElementById('fetchInfoButton');

    const loadingSection = document.getElementById('loading-section');
    const errorSection = document.getElementById('error-section');
    const errorMessageElement = document.getElementById('errorMessage');
    const resultsSection = document.getElementById('results-section');
    const currentYearElement = document.getElementById('currentYear');
    const confettiContainer = document.getElementById('confetti-container');

    // --- API Configuration ---
    const API_BASE_URL = 'http://localhost:3001'; // Your backend server

    // --- Theme Management ---
    let currentTheme = localStorage.getItem('droporia-theme') || 'light';
    applyTheme(currentTheme);

    function applyTheme(theme) {
        htmlElement.classList.remove('light', 'dark');
        htmlElement.classList.add(theme);
        if (themeToggleButton) {
            themeToggleButton.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        }
        localStorage.setItem('droporia-theme', theme);
        currentTheme = theme;
    }

    function toggleTheme() {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    }

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }

    // --- Update Current Year in Footer ---
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }

    // --- Event Listeners ---
    if (fetchInfoButton) {
        fetchInfoButton.addEventListener('click', handleFetchVideoInfo);
    }

    // Optional: Animate input on focus (if CSS :focus isn't enough)
    // if (videoUrlInput) {
    //     videoUrlInput.addEventListener('focus', () => videoUrlInput.parentElement.classList.add('focused'));
    //     videoUrlInput.addEventListener('blur', () => videoUrlInput.parentElement.classList.remove('focused'));
    // }


    // --- Main Fetch Logic ---
    async function handleFetchVideoInfo() {
        const videoUrl = videoUrlInput.value.trim();

        if (!videoUrl) {
            showError('Please paste a video URL. It cannot be empty. 🤔');
            videoUrlInput.focus();
            return;
        }
        try {
            new URL(videoUrl); // Basic URL format validation
        } catch (_) {
            showError('That doesn\'t look like a valid URL. Please check and try again. 🧐');
            videoUrlInput.focus();
            return;
        }

        showLoading(true);
        hideError();
        hideResults(); // Hide previous results before fetching new ones

        try {
            const response = await fetch(`${API_BASE_URL}/api/video-info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: videoUrl }),
            });

            const responseData = await response.json();

            if (!response.ok || !responseData.success) {
                const message = responseData.error || `Server Error: ${response.status}. Please try again.`;
                throw new Error(message);
            }

            displayVideoInfo(responseData.data);
            triggerConfetti(); // Celebrate success!

        } catch (error) {
            console.error('Fetch Error:', error);
            showError(error.message || 'An unknown error occurred. Please check your connection or try a different URL.');
        } finally {
            showLoading(false);
        }
    }

    // --- UI Update Functions ---
    function showLoading(isLoading) {
        loadingSection.classList.toggle('hidden', !isLoading);
    }

    function showError(message) {
        errorMessageElement.textContent = message;
        errorSection.classList.remove('hidden');
        errorSection.classList.add('visible'); // Trigger entry animation
        // Hide results if an error occurs
        hideResults();
    }

    function hideError() {
        errorSection.classList.add('hidden');
        errorSection.classList.remove('visible');
    }

    function hideResults() {
        resultsSection.innerHTML = ''; // Clear previous results content
        resultsSection.classList.add('hidden');
        resultsSection.classList.remove('visible');
    }

    function displayVideoInfo(data) {
        if (!data) {
            showError('No video data received. The response might be empty.');
            return;
        }

        // Clear previous results content before adding new
        resultsSection.innerHTML = '';

        const resultCard = document.createElement('div');
        resultCard.className = 'glass-card result-card'; // Apply card styling

        // Video Title (with simple fade-in effect via CSS on parent)
        const titleElement = document.createElement('h3');
        titleElement.className = 'video-title';
        titleElement.textContent = data.title || 'Untitled Video';
        resultCard.appendChild(titleElement);

        // Thumbnail
        if (data.thumbnail_url) {
            const thumbnailContainer = document.createElement('div');
            thumbnailContainer.className = 'thumbnail-container';
            const thumbnailImg = document.createElement('img');
            thumbnailImg.src = data.thumbnail_url;
            thumbnailImg.alt = `Thumbnail for ${data.title || 'video'}`;
            thumbnailImg.className = 'video-thumbnail';
            thumbnailContainer.appendChild(thumbnailImg);
            resultCard.appendChild(thumbnailContainer);
        }

        // Metadata (Duration, Uploader)
        const metadataDiv = document.createElement('div');
        metadataDiv.className = 'video-metadata';
        if (data.duration_string) {
            const durationItem = document.createElement('p');
            durationItem.className = 'metadata-item';
            durationItem.innerHTML = `<strong><i class="fas fa-clock"></i> Duration:</strong> ${data.duration_string}`;
            metadataDiv.appendChild(durationItem);
        }
        if (data.uploader) {
            const uploaderItem = document.createElement('p');
            uploaderItem.className = 'metadata-item';
            uploaderItem.innerHTML = `<strong><i class="fas fa-user-tag"></i> Uploader:</strong> ${data.uploader}`;
            metadataDiv.appendChild(uploaderItem);
        }
        resultCard.appendChild(metadataDiv);


        // Formats Title
        const formatsTitle = document.createElement('h4');
        formatsTitle.textContent = 'Available Download Formats:';
        formatsTitle.style.marginBottom = '15px';
        resultCard.appendChild(formatsTitle);

        // Download Formats
        const formatsGrid = document.createElement('div');
        formatsGrid.className = 'formats-grid';

        if (data.formats && data.formats.length > 0) {
            data.formats.forEach(format => {
                const formatLink = document.createElement('a');
                formatLink.href = format.url;
                formatLink.className = 'format-button';
                formatLink.target = '_blank'; // Open download in new tab/handler
                // Suggest filename (browser support varies)
                // formatLink.download = `${(data.title || 'video').replace(/[^\w\s.-]/gi, '_')}.${format.ext}`;


                const icon = document.createElement('i');
                icon.className = `fas ${format.is_audio_only ? 'fa-music' : 'fa-video'} format-button-icon`;

                const label = document.createElement('span');
                label.className = 'format-button-label';
                let formatDesc = format.resolution || format.quality_note || format.ext.toUpperCase();
                if (format.is_audio_only) {
                    formatDesc = `${format.ext.toUpperCase()} Audio (${format.quality_note || format.acodec || ''})`;
                } else if (format.is_video_only) {
                    formatDesc += ' (Video Only)';
                }
                label.textContent = formatDesc;

                const size = document.createElement('span');
                size.className = 'format-button-size';
                size.textContent = format.filesize_string || '';

                formatLink.appendChild(icon);
                formatLink.appendChild(label);
                formatLink.appendChild(size);
                formatsGrid.appendChild(formatLink);
            });
        } else {
            const noFormatsMsg = document.createElement('p');
            noFormatsMsg.textContent = 'No downloadable formats found with direct links.';
            noFormatsMsg.style.textAlign = 'center';
            formatsGrid.appendChild(noFormatsMsg);
        }
        resultCard.appendChild(formatsGrid);

        // Append the fully constructed card to the results section
        resultsSection.appendChild(resultCard);

        // Make results section visible with animation
        resultsSection.classList.remove('hidden');
        resultsSection.classList.add('visible');
    }


    // --- Confetti Function ---
    function triggerConfetti() {
        const colors = ['#3498db', '#00ffff', '#9b59b6', '#e74c3c', '#f1c40f', '#2ecc71']; // Accent colors
        for (let i = 0; i < 100; i++) { // Create 100 confetti pieces
            const confettiPiece = document.createElement('div');
            confettiPiece.classList.add('confetti');
            confettiPiece.style.left = Math.random() * 100 + 'vw';
            confettiPiece.style.animationDelay = Math.random() * 0.5 + 's'; // Stagger start
            confettiPiece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confettiPiece.style.transform = `scale(${Math.random() * 0.5 + 0.5})`; // Random size
            // Randomize fall duration slightly for more natural effect
            confettiPiece.style.animationDuration = Math.random() * 2 + 2.5 + 's';


            confettiContainer.appendChild(confettiPiece);

            // Remove confetti after animation to prevent DOM clutter
            setTimeout(() => {
                confettiPiece.remove();
            }, 5000); // Should be longer than animation duration
        }
    }

});