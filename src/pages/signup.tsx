import Layout from '@/components/layout/Layout';
import SignUpForm from '@/components/auth/SignUpForm';

export default function SignUpPage() {
  return (
    <Layout>
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-6 text-center">新規登録</h1>
        <SignUpForm />
      </div>
    </Layout>
  );
} 