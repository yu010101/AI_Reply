import os
import json
import logging
from datetime import datetime
import openai
from firebase_admin import initialize_app, firestore

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Firebase初期化
initialize_app()
db = firestore.client()

# OpenAI API設定
openai.api_key = os.environ['OPENAI_API_KEY']

def get_location_settings(location_id):
    """店舗の設定を取得"""
    location_ref = db.collection('locations').document(location_id)
    location = location_ref.get()
    return location.to_dict() if location.exists else {'tone': 'polite'}

def generate_reply(review, tone):
    """GPT-4を使用して返信を生成"""
    system_prompt = f"""あなたは店舗オーナーの代わりにGoogleレビューへ返信する丁寧な受付スタッフです。
トーン: {tone}"""

    user_prompt = f"""[星{review['rating']}] {review['author']}様、{review['comment']}"""

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=200,
            temperature=0.7
        )
        
        reply = response.choices[0].message.content.strip()
        token_usage = response.usage.total_tokens
        
        return reply, token_usage
    
    except Exception as e:
        logger.error(f"Error generating reply: {str(e)}")
        raise

def save_draft(review_id, reply, token_usage):
    """生成された返信をドラフトとして保存"""
    draft_ref = db.collection('drafts').document()
    draft_ref.set({
        'reviewId': review_id,
        'text': reply,
        'token_cost': token_usage,
        'createdAt': datetime.utcnow()
    })
    return draft_ref.id

def update_review_status(review_id, draft_id):
    """レビューのステータスを更新"""
    review_ref = db.collection('reviews').document(review_id)
    review_ref.update({
        'status': 'drafted',
        'draftId': draft_id
    })

def main(event, context):
    """Cloud Functionのメインエントリーポイント"""
    try:
        # Pub/Subメッセージからレビューデータを取得
        pubsub_message = json.loads(event['data'].decode('utf-8'))
        review_id = pubsub_message['name'].split('/')[-1]
        location_id = pubsub_message['name'].split('/')[3]
        
        # 店舗設定を取得
        settings = get_location_settings(location_id)
        
        # 返信を生成
        reply, token_usage = generate_reply(pubsub_message, settings['tone'])
        
        # ドラフトを保存
        draft_id = save_draft(review_id, reply, token_usage)
        
        # レビューステータスを更新
        update_review_status(review_id, draft_id)
        
        logger.info(f"Generated reply for review {review_id}")
        return {'status': 'success', 'draft_id': draft_id}
    
    except Exception as e:
        logger.error(f"Error in generate_lambda: {str(e)}")
        raise 