#!/usr/bin/env bash
# Re-encode the source videos into the two formats the site serves, and pull a poster
# frame from each. Outputs land in public/media/ and are committed, so the site build
# never needs ffmpeg.
#
#   ./scripts/optimize-media.sh
#
# Budget (CLAUDE.md section 9): <= 2.5 MB per file. The script prints each result and
# exits non-zero if anything is over, rather than shipping a quietly oversized asset.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/assets"
OUT="$ROOT/public/media"
BUDGET_BYTES=$((2500 * 1024))

command -v ffmpeg >/dev/null || { echo "ffmpeg not found on PATH" >&2; exit 1; }
mkdir -p "$OUT"

# 960px wide is the widest the video is ever displayed; anything more is wasted bytes.
SCALE="scale='min(960,iw)':-2"

encode() {
  local name="$1" src="$2" crf_h264="$3" crf_av1="$4"
  echo "== $name"

  ffmpeg -y -loglevel error -i "$src" \
    -vf "$SCALE" -an \
    -c:v libx264 -profile:v high -pix_fmt yuv420p -crf "$crf_h264" -preset slow \
    -movflags +faststart "$OUT/$name.mp4"

  ffmpeg -y -loglevel error -i "$src" \
    -vf "$SCALE" -an \
    -c:v libaom-av1 -crf "$crf_av1" -b:v 0 -cpu-used 6 -row-mt 1 \
    -movflags +faststart "$OUT/$name.av1.mp4"

  # Poster frame, so the <video> reserves its box before any bytes of video arrive.
  ffmpeg -y -loglevel error -ss 0 -i "$src" -vf "$SCALE" -frames:v 1 "$OUT/$name-poster.png"
  npx --yes sharp-cli --help >/dev/null 2>&1 || true
  node -e "
    const sharp = require('sharp');
    const p = '$OUT/$name-poster.png';
    (async () => {
      await sharp(p).avif({ quality: 50 }).toFile(p.replace('.png', '.avif'));
      await sharp(p).jpeg({ quality: 72, progressive: true }).toFile(p.replace('.png', '.jpg'));
      require('fs').unlinkSync(p);
    })();
  "
}

# showcase is 56 s at 1288x488; the rviz replay is 4 s at 960x600. The CRFs are set
# per clip so both land inside the 2.5 MB budget rather than using one global number.
encode showcase "$SRC/showcase.mp4" 34 52
encode rviz-replay "$SRC/obf-rviz.gif" 28 38

echo
fail=0
for f in "$OUT"/*; do
  size=$(stat -c%s "$f")
  printf '%8.2f MB  %s' "$(echo "$size / 1048576" | bc -l)" "$(basename "$f")"
  if [ "$size" -gt "$BUDGET_BYTES" ] && [[ "$f" == *.mp4 ]]; then
    printf '  OVER BUDGET'
    fail=1
  fi
  printf '\n'
done
exit "$fail"
