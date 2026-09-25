# 変更時の品質ゲート

共通規約の正本はAI会社のdevelopment-policy/CODING-STANDARD.md。ここは本リポへの実装。

`npm run quality` は変更票/既存再利用/同一コード/限定秘密検査、既存ESLintによるβコード検査、既存API試験を実行する。`--base`指定時はGit差分との照合を行う。Next本体の既存Lint/Jest/typecheckを置き換えない。

`.quality/change.json`にtask_id、owner、acceptance、reuse、changed_filesを記録。真実性を機械が保証するものではない。新しいコードの意味的重複には既存資産確認とレビューも必要。

`.github/workflows/quality.yml`はPRのチェック候補。GitHubへ反映し必須チェックを設定するまではマージ阻止は保証しない。直接配備権限が残る間は手動配備による迂回も可能。ここを曖昧にして「確実に守れる」とは記載しない。

Secret patterns are generated from the shared openclaw-gates definition. The shipped artifact contains only regex lines; source provenance is in secret-provenance.json. The checker pins the artifact SHA and fails on missing/altered definitions. This detects file drift, not malicious coordinated edits to checker and artifact. Update from the canonical source; do not maintain a separate pattern list here.
