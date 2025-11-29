import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fmonerzmxohwkisdagvm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtb25lcnpteG9od2tpc2RhZ3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMDUwMjgsImV4cCI6MjA2MTY4MTAyOH0.qKlJ5aks3lutnssQHo39hGVeweACfrWs794k3FtVmGc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function signUpTestUser() {
    const email = 'testuser@gmail.com';
    const password = 'password123';

    console.log('テストユーザーを登録中...');
    console.log('Email:', email);
    console.log('Password:', password);

    try {
        // 通常のサインアップを使用
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            if (error.message.includes('already registered')) {
                console.log('✓ このユーザーは既に登録されています');
                console.log('\nログイン情報:');
                console.log('Email:', email);
                console.log('Password:', password);
                return;
            }
            console.error('エラー:', error.message);
            process.exit(1);
        }

        console.log('✓ テストユーザーが作成されました');
        console.log('User ID:', data.user?.id);

        if (data.user?.email_confirmed_at) {
            console.log('✓ メール確認済み');
        } else {
            console.log('⚠ メール確認が必要な場合があります');
            console.log('  Supabaseの設定で自動確認を有効にしてください');
        }

        console.log('\nログイン情報:');
        console.log('Email:', email);
        console.log('Password:', password);
    } catch (error) {
        console.error('予期せぬエラー:', error);
        process.exit(1);
    }
}

signUpTestUser();
