#!/bin/sh
# usage: tools/pack_fe.sh N  -> dist/late_fee_video_fe_vN.zip (split into <30 MB parts if larger)
set -e
cd "$(dirname "$0")/.."
N=${1:-1}
mkdir -p dist
rm -f dist/late_fee_video_fe_v$N.z*
(cd fe_build && zip -qr -9 ../dist/late_fee_video_fe_v$N.zip .)
SIZE=$(wc -c < dist/late_fee_video_fe_v$N.zip)
if [ "$SIZE" -gt 30000000 ]; then
  rm dist/late_fee_video_fe_v$N.zip
  (cd fe_build && zip -qr -9 -s 29m ../dist/late_fee_video_fe_v$N.zip .)
fi
ls -la dist | grep "fe_v$N"
