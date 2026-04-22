// ====== CONFIGURATION ======
// IMPORTANT: Replace this with your actual Spotify Client ID from the Developer Dashboard
const CLIENT_ID = '6e3c8d68fdf94f2ebe2b5c847b4f6772';
// The URL where this app is hosted (use http://127.0.0.1:8080/ for local dev, or your Vercel/GitHub pages URL for the final APK)
const REDIRECT_URI = window.location.href.split('#')[0].split('?')[0];
const SCOPES = 'user-read-currently-playing user-read-playback-state user-modify-playback-state';

let accessToken = null;
let currentTrackId = null;
let currentIsPlaying = null;

// ====== UI ELEMENTS ======
const loginOverlay = document.getElementById('login-overlay');
const loginButton = document.getElementById('login-button');
const albumArt = document.getElementById('album-art');
const backgroundImage = document.getElementById('background-image');
const titleText = document.getElementById('title-text');
const artistText = document.getElementById('artist-text');
const titleWrapper = document.getElementById('title-wrapper');
const artistWrapper = document.getElementById('artist-wrapper');
const titleContainer = document.getElementById('title-container');
const artistContainer = document.getElementById('artist-container');
const contentContainer = document.getElementById('content-container');
const swipeOverlay = document.getElementById('swipe-transition-overlay');

// ====== AUTHENTICATION ======
// PKCE Helpers
async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
}

function base64encode(input) {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
}

function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

async function checkAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    let code = urlParams.get('code');
    
    const scopeVersion = localStorage.getItem('auth_scope_version');
    if (scopeVersion !== '2') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.setItem('auth_scope_version', '2');
    }
    
    accessToken = localStorage.getItem('access_token');

    if (code) {
        let codeVerifier = localStorage.getItem('code_verifier');
        const payload = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: CLIENT_ID,
              grant_type: 'authorization_code',
              code: code,
              redirect_uri: REDIRECT_URI,
              code_verifier: codeVerifier,
            }),
        }

        try {
            const tokenResponse = await fetch("https://accounts.spotify.com/api/token", payload);
            const tokenData = await tokenResponse.json();

            if (tokenData.access_token) {
                accessToken = tokenData.access_token;
                localStorage.setItem('access_token', accessToken);
                if (tokenData.refresh_token) {
                    localStorage.setItem('refresh_token', tokenData.refresh_token);
                }
                window.history.replaceState({}, document.title, window.location.pathname);
                loginOverlay.style.display = 'none';
                startPolling();
                return;
            }
        } catch (e) {
            console.error("Token exchange failed", e);
        }
    } 
    
    if (accessToken) {
        loginOverlay.style.display = 'none';
        startPolling();
    } else {
        loginOverlay.style.display = 'flex';
    }
}

loginButton.addEventListener('click', async () => {
    if (CLIENT_ID === 'YOUR_SPOTIFY_CLIENT_ID_HERE') {
        alert('Please edit app.js to insert your Spotify Client ID first!');
        return;
    }
    
    const codeVerifier = generateRandomString(64);
    window.localStorage.setItem('code_verifier', codeVerifier);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    const authUrl = new URL("https://accounts.spotify.com/authorize");
    const params =  {
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      redirect_uri: REDIRECT_URI,
    };
    
    authUrl.search = new URLSearchParams(params).toString();
    window.location.href = authUrl.toString();
});

// ====== API POLLING ======
async function refreshToken() {
    const refresh_token = localStorage.getItem('refresh_token');
    if (!refresh_token) {
        localStorage.removeItem('access_token');
        window.location.reload();
        return false;
    }

    const payload = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: 'refresh_token',
          refresh_token: refresh_token,
        }),
    };

    try {
        const response = await fetch("https://accounts.spotify.com/api/token", payload);
        const data = await response.json();
        if (data.access_token) {
            accessToken = data.access_token;
            localStorage.setItem('access_token', accessToken);
            if (data.refresh_token) {
                localStorage.setItem('refresh_token', data.refresh_token);
            }
            return true;
        }
    } catch (e) {
        console.error("Error refreshing token", e);
    }
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.reload();
    return false;
}

async function startPolling() {
    fetchNowPlaying(); // fetch immediately
    setInterval(fetchNowPlaying, 5000); // then every 5 seconds
}

async function fetchNowPlaying() {
    if (!accessToken) return;

    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.status === 204) {
            // 204 means nothing is playing right now
            if (currentTrackId !== 'none' || currentIsPlaying !== false) {
                currentTrackId = 'none';
                currentIsPlaying = false;
                updateUI('Nothing playing', '', null, false);
            }
            return;
        }

        if (response.status === 401) {
            // Token expired
            const refreshed = await refreshToken();
            if (refreshed) {
                fetchNowPlaying();
            }
            return;
        }

        const data = await response.json();

        if (data && data.item) {
            const isPlaying = data.is_playing;
            const trackName = data.item.name;
            const artistName = data.item.artists.map(a => a.name).join(', ');
            let imageUrl = null;
            if (data.item.album && data.item.album.images.length > 0) {
                imageUrl = data.item.album.images[0].url;
            }

            if (data.item.id !== currentTrackId || isPlaying !== currentIsPlaying) {
                currentTrackId = data.item.id;
                currentIsPlaying = isPlaying;
                updateUI(trackName, artistName, imageUrl, isPlaying);
                
                fadeOutSwipeTransition();
            }
        }
    } catch (e) {
        console.error("Error fetching Spotify data", e);
    }
}


function updateUI(title, artist, imageUrl, isPlaying) {
    if (title === 'Nothing playing' || isPlaying === false) {
        contentContainer.style.display = 'none';
        backgroundImage.style.display = 'none';
        return; // Skip rest of updates to leave it black
    } else {
        contentContainer.style.display = '';
        backgroundImage.style.display = '';
    }

    titleText.innerText = title;
    artistText.innerText = artist;

    if (imageUrl) {
        albumArt.src = imageUrl;
        albumArt.parentElement.style.opacity = "1";
        backgroundImage.src = imageUrl;
    } else {
        albumArt.parentElement.style.opacity = "0";
        albumArt.src = '';
        backgroundImage.src = '';
    }

    // Reset animations
    setupMarquee(titleContainer, titleWrapper, titleText);
    setupMarquee(artistContainer, artistWrapper, artistText);
}

// ====== MARQUEE LOGIC ======
function setupMarquee(container, wrapper, textElement) {
    // Cancel any running animations to prevent ghost scrolling
    if (currentAnimations.has(wrapper)) {
        const anim = currentAnimations.get(wrapper);
        if (anim.type === 'timeout') clearTimeout(anim.id);
        if (anim.type === 'frame') cancelAnimationFrame(anim.id);
        currentAnimations.delete(wrapper);
    }

    // Remove any cloned elements completely
    while (wrapper.children.length > 1) {
        wrapper.removeChild(wrapper.lastChild);
    }

    wrapper.style.transform = 'translate3d(0px, 0, 0)';
    wrapper.style.transition = 'none';

    // Measure
    const containerWidth = container.offsetWidth;
    const textWidth = textElement.offsetWidth - 60; // Subtract the 60px padding added in CSS

    // Determine if we need to scroll
    if (textWidth > containerWidth && containerWidth > 0) {
        // Clone for seamless loop
        const clone = textElement.cloneNode(true);
        wrapper.appendChild(clone);

        // Animate using JS for precise pausing
        animateMarquee(wrapper, textElement.offsetWidth);
    } else {
        // Center text in portrait mode physically if it fits
        const isPortrait = window.matchMedia("(max-aspect-ratio: 3/4)").matches;
        if (isPortrait && containerWidth > 0) {
            const offset = (containerWidth - textWidth) / 2;
            if (offset > 0) {
                wrapper.style.transform = `translate3d(${offset}px, 0, 0)`;
            }
        }
    }
}

// Store active animations
const currentAnimations = new Map();

function animateMarquee(wrapper, scrollWidth) {
    if (currentAnimations.has(wrapper)) {
        const anim = currentAnimations.get(wrapper);
        if (anim.type === 'timeout') clearTimeout(anim.id);
        if (anim.type === 'frame') cancelAnimationFrame(anim.id);
    }

    // Constants to match WPF app
    const initialDelay = 5000;
    const pixelsPerFrame = 0.8;

    let currentX = 0;
    let lastTime = 0;

    function step(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const delta = timestamp - lastTime;
        lastTime = timestamp;
        
        // Scale movement by delta time to keep speed consistent regardless of refresh rate
        const speedMultiplier = delta / 16.66;
        currentX -= (pixelsPerFrame * speedMultiplier);

        if (-currentX >= scrollWidth) {
            // Reset to beginning and pause
            currentX = 0;
            wrapper.style.transform = `translate3d(0px, 0, 0)`;
            lastTime = 0;
            const timeoutId = setTimeout(() => {
                const frameId = requestAnimationFrame(step);
                currentAnimations.set(wrapper, { type: 'frame', id: frameId });
            }, initialDelay);
            currentAnimations.set(wrapper, { type: 'timeout', id: timeoutId });
        } else {
            wrapper.style.transform = `translate3d(${currentX}px, 0, 0)`;
            const frameId = requestAnimationFrame(step);
            currentAnimations.set(wrapper, { type: 'frame', id: frameId });
        }
    }

    // Start with delay
    wrapper.style.transform = `translate3d(0px, 0, 0)`;
    const timeoutId = setTimeout(() => {
        const frameId = requestAnimationFrame(step);
        currentAnimations.set(wrapper, { type: 'frame', id: frameId });
    }, initialDelay);
    currentAnimations.set(wrapper, { type: 'timeout', id: timeoutId });
}

// Handle resizing
window.addEventListener('resize', () => {
    if (titleText.innerText !== "Waiting for Spotify...") {
        setupMarquee(titleContainer, titleWrapper, titleText);
        setupMarquee(artistContainer, artistWrapper, artistText);
    }
});

// Run auth check on load
checkAuth();

// ====== INTERACTION AND PLAYBACK CONTROL ======
function fadeOutSwipeTransition() {
    if (isProcessingSwipe) {
        swipeOverlay.style.transition = 'opacity 0.3s ease-out';
        swipeOverlay.style.opacity = '0';
        isProcessingSwipe = false;
        
        // Reset transform after fade out so it's ready for next swipe
        setTimeout(() => {
            if (swipeOverlay.style.opacity === '0') {
                swipeOverlay.style.transition = 'none';
                swipeOverlay.style.transform = 'translateX(100%)';
            }
        }, 300);
    }
}

async function spotifyAction(endpoint, method = 'POST') {
    if (!accessToken) return;
    try {
        const response = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
            method: method,
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) spotifyAction(endpoint, method);
            return;
        }
        if (response.status === 403 || response.status === 404) {
            console.log(`Action ${endpoint} failed. Note: Spotify requires an active device and Spotify Premium for remote control.`);
        }
        // Force an immediate poll to update UI visually
        setTimeout(fetchNowPlaying, 500); 
    } catch (e) {
        console.error("Playback action failed", e);
    }
}

function togglePlayPause() {
    if (currentIsPlaying === null) return;
    if (currentIsPlaying) {
        spotifyAction('pause', 'PUT');
        currentIsPlaying = false; 
        updateUI(titleText.innerText, artistText.innerText, backgroundImage.src, false);
    } else {
        spotifyAction('play', 'PUT');
        currentIsPlaying = true;
        updateUI(titleText.innerText, artistText.innerText, backgroundImage.src, true);
    }
}

let touchStartX = 0;
let touchStartY = 0;
let touchTime = 0;
let lastTouchEnd = 0;
let isDragging = false;
let isProcessingSwipe = false;
let touchSwipeDirection = null;

document.addEventListener('touchstart', (e) => {
    if (loginOverlay.style.display !== 'none' || isProcessingSwipe) return;
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    touchTime = Date.now();
    isDragging = true;
    touchSwipeDirection = null;
    
    swipeOverlay.style.transition = 'none';
    swipeOverlay.style.opacity = '1';
});

document.addEventListener('touchmove', (e) => {
    if (!isDragging || isProcessingSwipe) return;
    
    const currentX = e.changedTouches[0].screenX;
    const currentY = e.changedTouches[0].screenY;
    const diffX = currentX - touchStartX;
    const diffY = currentY - touchStartY;
    
    if (!touchSwipeDirection) {
        if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
            touchSwipeDirection = Math.abs(diffX) > Math.abs(diffY) ? 'horizontal' : 'vertical';
        }
    }
    
    if (touchSwipeDirection === 'horizontal') {
        if (diffX > 0) {
            // Dragging right, so overlay comes from left edge
            swipeOverlay.style.transform = `translateX(calc(-100% + ${diffX}px))`;
        } else {
            // Dragging left, so overlay comes from right edge
            swipeOverlay.style.transform = `translateX(calc(100% + ${diffX}px))`;
        }
    }
});

document.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    lastTouchEnd = Date.now();
    
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    const time = Date.now() - touchTime;
    
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
        isProcessingSwipe = true;
        swipeOverlay.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        swipeOverlay.style.transform = 'translateX(0)';
        
        if (diffX > 0) {
            spotifyAction('previous'); 
        } else {
            spotifyAction('next');
        }
        
        setTimeout(() => {
            if (isProcessingSwipe) {
                fadeOutSwipeTransition();
            }
        }, 3000);
    } else {
        if (Math.abs(diffX) > 10) {
            swipeOverlay.style.transition = 'transform 0.3s ease-out';
            if (diffX > 0) {
                swipeOverlay.style.transform = 'translateX(-100%)';
            } else {
                swipeOverlay.style.transform = 'translateX(100%)';
            }
            setTimeout(() => {
                if (!isProcessingSwipe) swipeOverlay.style.opacity = '0';
            }, 300);
        } else {
            swipeOverlay.style.opacity = '0';
            swipeOverlay.style.transform = 'translateX(100%)';
            if (time < 300) togglePlayPause();
        }
    }
});

// For PC testing or generic taps not caught by touch events
document.addEventListener('click', (e) => {
    if (loginOverlay.style.display !== 'none') return;
    if (Date.now() - lastTouchEnd < 500) return; // Prevent ghost clicks from touch firing twice
    
    togglePlayPause();
});
