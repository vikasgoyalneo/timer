const http = require('http');
const { createCanvas } = require('canvas');
const url = require('url');
const GIFEncoder = require('gif-encoder'); // <--- NEW IMPORT
const { PassThrough } = require('stream'); // <--- NEW IMPORT


// Parse query parameters and calculate time difference
function getCountdown(targetDate) {
  const now = new Date();
  const target = new Date(targetDate);
  const diff = target - now;

  if (diff <= 0) {
    return { expired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, expired: false };
}

// Generate countdown image (used for both PNG and GIF frames)
function generateCountdownImage(countdown, options = {}, ctx) {
    const {
        width = 800,
        height = 400,
        bgColor = '#1a1a2e',
        textColor = '#eee',
        accentColor = '#0f3460',
        title = 'Countdown'
    } = options;

    // Use existing context if provided (for GIF frames), otherwise create a new one
    const canvas = ctx ? ctx.canvas : createCanvas(width, height);
    if (!ctx) ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = textColor;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 80);

    if (countdown.expired) {
        ctx.font = 'bold 64px Arial';
        ctx.fillStyle = '#e94560';
        ctx.fillText('EXPIRED', width / 2, height / 2 + 20);
    } else {
        // Time boxes
        const boxWidth = 150;
        const boxHeight = 120;
        const spacing = 20;
        const startX = (width - (4 * boxWidth + 3 * spacing)) / 2;
        const boxY = 140;

        const timeUnits = [
            { value: countdown.days, label: 'DAYS' },
            { value: countdown.hours, label: 'HOURS' },
            { value: countdown.minutes, label: 'MINS' },
            { value: countdown.seconds, label: 'SECS' }
        ];

        timeUnits.forEach((unit, i) => {
            const x = startX + i * (boxWidth + spacing);

            // Box background
            ctx.fillStyle = accentColor;
            ctx.fillRect(x, boxY, boxWidth, boxHeight);

            // Time value
            ctx.fillStyle = textColor;
            ctx.font = 'bold 56px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(String(unit.value).padStart(2, '0'), x + boxWidth / 2, boxY + 70);

            // Label
            ctx.font = 'bold 18px Arial';
            ctx.fillText(unit.label, x + boxWidth / 2, boxY + 105);
        });
    }

    if (!ctx) return canvas.toBuffer('image/png'); // For PNG route
}

// Generate animated GIF (Synchronous with Memory Control Focus)
function generateCountdownGif(targetDate, options = {}) {
    const {
        width = 800,
        height = 400,
        // *** IMPORTANT: Reduce default frames to limit memory usage ***
        frames = 5, 
        delay = 1000 
    } = options;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const gif = new GIFEncoder(width, height);
    const stream = new PassThrough();

    // Pipe the GIF output to the stream
    gif.pipe(stream);

    // Set GIF properties
    gif.setDelay(delay);
    gif.setRepeat(0);
    // You can try lowering quality further if memory issues persist
    gif.setQuality(20); 

    // Start GIF encoding
    gif.writeHeader();

    // Generate frames using the synchronous addFrame
    for (let i = 0; i < frames; i++) {
        // Calculate the countdown for the current frame
        const frameDate = new Date(new Date(targetDate).getTime() - i * 1000);
        const countdown = getCountdown(frameDate);

        // Draw the frame
        generateCountdownImage(countdown, options, ctx);

        // *** CRITICAL PIXEL DATA FIX (required) ***
        const frameData = ctx.getImageData(0, 0, width, height).data;
        
        // Add the frame to the GIF
        gif.addFrame(frameData);

        if (countdown.expired) break;
    }

    // Finish GIF encoding
    gif.finish();

    // Return the stream which contains the GIF data
    return stream;
}

// Generate live countdown HTML page (no change)
function generateLiveCountdownPage(date, options = {}) {
    // ... (This function remains the same as in your original code) ...
    const {
        title = 'Countdown',
        bgColor = '#1a1a2e',
        textColor = '#eee',
        accentColor = '#0f3460'
    } = options;

    // The rest of the HTML page content... (omitted for brevity)
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          background: ${bgColor};
          color: ${textColor};
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          text-align: center;
          max-width: 900px;
          width: 100%;
        }
        h1 {
          font-size: 3rem;
          margin-bottom: 3rem;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .countdown {
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .time-box {
          background: ${accentColor};
          padding: 30px;
          border-radius: 10px;
          min-width: 150px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }
        .time-value {
          font-size: 4rem;
          font-weight: bold;
          line-height: 1;
          margin-bottom: 10px;
        }
        .time-label {
          font-size: 1.2rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.9;
        }
        .expired {
          font-size: 5rem;
          color: #e94560;
          font-weight: bold;
        }
        @media (max-width: 768px) {
          h1 { font-size: 2rem; }
          .time-box { min-width: 120px; padding: 20px; }
          .time-value { font-size: 3rem; }
          .time-label { font-size: 1rem; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${title}</h1>
        <div id="countdown" class="countdown"></div>
      </div>
            <script>
        const targetDate = new Date('${date}').getTime();
                function updateCountdown() {
          const now = new Date().getTime();
          const diff = targetDate - now;
                    const countdownEl = document.getElementById('countdown');
                    if (diff <= 0) {
            countdownEl.innerHTML = '<div class="expired">EXPIRED</div>';
            return;
          }
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    countdownEl.innerHTML = \`
            <div class="time-box">
              <div class="time-value">\${String(days).padStart(2, '0')}</div>
              <div class="time-label">Days</div>
            </div>
            <div class="time-box">
              <div class="time-value">\${String(hours).padStart(2, '0')}</div>
              <div class="time-label">Hours</div>
            </div>
            <div class="time-box">
              <div class="time-value">\${String(minutes).padStart(2, '0')}</div>
              <div class="time-label">Minutes</div>
            </div>
            <div class="time-box">
              <div class="time-value">\${String(seconds).padStart(2, '0')}</div>
              <div class="time-label">Seconds</div>
            </div>
          \`;
        }
                updateCountdown();
        setInterval(updateCountdown, 1000);
      </script>
    </body>
    </html>
  `;
}

// Create server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    if (parsedUrl.pathname === '/countdown') {
        const { date, title, width, height, bgColor, textColor, accentColor } = parsedUrl.query;

        if (!date) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing "date" parameter. Example: /countdown?date=2025-12-31T23:59:59');
            return;
        }

        try {
            const countdown = getCountdown(date);
            const options = {
                title: title || 'Countdown',
                width: parseInt(width) || 800,
                height: parseInt(height) || 400,
                bgColor: bgColor || '#1a1a2e',
                textColor: textColor || '#eee',
                accentColor: accentColor || '#0f3460'
            };

            const canvas = createCanvas(options.width, options.height);
            const ctx = canvas.getContext('2d');
            generateCountdownImage(countdown, options, ctx); // Use existing context to draw
            const image = canvas.toBuffer('image/png'); // Get PNG buffer

            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(image);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error generating countdown: ' + err.message);
        }
    } else if (parsedUrl.pathname === '/gif') { // <--- NEW GIF ROUTE
		const { date, title, width, height, bgColor, textColor, accentColor, frames, delay } = parsedUrl.query;

			if (!date) {
				res.writeHead(400, { 'Content-Type': 'text/plain' });
				res.end('Missing "date" parameter. Example: /gif?date=2025-12-31T23:59:59');
				return;
			}

			try {
				const options = {
					title: title || 'Countdown',
					width: parseInt(width) || 800,
					height: parseInt(height) || 400,
					bgColor: bgColor || '#1a1a2e',
					textColor: textColor || '#eee',
					accentColor: accentColor || '#0f3460',
					// Use defaults that are less memory intensive
					frames: parseInt(frames) || 5, 
					delay: parseInt(delay) || 1000
				};

				// Call the synchronous function
				const gifStream = generateCountdownGif(date, options);

				res.writeHead(200, {
					'Content-Type': 'image/gif',
					'Cache-Control': 'no-cache, no-store, must-revalidate'
				});

				// Pipe the GIF stream directly to the response
				gifStream.pipe(res);

			} catch (err) {
				// This catch block will now work correctly for synchronous errors
				res.writeHead(500, { 'Content-Type': 'text/plain' });
				res.end('Error generating GIF: ' + err.message);
			}
    } else if (parsedUrl.pathname === '/live') {
        const { date, title, bgColor, textColor, accentColor } = parsedUrl.query;
        if (!date) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing "date" parameter. Example: /live?date=2025-12-31T23:59:59');
            return;
        }
        const options = {
            title: title || 'Countdown',
            bgColor: bgColor || '#1a1a2e',
            textColor: textColor || '#eee',
            accentColor: accentColor || '#0f3460'
        };
        const html = generateLiveCountdownPage(date, options);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Countdown Server running at http://localhost:${PORT}/`);
    console.log(`Live countdown: http://localhost:${PORT}/live?date=2025-12-31T23:59:59`);
    console.log(`Image countdown: http://localhost:${PORT}/countdown?date=2025-12-31T23:59:59`);
    console.log(`GIF countdown: http://localhost:${PORT}/gif?date=2025-12-31T23:59:59`);
});