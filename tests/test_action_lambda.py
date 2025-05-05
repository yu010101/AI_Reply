import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime
from src.backend.action_lambda.main import (
    handle_postback,
    handle_message,
    main
)

@pytest.fixture
def mock_firestore():
    with patch('src.backend.action_lambda.main.firestore') as mock_firestore:
        yield mock_firestore

@pytest.fixture
def mock_line_bot():
    with patch('src.backend.action_lambda.main.LineBotApi') as mock_line_bot:
        yield mock_line_bot

def test_handle_postback_post(mock_firestore, mock_line_bot):
    """投稿ボタンのポストバック処理テスト"""
    # モックデータの設定
    mock_review = MagicMock()
    mock_review.get.return_value.to_dict.return_value = {
        'draftId': 'abc123'
    }
    mock_firestore.client().collection().document().get.return_value = mock_review
    
    mock_draft = MagicMock()
    mock_draft.get.return_value.to_dict.return_value = {
        'text': 'Thank you for your review!'
    }
    mock_firestore.client().collection().document().get.return_value = mock_draft
    
    # テストイベントの作成
    event = MagicMock()
    event.postback.data = 'POST:789'
    event.reply_token = 'test_reply_token'
    
    handle_postback(event)
    mock_firestore.client().collection().document().update.assert_called_once()
    mock_line_bot.return_value.reply_message.assert_called_once()

def test_handle_postback_edit(mock_line_bot):
    """修正ボタンのポストバック処理テスト"""
    # テストイベントの作成
    event = MagicMock()
    event.postback.data = 'EDIT:789'
    event.reply_token = 'test_reply_token'
    
    handle_postback(event)
    mock_line_bot.return_value.reply_message.assert_called_once()

def test_handle_postback_skip(mock_firestore, mock_line_bot):
    """無視ボタンのポストバック処理テスト"""
    # テストイベントの作成
    event = MagicMock()
    event.postback.data = 'SKIP:789'
    event.reply_token = 'test_reply_token'
    
    handle_postback(event)
    mock_firestore.client().collection().document().update.assert_called_once()
    mock_line_bot.return_value.reply_message.assert_called_once()

def test_handle_message(mock_firestore, mock_line_bot):
    """メッセージ処理テスト"""
    # テストイベントの作成
    event = MagicMock()
    event.message.text = 'Thank you for your review!'
    event.source.user_id = '789'
    event.reply_token = 'test_reply_token'
    
    handle_message(event)
    mock_firestore.client().collection().document().set.assert_called_once()
    mock_firestore.client().collection().document().update.assert_called_once()
    mock_line_bot.return_value.reply_message.assert_called_once()

def test_main(mock_line_bot):
    """メイン関数のテスト"""
    # テストイベントの作成
    event = {
        'headers': {'x-line-signature': 'test_signature'},
        'body': 'test_body'
    }
    
    result = main(event, {})
    assert result['status'] == 'success' 