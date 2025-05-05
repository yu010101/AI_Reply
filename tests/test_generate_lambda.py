import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime
from src.backend.generate_lambda.main import (
    get_location_settings,
    generate_reply,
    save_draft,
    update_review_status,
    main
)

@pytest.fixture
def mock_firestore():
    with patch('src.backend.generate_lambda.main.firestore') as mock_firestore:
        yield mock_firestore

@pytest.fixture
def mock_openai():
    with patch('src.backend.generate_lambda.main.openai') as mock_openai:
        yield mock_openai

def test_get_location_settings(mock_firestore):
    """店舗設定の取得テスト"""
    # モックデータの設定
    mock_location = MagicMock()
    mock_location.exists = True
    mock_location.to_dict.return_value = {'tone': 'polite'}
    mock_firestore.client().collection().document().get.return_value = mock_location
    
    settings = get_location_settings('456')
    assert settings['tone'] == 'polite'

def test_generate_reply(mock_openai):
    """返信生成のテスト"""
    # モックデータの設定
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content='Thank you for your review!'))]
    mock_response.usage = MagicMock(total_tokens=100)
    mock_openai.ChatCompletion.create.return_value = mock_response
    
    review = {
        'rating': 5,
        'author': 'Test User',
        'comment': 'Great service!'
    }
    
    reply, token_usage = generate_reply(review, 'polite')
    assert reply == 'Thank you for your review!'
    assert token_usage == 100

def test_save_draft(mock_firestore):
    """ドラフト保存のテスト"""
    save_draft('789', 'Thank you for your review!', 100)
    mock_firestore.client().collection().document().set.assert_called_once()

def test_update_review_status(mock_firestore):
    """レビューステータス更新のテスト"""
    update_review_status('789', 'abc123')
    mock_firestore.client().collection().document().update.assert_called_once()

def test_main(mock_firestore, mock_openai):
    """メイン関数のテスト"""
    # モックデータの設定
    mock_location = MagicMock()
    mock_location.exists = True
    mock_location.to_dict.return_value = {'tone': 'polite'}
    mock_firestore.client().collection().document().get.return_value = mock_location
    
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content='Thank you for your review!'))]
    mock_response.usage = MagicMock(total_tokens=100)
    mock_openai.ChatCompletion.create.return_value = mock_response
    
    # テストイベントの作成
    event = {
        'data': {
            'name': 'accounts/123/locations/456/reviews/789',
            'rating': 5,
            'author': 'Test User',
            'comment': 'Great service!'
        }
    }
    
    # テスト実行
    result = main(event, {})
    assert result['status'] == 'success'
    assert 'draft_id' in result 