# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "ChatReserve" [level=2] [ref=e6]
      - paragraph [ref=e7]: 新規アカウント作成
    - generic [ref=e8]:
      - generic [ref=e9]:
        - heading "新規登録" [level=3] [ref=e10]
        - paragraph [ref=e11]: 店舗オーナー様向けアカウントを作成
      - generic [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]:
            - generic [ref=e15]: 氏名 *
            - textbox "氏名 *" [ref=e16]
          - generic [ref=e17]:
            - generic [ref=e18]: メールアドレス *
            - textbox "メールアドレス *" [active] [ref=e19]: test
          - generic [ref=e20]:
            - generic [ref=e21]: 電話番号
            - textbox "電話番号" [ref=e22]
          - generic [ref=e23]:
            - generic [ref=e24]: パスワード *
            - textbox "パスワード *" [ref=e25]
            - paragraph [ref=e26]: 8文字以上で入力してください
          - generic [ref=e27]:
            - generic [ref=e28]: パスワード確認 *
            - textbox "パスワード確認 *" [ref=e29]
          - button "アカウント作成" [ref=e30] [cursor=pointer]
        - paragraph [ref=e32]:
          - text: 既にアカウントをお持ちの方は
          - link "ログイン" [ref=e33] [cursor=pointer]:
            - /url: /auth/login
  - alert [ref=e34]
```