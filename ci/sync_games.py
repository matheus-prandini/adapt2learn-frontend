#!/usr/bin/env python3
import os
import sys
import shutil
from google.cloud import storage

def sync_game_assets(game_id: str, version: str, build_dir: str):
    """
    1) Baixa assets do bucket para build/games/{gameId}/versions/{version}/...
    2) Copia o index.html dessa versão para build/games/{gameId}/index.html
    """
    client = storage.Client()
    bucket = client.bucket("adapt2learn-api.firebasestorage.app")
    prefix = f"games/{game_id}/versions/{version}/"

    # 1) Destino completo da versão
    version_root = os.path.join(build_dir, "games", game_id, "versions", version)
    if os.path.exists(version_root):
        shutil.rmtree(version_root)
    os.makedirs(version_root, exist_ok=True)

    count = 0
    for blob in bucket.list_blobs(prefix=prefix):
        rel_path = blob.name[len(prefix):]
        if not rel_path:
            continue
        dest_path = os.path.join(version_root, rel_path)
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        blob.download_to_filename(dest_path)
        count += 1

    print(f"✅ {count} arquivos sincronizados em {version_root}")

    # 2) Agora cuide do "entrypoint" em /games/<gameId>/
    game_root = os.path.join(build_dir, "games", game_id)
    # certifica que a pasta existe
    os.makedirs(game_root, exist_ok=True)
    src_index = os.path.join(version_root, "index.html")
    dst_index = os.path.join(game_root, "index.html")

    if not os.path.exists(src_index):
        raise RuntimeError(f"index.html não encontrado em {version_root}")
    shutil.copy2(src_index, dst_index)
    print(f"✅ index.html copiado para {dst_index}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: sync_games.py <gameId> <version>")
        sys.exit(1)
    game_id, version = sys.argv[1], sys.argv[2]
    sync_game_assets(game_id, version, build_dir="build")
