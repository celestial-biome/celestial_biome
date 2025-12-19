import os
from datetime import datetime
from zoneinfo import ZoneInfo

from django.conf import settings
from skyfield.api import Loader
from skyfield.framelib import ecliptic_frame
from skyfield.timelib import Time

# シングルトン的にデータを保持（再起動までメモリに載せる）
_TS = None
_EPH = None


def _get_resources():
    """
    SkyfieldのTimescaleとEphemerisをロードして返す。
    初回呼び出し時のみディスクから読み込む。
    """
    global _TS, _EPH
    if _TS is None or _EPH is None:
        data_dir = os.path.join(settings.BASE_DIR, "data")
        # Loaderを使ってキャッシュディレクトリを指定
        loader = Loader(data_dir)
        _TS = loader.timescale()
        # ファイルが存在しない場合は自動DLも可能だが、
        # ここでは事前に配置されている前提(de421.bsp)とする
        _EPH = loader("de440.bsp")
    return _TS, _EPH


class OrbitalCalculator:
    """
    惑星座標計算サービス
    """

    # Skyfieldでの天体キー
    PLANETS_MAP = {
        "mercury": "mercury",
        "venus": "venus",
        "earth": "earth",
        "mars": "mars",
        "jupiter": "jupiter barycenter",
        "saturn": "saturn barycenter",
        "uranus": "uranus barycenter",
        "neptune": "neptune barycenter",
        "pluto": "pluto barycenter",
    }

    def __init__(self):
        self.ts, self.eph = _get_resources()
        self.sun = self.eph["sun"]

    def calculate_positions(self, start_dt: datetime, end_dt: datetime, steps: int = 100) -> dict:
        """
        指定期間(start_dt ~ end_dt)を steps 分割し、
        各ステップにおける全惑星の (x, y) 座標 [AU] を計算して返す。
        座標系: 太陽中心・黄道座標 (Ecliptic J2000)
        """
        # UTCに統一
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=ZoneInfo("UTC"))
        if end_dt.tzinfo is None:
            end_dt = end_dt.replace(tzinfo=ZoneInfo("UTC"))

        t_start = self.ts.from_datetime(start_dt)
        t_end = self.ts.from_datetime(end_dt)

        # ベクトル計算用の Time オブジェクト生成
        times: Time = self.ts.linspace(t_start, t_end, steps)

        result_bodies = {}

        # 惑星ごとに計算
        for name, key in self.PLANETS_MAP.items():
            try:
                body = self.eph[key]
                # 太陽からの相対位置 -> 黄道座標系 -> AU単位
                # shape: (3, steps) -> [x, y, z]
                vectors = (body - self.sun).at(times).frame_xyz(ecliptic_frame).au

                # float32/64 -> python float list
                # 今回は2D表示用なので x, y のみ抽出
                # (必要なら z も返すが、転送量削減のため削る)
                xs = vectors[0].tolist()
                ys = vectors[1].tolist()

                result_bodies[name] = {
                    "x": xs,
                    "y": ys,
                }
            except KeyError:
                # 暦表にデータがない場合（冥王星など古いbspだと無い場合がある）
                continue

        return {
            "timestamps": [t.utc_iso() for t in times],
            "bodies": result_bodies,
        }
