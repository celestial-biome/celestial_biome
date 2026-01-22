from django.contrib import admin

from .models import UserActivityLog


@admin.register(UserActivityLog)
class UserActivityLogAdmin(admin.ModelAdmin):
    list_display = ("user", "action", "timestamp", "ip_address")
    list_filter = ("action", "timestamp")
    search_fields = ("user__email", "user__username", "ip_address")
