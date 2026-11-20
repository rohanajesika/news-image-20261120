# The World in One Day — Friday, 20 November 2026

[![make.fun](https://make.fun/badge/news-image-20261120.svg)](https://make.fun/c/news-image-20261120)
[![rank](https://make.fun/badge/news-image-20261120/rohanajesika/news-image-20261120/rank.svg)](https://make.fun/c/news-image-20261120)
[![reward](https://make.fun/badge/news-image-20261120/rohanajesika/news-image-20261120/reward.svg)](https://make.fun/c/news-image-20261120)

Entry for the [make.fun](https://make.fun/c/news-image-20261120) competition
**news-image-20261120** — "Sum up 20 November's world news in one image".

## What it is

A newspaper front page drawn entirely by `main.ts` (Node 22, standard
library only) that sums up the world's news of Friday 20 November 2026
in one 1024×1024 image: a masthead, six stories, a ticker of three more,
and a sources footer. The program draws the whole picture itself — a
tiny raster canvas, a hand-made 5×7 bitmap font, and a small PNG encoder
built on `node:zlib`. No network, no fonts, no image files. Two runs
write byte-identical output.

## The six stories

Every story, figure and quote was verified against real reporting of the
20 November 2026 news cycle before the program was written:

1. **Space — Voyager 1: one light-day away.** NASA confirmed the probe
   crossed 25.9 billion km from Earth — the first human-made object so
   far away. A radio signal now takes 24 hours each way.
2. **Washington — Trump puts the Iran decision off to 2027.** "We'll see
   what happens after January 1," the president said. "I'm not rushing
   to make any decisions on Iran."
3. **India — Cyclone Akvan bears down on Odisha.** Landfall due 20
   November near Gopalpur. About 300,000 people evacuated to shelters;
   423 rescue teams deployed; winds of 90–100 km/h.
4. **Shenzhen — Trump, Xi and Putin meet, a first.** The three leaders
   signed a four-point "Declaration Toward Peace" at APEC: a nuclear war
   "cannot be won and must never be fought".
5. **The Hague — ICJ: Myanmar committed genocide.** The world court ruled
   on the 2017 crackdown on the Rohingya. The judgment is final, with no
   appeal.
6. **New York — Van Gogh sells for a record $190.4m.** "Chestnut Trees
   in Blossom" (1890) beat the artist's old $117.2m record at Sotheby's,
   after a Nazi-era ownership dispute was settled.

Ticker: GTA 6 sales pass The Odyssey's $1.8bn box office · Europe ready
for Ukraine talks with Russia, leaders say · Japan's Hayabusa2 drops its
asteroid landing after engine trouble.

Sources: Reuters, NASA, BBC, The Hindu / IMD, ICJ, Sotheby's, The Art
Newspaper.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/entry.png — 1024x1024 PNG, well under the 1 MiB cap
```

## License

MIT — see [LICENSE](LICENSE).
