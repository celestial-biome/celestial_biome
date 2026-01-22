from rest_framework import permissions, status, views
from rest_framework.response import Response

from .models import UserActivityLog


class AuthLogView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """ログイン/ログアウトのログを記録する"""
        action = request.data.get("action")
        if action not in ["LOGIN", "LOGOUT"]:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)

        # IP取得
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        ip = x_forwarded_for.split(",")[0] if x_forwarded_for else request.META.get("REMOTE_ADDR")

        UserActivityLog.objects.create(
            user=request.user, action=action, ip_address=ip, user_agent=request.META.get("HTTP_USER_AGENT", "")
        )
        return Response({"status": "logged"})


class UserManageView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        """アカウント削除処理"""
        user = request.user

        # 削除ログ (ユーザー削除前に記録)
        UserActivityLog.objects.create(
            user=user,
            action="DELETE",
            user_email_snapshot=user.email,  # 明示的に残す
            user_agent="User initiated deletion",
        )

        # Djangoユーザー削除
        user.delete()

        return Response({"status": "deleted"}, status=status.HTTP_204_NO_CONTENT)
