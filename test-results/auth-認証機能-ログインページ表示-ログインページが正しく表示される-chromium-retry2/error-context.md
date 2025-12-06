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
          - generic [ref=e14]:
            - generic [ref=e15]: メールアドレス
            - textbox "メールアドレス" [ref=e16]
          - generic [ref=e17]:
            - generic [ref=e18]: パスワード
            - textbox "パスワード" [ref=e19]
          - button "ログイン" [ref=e20] [cursor=pointer]
        - paragraph [ref=e22]:
          - text: アカウントをお持ちでない方は
          - link "新規登録" [ref=e23] [cursor=pointer]:
            - /url: /auth/register
  - alert [ref=e24]
```