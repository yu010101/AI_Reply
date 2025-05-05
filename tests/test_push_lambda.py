import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime
from src.backend.push_lambda.main import (
    get_location_line_id,
    create_flex_message,
    main
)

@pytest.fixture
def mock_firestore():
    with patch('src.backend.push_lambda.main.firestore') as mock_firestore:
        yield mock_firestore

@pytest.fixture
def mock_line_bot():
    with patch('src.backend.push_lambda.main.LineBotApi') as mock_line_bot:
        yield mock_line_bot

def test_get_location_line_id(mock_firestore):
    """店舗のLINEユーザーID取得テスト"""
    # モックデータの設定
    mock_location = MagicMock()
    mock_location.exists = True
    mock_location.to_dict.return_value = {'line_user_id': 'U1234567890'}
    mock_firestore.client().collection().document().get.return_value = mock_location
    
    line_id = get_location_line_id('456')
    assert line_id == 'U1234567890'

def test_create_flex_message():
    """Flex Message作成テスト"""
    review = {
        'rating': 5,
        'author': 'Test User',
        'comment': 'Great service!'
    }
    
    draft = {
        'text': 'Thank you for your review!'
    }
    
    flex_message = create_flex_message(review, draft)
    
    assert flex_message['type'] == 'flex'
    assert flex_message['altText'] == '新しい口コミがあります'
    assert flex_message['contents']['type'] == 'bubble'
    assert len(flex_message['contents']['body']['contents']) == 7  # ヘッダ、本文、区切り線、AI案、3つのボタン

def test_main(mock_firestore, mock_line_bot):
    """メイン関数のテスト"""
    # モックデータの設定
    mock_location = MagicMock()
    mock_location.exists = True
    mock_location.to_dict.return_value = {'line_user_id': 'U1234567890'}
    mock_firestore.client().collection().document().get.return_value = mock_location
    
    mock_review = MagicMock()
    mock_review.get.return_value.to_dict.return_value = {
        'locationId': '456',
        'rating': 5,
        'author': 'Test User',
        'comment': 'Great service!'
    }
    mock_firestore.client().collection().document().get.return_value = mock_review
    
    mock_draft = MagicMock()
    mock_draft.get.return_value.to_dict.return_value = {
        'text': 'Thank you for your review!'
    }
    mock_firestore.client().collection().document().get.return_value = mock_draft
    
    # テストイベントの作成
    event = {
        'data': {
            'review_id': '789',
            'draft_id': 'abc123'
        }
    }
    
    # テスト実行
    result = main(event, {})
    assert result['status'] == 'success'
    mock_line_bot.return_value.push_message.assert_called_once() 