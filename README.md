# findmoviessubtitles.xyz

A modern, responsive, and high-fidelity web application to search, merge, and download subtitles concurrently from **SubDL** and **SubSource**, with rich metadata provided by **TMDB**.

## Features

- **Concurrent Searching & Merging**: Queries SubDL, SubSource, and OpenSubtitles simultaneously when you search for a movie or TV episode, merging results into a unified view.
- **Release-Name Deduplication**: Automatically groups identical subtitle releases, making it easy to see which files are available without scrolling through exact duplicates.
- **Secure Server-Side API Proxies**: Keeps your API keys completely hidden from client-side network inspectors by proxying all searches and download streams server-side.
- **Rich Media Metadata**: Renders high-resolution posters, backdrops, plot summaries, ratings, and genre badges from TMDB to create a premium streaming-service aesthetic.
- **Interactive TV Selector**: Seamlessly select seasons and episodes for TV shows with dynamic lists and episode descriptions.
- **Library Drawer (LocalStorage)**: Keeps track of your downloaded history and favorite movies/TV shows in a slide-out drawer utilizing HTML5 LocalStorage—no database or account required.
- **Premium Dark Aesthetics**: Styled with Vanilla CSS (CSS Modules) following a sleek obsidian and teal/indigo theme, featuring responsive layouts and smooth micro-animations.

---

## Getting Started

### 1. Clone & Install Dependencies
Navigate to your project folder and run:
```bash
npm install
```

### 2. Configure Environment Variables
Copy the `.env.example` file to create a `.env.local` file:
```bash
cp .env.example .env.local
```
Open `.env.local` and configure your API keys:
- **`SUBDL_API_KEY`**: Obtain from [SubDL API Panel](https://subdl.com/panel/api) (free account allows 2,000 requests/day).
- **`SUBSOURCE_API_KEY`**: Obtain from [SubSource My Profile Dashboard](https://subsource.net).
- **`TMDB_API_KEY`**: Obtain from [TMDB API Settings](https://www.themoviedb.org/documentation/api).
- **`OPENSUBTITLES_API_KEY`**, **`OPENSUBTITLES_USERNAME`**, **`OPENSUBTITLES_PASSWORD`**, **`OPENSUBTITLES_USER_AGENT`**: Obtain credentials from [OpenSubtitles.com API portal](https://opensubtitles.com/api/v1/).

*Note: If no API keys are provided, the app will gracefully fall back to premium mock datasets or continue running with available providers for local development.*

### 3. Run Development Server
Start the Next.js local server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## Production & Deployment

### Build the Project
To compile the TypeScript project and generate the production bundle:
```bash
npm run build
```

### Deploy to Vercel (Recommended)
Vercel is the creator of Next.js and provides instant serverless deployment for the frontend and API proxy routes:

#### Required Vercel Environment Variables:
- **`SUBDL_API_KEY`**: Your API key for SubDL.
- **`SUBSOURCE_API_KEY`**: Your API key for SubSource.
- **`TMDB_API_KEY`**: Your API key for TMDB.
- **`OPENSUBTITLES_API_KEY`**: Your API key for OpenSubtitles.com.
- **`OPENSUBTITLES_USERNAME`**: Your username for OpenSubtitles.com.
- **`OPENSUBTITLES_PASSWORD`**: Your password for OpenSubtitles.com.
- **`OPENSUBTITLES_USER_AGENT`**: Custom user-agent string for OpenSubtitles.com API (e.g., `FindMoviesSubtitles v1.0`).
- **`NEXT_PUBLIC_SITE_URL`**: `https://findmoviessubtitles.xyz`

*Note: After adding or changing environment variables in the Vercel dashboard, a project redeploy is required to apply the new configuration.*

#### Deployment Steps:
1. Import your GitHub repository in Vercel.
2. Add the environment variables listed above in Vercel **Project Settings > Environment Variables**.
3. Deploy the application.
4. Add your custom domain `findmoviessubtitles.xyz` under **Project Settings > Domains**.
5. Configure your DNS settings as instructed by Vercel.

#### Verification & Testing Checklist:
Once deployed, verify the following features:
- [ ] Homepage loads with trending list
- [ ] Search suggestions drawer works as you type
- [ ] Movie/TV details pages load with rich metadata
- [ ] Subtitle filtering by language
- [ ] SubDL subtitle downloads proxy successfully
- [ ] SubSource subtitle downloads proxy successfully
- [ ] OpenSubtitles subtitle downloads proxy successfully
- [ ] Sitemap (`/sitemap.xml`) resolves correctly
- [ ] Robots (`/robots.txt`) matches the production configuration
- [ ] favicon (`/favicon.ico`) renders in the browser tab

### Self-Hosting (Node.js Server)
To run the production build on a virtual machine (e.g. AWS EC2, DigitalOcean):
```bash
# Build the project
npm run build

# Start the compiled Node server on port 3000
npm run start
```
Use a process manager like **PM2** to keep the app running in the background, and configure a reverse proxy like **Nginx** for SSL/TLS certificates.
