# Spotify Now Playing Display

A beautifully responsive, lightweight, and hardware-accelerated "Now Playing" web application for Spotify.

##Just go to https://zachariags.github.io/Now-Playing-Web/

This project was built to transform any unused screen into a stunning aesthetic music display. By running entirely in the browser using HTML, CSS, and Vanilla JavaScript with no backend required, it's incredibly portable. Whether you're displaying it on a secondary PC monitor, mounting an old iPad on the wall, or converting a dusty Android tablet into a smart dashboard, this app will adapt perfectly. 

### Features
**Immersive UI:** A full-screen, perfectly blurred, and infinitely rotating background that adapts automatically to the currently playing album art.  
**Potato Ready:** The animations are heavily optimized using GPU hardware acceleration (`translate3d`), meaning it runs flawlessly and respects battery life even on extremely old hardware.  
**Fully Responsive:** Custom portrait and landscape layout modes. When standing up, the UI stacks beautifully. When flat, it spreads out gracefully.  
**Smart Screen Blackout:** If the music pauses or stops completely, the UI hides itself to preserve battery and fade into the background—lighting up again the second you press play.  
**Self-Contained Auth:** Utilizes Spotify's modern PKCE Authorization Code flow, so users can log in securely on the device without needing a custom server.

### Running on an old Android Tablet
This project was originally built explicitly to give an old Amazon Kindle Fire 7 a second life! 
If you want to use it as an always-on dashboard on a tablet:
1. Download a kiosk application onto your tablet (such as **Fully Kiosk Browser**).
2. Set the "Start URL" to `zachariags.github.io/Now-Playing-Web`
3. Connect to your Spotify account, and lock it into full-screen mode!

*Note: If using an older Kindle or Android device with an outdated certificate store, be sure to use Cloudflare Pages or enable "Ignore SSL Errors" in your Kiosk browser settings to ensure a smooth connection!*
