# THE CLUB TOGARI — English site rebuild

A static rebuild of https://togari.jp/theclubtogari/en/ in the style of nclav.com: a pinned hero, word-by-word
statement reveal, a pinned horizontal feature track, a full-screen menu, and dark navy with the club's gold.
There are no frameworks or third-party scripts. All content is server-rendered HTML; the JS only adds motion.

## Structure
- `index.html` is the one-page site (About, Feature, Benefit, Residences, Access, FAQ, Contact)
- `policy/` holds the Privacy & Cookie Policy, `thanks/` is the form success page (noindex), and `404.html` is the error page
- `contact.php` handles the form (PHP `mail()`, honeypot, validation)
- `.htaccess` sets the security headers, HTTPS redirect, compression and caching (Apache)
- `_headers` holds the same headers for Netlify or Cloudflare Pages
- `robots.txt`, `sitemap.xml`, `llms.txt` and `.well-known/security.txt` are the crawler and security files

All paths are relative, so the folder can be deployed as-is to `/theclubtogari/en/`.

## Preview locally
```bash
python -m http.server 8765 --directory theclubtogari
```

## Before launch (still to do)
1. **Contact form recipient.** Set `CLUB_TO` in `contact.php` (it is `CHANGE-ME@…` now, and the form refuses to send until it is set).
   Make sure `CLUB_FROM`'s domain passes SPF and DKIM.
2. **Public email address.** No email address was published on the original site, so the page has no `mailto:` link.
   Add one to the footer, Contact section and JSON-LD once the club confirms an address.
3. **Social profiles.** None were found, so JSON-LD `sameAs` only lists the resort site. Add Instagram and others if they exist.
4. **Root-level files.** Scanners look for `robots.txt`, `sitemap.xml`, `llms.txt` and `/.well-known/security.txt` at
   `https://togari.jp/`. Merge these into the domain root (the WordPress site there may already serve a robots.txt).
5. **HSTS and HTTPS redirect** apply site-wide, so also put them in the root `.htaccess` (or the hosting panel).
6. **DNS (domain owner):** CAA record for the CA in use; SPF ending `-all`; DKIM; DMARC starting at
   `p=none; rua=mailto:dmarc@togari.jp`, then `quarantine`, then `reject; sp=reject`.
7. **Japanese version:** hreflang points at `https://togari.jp/theclubtogari/`. Rebuild the JP page in the same style so both match.
8. **Terms page:** the build standard asks for Terms. The club needs to supply the legal text.
9. **Analytics:** none are included, so no cookie banner is needed. If GA is added, add a CMP with Consent Mode v2
   (denied by default), and widen the CSP for googletagmanager.com and google-analytics.com.
10. After deploying, curl the headers, run the Rich Results Test on the URL, and run the health scanner.

## Hero intro (scroll-driven, as on nclav.com)
The hero is pinned for about 5.6 screens of scroll. It runs in three acts:
1. A dolly toward the cabin, with falling snow, mist closing in from the sides and a whiteout rising from below.
2. The whiteout becomes the inside of the "R" in the TOGARI wordmark, which zooms out over the clubhouse at dusk,
   and the tagline fades in.
3. A fade to navy into the next section.

The timing is in `assets/js/site.js` under "Hero intro".

NCLAV's first act is a 5-second rendered video that is scrubbed by scroll (the rotating cabin). If the club has
footage or a 3D fly-around of the residence, put a `<video muted playsinline preload="auto">` inside `.hero__scene`
in place of the `<img>`, and the script will scrub it instead of zooming the photo. Encode it with a keyframe on every
frame (`ffmpeg -g 1`) so scrubbing is smooth.

## Images
Images are the club's own, taken from the current site and resized to 1400px WebP. `og.jpg` is 1200×630.
Renderings are conceptual, as the on-page disclaimer says.
