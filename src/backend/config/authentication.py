import firebase_admin
from django.contrib.auth import get_user_model
from firebase_admin import auth
from rest_framework import authentication, exceptions

from accounts.models import UserActivityLog

# Firebase Admin SDK の初期化 (シングルトン)
# Cloud Run や ローカル(ADC) 環境では、credentials引数なしで自動的に認証情報を取得します
if not firebase_admin._apps:
    firebase_admin.initialize_app()

User = get_user_model()


class FirebaseAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION")
        if not auth_header:
            return None

        parts = auth_header.split()
        if parts[0].lower() != "bearer":
            return None

        token = parts[1]

        try:
            decoded_token = auth.verify_id_token(token)
            uid = decoded_token.get("uid")
            email = decoded_token.get("email", "")
            name = decoded_token.get("name", "") or decoded_token.get("picture", "")  # 必要ならアイコンなども
        except Exception as e:
            raise exceptions.AuthenticationFailed(f"Invalid Firebase token: {str(e)}") from e

        if not uid:
            raise exceptions.AuthenticationFailed('Token contained no "uid"')

        # --- 整合性担保ロジック (Lazy Sync) ---
        user, created = User.objects.get_or_create(
            username=uid,
            defaults={
                "email": email,
                "first_name": name[:30] if name else "",  # Djangoの制限考慮
                "is_active": True,
            },
        )

        # 情報に変更があれば同期
        has_changed = False
        if user.email != email:
            user.email = email
            has_changed = True
        # ※必要に応じて名前の同期などもここに追加

        if has_changed:
            user.save()

        # 新規登録ログ
        if created:
            self._log_activity(request, user, "REGISTER")

        return (user, None)

    def _log_activity(self, request, user, action):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        ip = x_forwarded_for.split(",")[0] if x_forwarded_for else request.META.get("REMOTE_ADDR")

        UserActivityLog.objects.create(
            user=user, action=action, ip_address=ip, user_agent=request.META.get("HTTP_USER_AGENT", "")
        )
