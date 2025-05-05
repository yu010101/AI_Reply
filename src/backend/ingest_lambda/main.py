import os
import json
import logging
from datetime import datetime, timedelta
from google.cloud import pubsub_v1
from google.oauth2 import service_account
from googleapiclient.discovery import build
from firebase_admin import initialize_app, firestore

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Firebase初期化
initialize_app()
db = firestore.client()

def get_gbp_service():
    """Google Business Profile APIサービスの初期化"""
    credentials = service_account.Credentials.from_service_account_file(
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'],
        scopes=['https://www.googleapis.com/auth/business.manage']
    )
    return build('mybusiness', 'v4', credentials=credentials)

def get_new_reviews(location_id):
    """指定されたロケーションの新規レビューを取得"""
    service = get_gbp_service()
    reviews = service.accounts().locations().reviews().list(
        name=f'accounts/{os.environ["GBP_ACCOUNT_ID"]}/locations/{location_id}'
    ).execute()

    # 最終取得時刻以降のレビューのみをフィルタリング
    last_fetch = db.collection('last_fetch').document(location_id).get()
    if last_fetch.exists:
        last_fetch_time = last_fetch.to_dict()['timestamp']
        reviews = [r for r in reviews.get('reviews', []) 
                  if datetime.fromisoformat(r['createTime']) > last_fetch_time]

    return reviews

def publish_to_pubsub(review):
    """レビューをPub/Subに公開"""
    publisher = pubsub_v1.PublisherClient()
    topic_path = publisher.topic_path(
        os.environ['GOOGLE_CLOUD_PROJECT'],
        'review-queue'
    )
    
    publisher.publish(topic_path, json.dumps(review).encode('utf-8'))
    logger.info(f"Published review {review['name']} to Pub/Sub")

def save_review_to_firestore(review):
    """レビューをFirestoreに保存"""
    review_ref = db.collection('reviews').document(review['name'].split('/')[-1])
    review_ref.set({
        'locationId': review['name'].split('/')[3],
        'author': review.get('reviewer', {}).get('displayName', 'Anonymous'),
        'rating': review.get('starRating', {}).get('rating'),
        'comment': review.get('comment', ''),
        'time': review['createTime'],
        'status': 'new'
    })
    logger.info(f"Saved review {review['name']} to Firestore")

def update_last_fetch(location_id):
    """最終取得時刻を更新"""
    db.collection('last_fetch').document(location_id).set({
        'timestamp': datetime.utcnow()
    })

def main(event, context):
    """Cloud Functionのメインエントリーポイント"""
    try:
        # 設定されたロケーションIDを取得
        locations = db.collection('locations').stream()
        
        for location in locations:
            location_id = location.id
            reviews = get_new_reviews(location_id)
            
            for review in reviews:
                save_review_to_firestore(review)
                publish_to_pubsub(review)
            
            update_last_fetch(location_id)
            
        return {'status': 'success', 'message': f'Processed {len(reviews)} reviews'}
    
    except Exception as e:
        logger.error(f"Error in ingest_lambda: {str(e)}")
        raise 