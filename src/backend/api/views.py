import asyncio

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from config.authentication import FirebaseAuthentication

from .services.inference_client import InferenceClient  # 先に作成したクライアントをインポート


class CelestialInferenceView(APIView):
    """
    Firebase Auth で認証されたユーザーのみが、宇宙・地球・経済の相関推論を呼び出せる View。
    """

    permission_classes = [IsAuthenticated]

    authentication_classes = [FirebaseAuthentication]

    def post(self, request):
        prompt = request.data.get("prompt")
        if not prompt:
            return Response({"error": "プロンプトを入力してください。"}, status=status.HTTP_400_BAD_REQUEST)

        client = InferenceClient()
        try:
            # Djangoの同期View内で asyncio.run を使い、FastAPIへ推論を依頼する
            # Geminiの推論時間は長いため、タイムアウト耐性のある httpx クライアント経由で実行
            result = asyncio.run(client.get_prediction(prompt))
            print(f"DEBUG Result: {result}")  # コンテナのログに表示
            # (任意) ここで PostgreSQL に user_id と prompt を保存するロジックを追加予定

            return Response(result)
        except Exception:
            # 詳細は後ほど Sentry で捕捉するようにします
            return Response(
                {"error": "推論エンジンとの通信に失敗しました。"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
