# MetaChar

Scraper of popular Character sites for use with large language models.

Currently, supports Chub and Janitor.

![screenshot](docs/screen_list.png)

![screenshot](docs/screen_card.png)

## Installation

TL;DR: `docker compose up`

The app will be available on [port 8006](http://localhost:8006).

MetaChar uses MySQL as a database, Minio as image storage, FlareSolverr as request proxy.
All these components are pluggable, meaning that instead of using bundled MySQL, or S3 you can use your own - just edit the config in `backend/config/default.yml`

## Warning

Both Chub and Janitor have very little moderation of contents. Do not expose your MetaChar installation to the internet.
