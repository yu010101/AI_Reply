import os
import json
import logging
from datetime import datetime
from linebot import LineBotApi, WebhookHandler
from linebot.models import TextSendMessage, QuickReply, QuickReplyButton, MessageAction
from firebase_admin import initialize_app, firestore

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Firebase初期化
initialize_app()
db = firestore.client()

# LINE Bot API設定
line_bot_api = LineBotApi(os.environ['LINE_CHANNEL_ACCESS_TOKEN'])
handler = WebhookHandler(os.environ['LINE_CHANNEL_SECRET'])

def handle_postback(event):
    """LINEのポストバックイベントを処理"""
    data = event.postback.data
    action, review_id = data.split(':')
    
    review_ref = db.collection('reviews').document(review_id)
    review = review_ref.get().to_dict()
    
    if action == 'POST':
        # 投稿ボタンが押された場合
        draft_ref = db.collection('drafts').document(review['draftId'])
        draft = draft_ref.get().to_dict()
        
        # レビューステータスを更新
        review_ref.update({'status': 'posted'})
        
        # コピー用のテキストを送信
        line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text=f"下記をコピーしてGBPに貼り付けてください👇\n\n{draft['text']}"
            )
        )
        
    elif action == 'EDIT':
        # 修正ボタンが押された場合
        quick_reply = QuickReply(
            items=[
                QuickReplyButton(
                    action=MessageAction(
                        label="修正テキストを入力",
                        text="修正テキストを入力してください"
                    )
                )
            ]
        )
        
        line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="修正テキストを入力してください",
                quick_reply=quick_reply
            )
        )
        
    elif action == 'SKIP':
        # 無視ボタンが押された場合
        review_ref.update({'status': 'ignored'})
        
        line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text="このレビューを無視しました")
        )

def handle_message(event):
    """LINEのメッセージイベントを処理"""
    if event.message.text == "修正テキストを入力してください":
        # 修正テキストの入力を待つ
        return
    
    # 修正テキストが入力された場合
    review_id = event.source.user_id  # 実際には適切な方法でreview_idを取得する必要があります
    review_ref = db.collection('reviews').document(review_id)
    
    # 新しいドラフトを作成
    draft_ref = db.collection('drafts').document()
    draft_ref.set({
        'reviewId': review_id,
        'text': event.message.text,
        'token_cost': 0,  # 手動修正のため0
        'createdAt': datetime.utcnow()
    })
    
    # レビューステータスを更新
    review_ref.update({
        'status': 'drafted',
        'draftId': draft_ref.id
    })
    
    # 確認メッセージを送信
    line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(text="修正テキストを保存しました")
    )

@handler.add(WebhookHandler.WebhookEvent)
def main(event, context):
    """Cloud Functionのメインエントリーポイント"""
    try:
        # LINEのWebhookリクエストを処理
        signature = event.headers.get('x-line-signature')
        body = event.body
        
        handler.handle(body, signature)
        
        return {'status': 'success'}
    
    except Exception as e:
        logger.error(f"Error in action_lambda: {str(e)}")
        raise 