import { getBestIcon } from './icon-scraper.js';
import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.get("/", async (req, res) => {
  const params = {
    reject_search_downed_domains: req.query.rejectDown,
    try_path_guessing: req.query.pathGuess,
    use_external_apis: req.query.useAPI,
  };
  const icon = await getBestIcon(req.query.url, params);

  if (!Error.isError(icon)) {
    res.redirect(icon);
  } else {
    res.status(404).json({
      error: "Internal Server Error.",
      message: icon.message
    })
  }
});