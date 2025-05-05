import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from src.backend.ingest_lambda.main import (
    get_gbp_service,
    get_new_reviews,
    publish_to_pubsub,
    save_review_to_firestore,
    update_last_fetch,
    main
)

@pytest.fixture
def mock_gbp_service():
    with patch('src.backend.ingest_lambda.main.build') as mock_build:
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        yield mock_service

@pytest.fixture
def mock_firestore():
    with patch('src.backend.ingest_lambda.main.firestore') as mock_firestore:
        yield mock_firestore

@pytest.fixture
def mock_pubsub():
    with patch('src.backend.ingest_lambda.main.pubsub_v1.PublisherClient') as mock_pubsub:
        yield mock_pubsub

def test_get_gbp_service(mock_gbp_service):
    """GBPサービスの初期化テスト"""
    service = get_gbp_service()
    assert service is not None

def test_get_new_reviews(mock_gbp_service, mock_firestore):
    """新規レビューの取得テスト"""
    # モックデータの設定
    mock_reviews = {
        'reviews': [
            {
                'name': 'accounts/123/locations/456/reviews/789',
                'createTime': (datetime.utcnow() - timedelta(hours=1)).isoformat(),
                'reviewer': {'displayName': 'Test User'},
                'starRating': {'rating': 5},
                'comment': 'Great service!'
            }
        ]
    }
    
    mock_gbp_service.accounts().locations().reviews().list().execute.return_value = mock_reviews
    
    # 最終取得時刻のモック
    mock_last_fetch = MagicMock()
    mock_last_fetch.exists = True
    mock_last_fetch.to_dict.return_value = {
        'timestamp': (datetime.utcnow() - timedelta(days=1))
    }
    mock_firestore.client().collection().document().get.return_value = mock_last_fetch
    
    reviews = get_new_reviews('456')
    assert len(reviews) == 1
    assert reviews[0]['name'] == 'accounts/123/locations/456/reviews/789'

def test_publish_to_pubsub(mock_pubsub):
    """Pub/Subへの公開テスト"""
    review = {
        'name': 'accounts/123/locations/456/reviews/789',
        'createTime': datetime.utcnow().isoformat()
    }
    
    publish_to_pubsub(review)
    mock_pubsub.return_value.publish.assert_called_once()

def test_save_review_to_firestore(mock_firestore):
    """Firestoreへの保存テスト"""
    review = {
        'name': 'accounts/123/locations/456/reviews/789',
        'reviewer': {'displayName': 'Test User'},
        'starRating': {'rating': 5},
        'comment': 'Great service!',
        'createTime': datetime.utcnow().isoformat()
    }
    
    save_review_to_firestore(review)
    mock_firestore.client().collection().document().set.assert_called_once()

def test_update_last_fetch(mock_firestore):
    """最終取得時刻の更新テスト"""
    update_last_fetch('456')
    mock_firestore.client().collection().document().set.assert_called_once()

def test_main(mock_gbp_service, mock_firestore, mock_pubsub):
    """メイン関数のテスト"""
    # モックデータの設定
    mock_locations = [
        MagicMock(id='456')
    ]
    mock_firestore.client().collection().stream.return_value = mock_locations
    
    mock_reviews = {
        'reviews': [
            {
                'name': 'accounts/123/locations/456/reviews/789',
                'createTime': (datetime.utcnow() - timedelta(hours=1)).isoformat(),
                'reviewer': {'displayName': 'Test User'},
                'starRating': {'rating': 5},
                'comment': 'Great service!'
            }
        ]
    }
    mock_gbp_service.accounts().locations().reviews().list().execute.return_value = mock_reviews
    
    # テスト実行
    result = main({}, {})
    assert result['status'] == 'success'
    assert 'message' in result 