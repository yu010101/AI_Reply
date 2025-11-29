import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fmonerzmxohwkisdagvm.supabase.co';
const supabaseServiceKey = 'sbp_2fba7ede92072a5333b21d9966dcb408fc2e8766';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function confirmUserEmail() {
    const email = 'testuser@gmail.com';

    console.log('ユーザーのメール確認状態を更新中...');
    console.log('Email:', email);

    try {
        // ユーザーを検索
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
            console.error('ユーザー一覧取得エラー:', listError.message);
            process.exit(1);
        }

        const user = users.users.find(u => u.email === email);

        if (!user) {
            console.error('ユーザーが見つかりません');
            process.exit(1);
        }

        console.log('User ID:', user.id);

        // メール確認済みに更新
        const { data, error } = await supabase.auth.admin.updateUserById(
            user.id,
            { email_confirm: true }
        );

        if (error) {
            console.error('エラー:', error.message);
            process.exit(1);
        }

        console.log('✓ メール確認が完了しました');
        console.log('\nログイン情報:');
        console.log('Email: testuser@gmail.com');
        console.log('Password: password123');
    } catch (error) {
        console.error('予期せぬエラー:', error);
        process.exit(1);
    }
}

confirmUserEmail();
