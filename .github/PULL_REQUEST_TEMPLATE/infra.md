## 概要

<!-- インフラ変更の内容を簡潔に説明してください -->

## 変更内容

- [ ] Terraform
- [ ] Cloud Run
- [ ] Cloud SQL
- [ ] Cloud Scheduler
- [ ] IAM / サービスアカウント
- [ ] その他:

<!-- 具体的な変更内容を記述してください -->

## Terraform Plan

<details>
<summary>terraform plan の出力</summary>

```
# ここに terraform plan の出力を貼り付けてください
```

</details>

## 影響範囲

<!-- 変更によって影響を受けるリソース・サービスを記述してください -->

## ロールバック手順

<!-- 問題が発生した場合のロールバック方法を記述してください -->

## チェックリスト

- [ ] `terraform plan` で意図しない変更がないことを確認した
- [ ] staging 環境で適用・動作確認済み
- [ ] `roles/cloudsql.editor` など Terraform 管理外のリソースを誤って変更していない
- [ ] Cloud SQL の自動停止スケジュール（09:00〜20:00 JST）を考慮している
- [ ] Cloud Run Job のスケジュールが Cloud SQL 稼動時間内に収まっている
