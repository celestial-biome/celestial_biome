from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class UserActivityLog(models.Model):
    ACTION_CHOICES = (
        ("LOGIN", "Login"),
        ("LOGOUT", "Logout"),
        ("REGISTER", "Register"),
        ("DELETE", "Account Deleted"),
    )

    # ユーザーが削除された場合、ログは残すが紐付けは切る (SET_NULL)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="activity_logs")
    # 削除されたユーザーの識別用 (監査ログとして残すため)
    user_email_snapshot = models.EmailField(blank=True, default="")

    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user_email_snapshot or 'Unknown'} - {self.action} - {self.timestamp}"

    def save(self, *args, **kwargs):
        # 保存時に現在のメールアドレスをスナップショットとして記録
        if self.user and not self.user_email_snapshot:
            self.user_email_snapshot = self.user.email
        super().save(*args, **kwargs)
