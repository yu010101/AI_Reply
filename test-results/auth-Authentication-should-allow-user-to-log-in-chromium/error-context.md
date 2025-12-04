# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "ChatReserve" [level=2] [ref=e6]
      - paragraph [ref=e7]: アカウントにログイン
    - generic [ref=e8]:
      - generic [ref=e9]:
        - heading "ログイン" [level=3] [ref=e10]
        - paragraph [ref=e11]: メールアドレスとパスワードを入力してください
      - generic [ref=e12]:
        - generic [ref=e13]:
          - paragraph [ref=e15]: データベース接続エラー
          - generic [ref=e16]:
            - generic [ref=e17]: メールアドレス
            - textbox "メールアドレス" [ref=e18]: test@example.com
          - generic [ref=e19]:
            - generic [ref=e20]: パスワード
            - textbox "パスワード" [ref=e21]: password123
          - button "ログイン" [ref=e22] [cursor=pointer]
        - paragraph [ref=e24]:
          - text: アカウントをお持ちでない方は
          - link "新規登録" [ref=e25] [cursor=pointer]:
            - /url: /auth/register
  - alert [ref=e26]
```