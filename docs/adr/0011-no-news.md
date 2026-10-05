# 0011. No news section

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

The site had a News section (Studio type `post`, `/news/` pages, a "back page" on the home page). Nobody at
the club will write posts regularly, and a news page whose last post is a year old makes the club look dead.

## Decision

We will not have news. Removed: the Studio type, the `/news/` pages and the home section. Things that would
have been news go where they belong: dates as **Events**, footage as **Videos**, pictures as **Photos**, and
standing information in **Club details**.

## Consequences

Nothing on the site goes stale on its own: every section is driven by dated content (events, videos, photos)
or by details that rarely change. If the club later finds someone to write, add it back with a new ADR.
