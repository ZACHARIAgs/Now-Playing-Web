# Spotify Now Playing Display

A beautifully responsive, lightweight, and hardware-accelerated "Now Playing" web application for Spotify.

This project was built to transform any unused screen into a stunning aesthetic music display. By running entirely in the browser using HTML, CSS, and Vanilla JavaScript with no backend required, it's incredibly portable. Whether you're displaying it on a secondary PC monitor, mounting an old iPad on the wall, or converting a dusty Android tablet into a smart dashboard, this app will adapt perfectly. 

### Features
**Immersive UI:** A full-screen, perfectly blurred, and infinitely rotating background that adapts automatically to the currently playing album art.  
**Potato Ready:** The animations are heavily optimized using GPU hardware acceleration (`translate3d`), meaning it runs flawlessly and respects battery life even on extremely old hardware.  
**Fully Responsive:** Custom portrait and landscape layout modes. When standing up, the UI stacks beautifully. When flat, it spreads out gracefully.  
**Smart Screen Blackout:** If the music pauses or stops completely, the UI hides itself to preserve battery and fade into the background—lighting up again the second you press play.  
**Self-Contained Auth:** Utilizes Spotify's modern PKCE Authorization Code flow, so users can log in securely on the device without needing a custom server.

## Installation & Setup

Because this is a pure front-end web app, you can host it anywhere (e.g. GitHub Pages, Vercel, or a local server) or wrap it into an Android APK using a PWA builder.

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create a new Web API application.
2. Under "Edit Settings", add your site's URL to the **Redirect URIs** list (e.g., `http://127.0.0.1:5500/` if running locally).
3. Open `app.js` and paste your newly generated **Client ID** into the `CLIENT_ID` variable at the very top.
4. Open the `index.html` file in any browser or deploy the folder to your host of choice!

### Running on a Tablet or Amazon Kindle
This project was originally built explicitly to give an old sitting Amazon Kindle Fire 7 a second life! 
If you want to use it as an always-on dashboard on a tablet:
1. Host the files on a free service (like GitHub Pages or Cloudflare Pages).
2. Download a kiosk application onto your tablet (such as **Fully Kiosk Browser**).
3. Set the "Start URL" to your hosted site, connect to your Spotify account, and lock it into fullscreen mode! 

*Note: If using an older Kindle or Android device with an outdated certificate store, be sure to use Cloudflare Pages or enable "Ignore SSL Errors" in your Kiosk browser settings to ensure a smooth connection!*
