#!/usr/bin/env python3
import os
import sys
import shutil
import subprocess
from google.cloud import storage

def sync_game_assets(game_id: str, version: str, build_dir: str):
    """
    Baixa assets do bucket e planta em build/games/{game_id}/versions/{version}/
    """
    client = storage.Client()
    bucket = client.bucket("adapt2learn-api.firebasestorage.app")
    prefix = f"games/{game_id}/versions/{version}/"

    dest_root = os.path.join(build_dir, "games", game_id, "versions", version)
    if os.path.exists(dest_root):
        shutil.rmtree(dest_root)
    os.makedirs(dest_root, exist_ok=True)

    blobs = bucket.list_blobs(prefix=prefix)
    count = 0
    for blob in blobs:
        rel = blob.name[len(prefix):]
        if not rel:
            continue
        dest_path = os.path.join(dest_root, rel)
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        blob.download_to_filename(dest_path)
        count += 1
        print(f"Baixando {rel} para {dest_path}")

    print(f"✅ {count} arquivos de {game_id}/{version} sincronizados em {dest_root}")

if __name__ == "__main__":
    # Recebe via CLI: python sync_games.py <gameId> <version>
    if len(sys.argv) != 3:
        print("Uso: sync_games.py <gameId> <version>")
        sys.exit(1)
    game_id, version = sys.argv[1], sys.argv[2]
    sync_game_assets(game_id, version, build_dir="build")
