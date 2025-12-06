# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "404" [level=1] [ref=e6]
      - heading "ページが見つかりません" [level=2] [ref=e7]
      - paragraph [ref=e8]: お探しのページは存在しないか、移動された可能性があります。
    - generic [ref=e9]:
      - link "ホームに戻る" [ref=e10] [cursor=pointer]:
        - /url: /
      - generic [ref=e11]:
        - link "ログイン" [ref=e12] [cursor=pointer]:
          - /url: /auth/login
        - text: •
        - link "新規登録" [ref=e13] [cursor=pointer]:
          - /url: /auth/register
  - alert [ref=e14]
```