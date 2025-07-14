#!/usr/bin/env python3
import os
import sys
import shutil
from google.cloud import storage

def sync_game_assets(game_id: str, version: str, build_dir: str):
    """
    1) Baixa assets do bucket para build_dir/games/{gameId}/versions/{version}/...
    2) Copia TODO o conteúdo dessa versão para build_dir/games/{gameId}/
    """
    client = storage.Client()
    bucket = client.bucket("adapt2learn-api.firebasestorage.app")
    prefix = f"games/{game_id}/versions/{version}/"

    # 1) coloca dentro de .../versions/{version}/
    version_root = os.path.join(build_dir, "games", game_id, "versions", version)
    if os.path.exists(version_root):
        shutil.rmtree(version_root)
    os.makedirs(version_root, exist_ok=True)

    count = 0
    for blob in bucket.list_blobs(prefix=prefix):
        rel_path = blob.name[len(prefix):]
        if not rel_path:
            continue
        dst = os.path.join(version_root, rel_path)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        blob.download_to_filename(dst)
        count += 1
    print(f"✅ {count} arquivos sincronizados em {version_root}")

    # 2) agora copie TUDO para public/games/<gameId>/
    game_root = os.path.join(build_dir, "games", game_id)
    if os.path.exists(game_root):
        shutil.rmtree(game_root)
    shutil.copytree(version_root, game_root)
    print(f"✓ Assets copiados para public/games/{game_id}/")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: sync_games.py <gameId> <version>")
        sys.exit(1)
    game_id, version = sys.argv[1], sys.argv[2]
    sync_game_assets(game_id, version, build_dir="public")
