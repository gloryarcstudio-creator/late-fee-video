#!/bin/sh
# usage: tools/pack_fe.sh N  -> dist/late_fee_video_fe_vN.zip, split into independent _partK.zip archives under 30 MB when needed (see pack_fe.py)
set -e
cd "$(dirname "$0")/.."
python3 tools/pack_fe.py "${1:-1}"
