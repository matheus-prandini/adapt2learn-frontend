#!/usr/bin/env python3
import os
import sys
import shutil
from google.cloud import storage

def sync_game_assets(game_id: str, version: str, base_dir: str):
    """
    Baixa assets do bucket games/<gameId>/versions/<version>/...
    e planta tudo em base_dir/games/<gameId>/...
    """
    client = storage.Client()
    bucket = client.bucket("adapt2learn-api.appspot.com")
    prefix = f"games/{game_id}/versions/{version}/"

    # pasta onde o jogo “viverá”
    game_root = os.path.join(base_dir, "games", game_id)

    # limpa o que já tiver
    if os.path.exists(game_root):
        shutil.rmtree(game_root)
    os.makedirs(game_root, exist_ok=True)

    count = 0
    for blob in bucket.list_blobs(prefix=prefix):
        rel = blob.name[len(prefix):]
        if not rel:
            continue
        dst = os.path.join(game_root, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        blob.download_to_filename(dst)
        count += 1

    print(f"✅ {count} arquivos sincronizados em {game_root}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: sync_games.py <gameId> <version>")
        sys.exit(1)
    game_id, version = sys.argv[1], sys.argv[2]
    # grava em public/, antes do npm run build
    sync_game_assets(game_id, version, base_dir="public")
