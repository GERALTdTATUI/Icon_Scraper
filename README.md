# Node Icon Scraper

A lightweight REST API built with Node.js and Express that finds a website's icon and redirects the request to the selected icon URL.

The project is designed to run as a Docker container, making it easy to deploy alongside other self-hosted services.

## How it works

The scraper searches for an icon using three strategies, in this order:

1. **HTML metadata** – downloads the target page and checks its `<link>` elements for common icon declarations:
   - `icon`
   - `shortcut icon`
   - `apple-touch-icon`
   - `apple-touch-icon-precomposed`
   - `mask-icon`

   When multiple candidates are found, it scores them using the declared `sizes` and `type` attributes and selects the highest-scoring candidate. SVG icons and icons declared with `sizes="any"` receive the highest score.

2. **Common icon paths** – if no icon is found in the page metadata, the scraper checks a predefined list of conventional paths, such as `/favicon.ico`, `/favicon.svg`, and several known application-specific locations.

3. **External icon services** – if the previous strategies fail, the scraper can check external services:
   - [geticon.dev](https://geticon.dev/)
   - [favicon.im](https://favicon.im/)
   - [DuckDuckGo Icons](https://icons.duckduckgo.com/)

The first successful result is returned as a redirect. If no icon can be found, the API responds with `404 Not Found`.

## API

### `GET /`

Finds the best available icon for the requested website.

**Query parameters**

| Parameter | Type | Default | Description |
|---|---|---:|---|
| `url` | string | — | Website URL or domain to search. Required. |
| `rejectDown` | boolean | `false` | If `true`, stop when the target website responds with a non-successful HTTP status. |
| `pathGuess` | boolean | `true` | If `true`, check the predefined list of common icon paths when no icon is found in the page HTML. |
| `useAPI` | boolean | `true` | If `true`, use external icon services as a fallback. |

Boolean parameters accept `true`, `false`, `1`, or `0` (case-insensitive).

### Examples

Search for a website icon:

```http
GET /?url=example.com
```

Use an explicit URL and disable external services:

```http
GET /?url=https://example.com&useAPI=false
```

Only inspect the page's HTML metadata:

```http
GET /?url=example.com&pathGuess=false&useAPI=false
```

Stop if the website responds with a non-successful status:

```http
GET /?url=example.com&rejectDown=true
```

### Responses

**Icon found**

The API responds with an HTTP redirect (`302`) to the selected icon URL. The client follows the redirect to retrieve the image.

**No icon found**

The API responds with `404 Not Found` and a JSON message:

## Docker deployment

The repository includes a `Dockerfile` and a `docker-compose.yml` for container deployment.

### Requirements

- Docker
- Docker Compose

### Configuration

The Compose file uses the `PORT` environment variable to define the host port mapped to the API's container port (`3000`).

Create a `.env` file in the project root:

```dotenv
PORT=3000
```

You can change the value to use a different host port.

### Start the API

Build and start the container:

```bash
docker compose up -d --build
```

Check the container logs:

```bash
docker compose logs -f
```

Stop the service:

```bash
docker compose down
```

Once running, the API is available at:

```text
http://localhost:3000/?url=example.com
```

If you changed `PORT`, replace `3000` with the configured host port.

## Run locally

The project requires Node.js and npm.

Install dependencies:

```bash
npm install
```

Start the API:

```bash
npm start
```

By default, the server listens on port `3000`. The application also reads the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## Project structure

```text
.
├── app/
│   ├── app.js             # Express API and HTTP endpoint
│   └── icon-scraper.js    # Icon discovery and fallback logic
├── Dockerfile             # Docker image definition
├── docker-compose.yml     # Container service configuration
├── package.json           # Project metadata, scripts and dependencies
└── README.md
```

## Implementation details and limitations

- The scraper uses an eight-second timeout for the target-page request and subsequent fallback requests.
- The icon search is based on HTML metadata, a predefined list of paths, and the configured external services. It does not render JavaScript or execute scripts from the target website.
- The selected icon is returned as a URL redirect; the API does not download or store the icon.
- External services may return a fallback image or placeholder rather than an icon hosted by the target website.
- A website may block automated requests, require authentication, or expose its icon through mechanisms that this implementation does not inspect.

> **Deployment security:** The `url` parameter causes the server to make HTTP requests to a user-supplied address. Do not expose this API publicly without adding URL validation and protections against requests to localhost, private network ranges, and cloud metadata endpoints. Otherwise, the endpoint may be abused to access internal services (SSRF).

## Current code compatibility note

The current source files mix CommonJS (`require`) and ES Module (`import` / `export`) syntax. The `package.json` does not declare an ES Module mode, so the module format must be made consistent before the application can start reliably.

There is also a path difference between the Dockerfile's default command (`node app.js`) and the actual entry point (`app/app.js`). The Compose service overrides the image command with `npm run start`, which uses the latter path; direct `docker run` execution would still use the Dockerfile command.

These are implementation issues in the current source, not additional setup steps.

## License

This project is licensed under the [MIT License](https://opensource.org/license/mit/).
