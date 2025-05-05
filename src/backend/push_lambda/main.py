import os
import json
import logging
from datetime import datetime
from linebot import LineBotApi, WebhookHandler
from linebot.models import FlexSendMessage, TextSendMessage
from firebase_admin import initialize_app, firestore

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Firebase初期化
initialize_app()
db = firestore.client()

# LINE Bot API設定
line_bot_api = LineBotApi(os.environ['LINE_CHANNEL_ACCESS_TOKEN'])

def get_location_line_id(location_id):
    """店舗のLINEユーザーIDを取得"""
    location_ref = db.collection('locations').document(location_id)
    location = location_ref.get()
    return location.to_dict().get('line_user_id') if location.exists else None

def create_flex_message(review, draft):
    """LINE Flex Messageを作成"""
    return {
        "type": "flex",
        "altText": "新しい口コミがあります",
        "contents": {
            "type": "bubble",
            "body": {
                "contents": [
                    {
                        "type": "text",
                        "text": f"⭐{review['rating']} {review['author']}様",
                        "weight": "bold"
                    },
                    {
                        "type": "text",
                        "text": review['comment']
                    },
                    {
                        "type": "separator"
                    },
                    {
                        "type": "text",
                        "text": f"AI案: {draft['text']}"
                    },
                    {
                        "type": "button",
                        "style": "primary",
                        "action": {
                            "type": "postback",
                            "label": "👍投稿",
                            "data": f"POST:{review['id']}"
                        }
                    },
                    {
                        "type": "button",
                        "style": "secondary",
                        "action": {
                            "type": "postback",
                            "label": "📝修正",
                            "data": f"EDIT:{review['id']}"
                        }
                    },
                    {
                        "type": "button",
                        "style": "secondary",
                        "action": {
                            "type": "postback",
                            "label": "❌無視",
                            "data": f"SKIP:{review['id']}"
                        }
                    }
                ]
            }
        }
    }

def main(event, context):
    """Cloud Functionのメインエントリーポイント"""
    try:
        # Pub/Subメッセージからデータを取得
        pubsub_message = json.loads(event['data'].decode('utf-8'))
        review_id = pubsub_message['review_id']
        draft_id = pubsub_message['draft_id']
        
        # レビューとドラフトを取得
        review_ref = db.collection('reviews').document(review_id)
        draft_ref = db.collection('drafts').document(draft_id)
        
        review = review_ref.get().to_dict()
        draft = draft_ref.get().to_dict()
        
        # 店舗のLINEユーザーIDを取得
        line_user_id = get_location_line_id(review['locationId'])
        if not line_user_id:
            logger.error(f"LINE user ID not found for location {review['locationId']}")
            return
        
        # Flex Messageを作成して送信
        flex_message = create_flex_message(review, draft)
        line_bot_api.push_message(
            line_user_id,
            FlexSendMessage(alt_text=flex_message['altText'], contents=flex_message['contents'])
        )
        
        logger.info(f"Sent LINE message for review {review_id}")
        return {'status': 'success'}
    
    except Exception as e:
        logger.error(f"Error in push_lambda: {str(e)}")
        raise 