import { getBestIcon } from './icon-scraper.js';
import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.get("/", async (req, res) => {
  console.log("Searching icon for domain: " + req.query.url);

  const params = {
    reject_search_downed_domains: req.query.rejectDown,
    try_path_guessing: req.query.pathGuess,
    use_external_apis: req.query.useAPI,
  };

  const icon = await getBestIcon(req.query.url, params);

  if (icon !== null) {
    console.log("Icon found, redirecting to: " + icon);
    res.redirect(icon);
  } else {
    const message = "Scraper wasn't able to find any icon: " + req.query.url;
    res.status(404).json({ message });
    console.log(message);
  }
});