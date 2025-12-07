/**
 * Contact API Test Script
 *
 * This script tests the contact form API endpoint without requiring a full build.
 * Run with: npx ts-node scripts/test-contact-api.ts
 */

// Mock test data
const validSubmission = {
  name: 'テストユーザー',
  email: 'test@example.com',
  company: 'テスト株式会社',
  inquiryType: 'service',
  message: 'これはテストメッセージです。お問い合わせの動作確認を行っています。',
};

const invalidSubmissions = [
  {
    name: 'Invalid Email Test',
    data: {
      name: 'テストユーザー',
      email: 'invalid-email',
      message: 'テストメッセージです。',
    },
    expectedError: 'メールアドレス',
  },
  {
    name: 'Missing Name Test',
    data: {
      email: 'test@example.com',
      message: 'テストメッセージです。',
    },
    expectedError: 'お名前',
  },
  {
    name: 'Short Message Test',
    data: {
      name: 'テストユーザー',
      email: 'test@example.com',
      message: '短い',
    },
    expectedError: '10文字以上',
  },
];

async function testContactAPI() {
  console.log('=== Contact API Test ===\n');

  // Test 1: Valid Submission
  console.log('Test 1: Valid Submission');
  console.log('Input:', JSON.stringify(validSubmission, null, 2));
  console.log('Expected: Success\n');

  // Test 2: Invalid Email
  console.log('Test 2: Invalid Email');
  console.log('Input:', JSON.stringify(invalidSubmissions[0].data, null, 2));
  console.log(`Expected Error: Should contain "${invalidSubmissions[0].expectedError}"\n`);

  // Test 3: Missing Name
  console.log('Test 3: Missing Name');
  console.log('Input:', JSON.stringify(invalidSubmissions[1].data, null, 2));
  console.log(`Expected Error: Should contain "${invalidSubmissions[1].expectedError}"\n`);

  // Test 4: Short Message
  console.log('Test 4: Short Message');
  console.log('Input:', JSON.stringify(invalidSubmissions[2].data, null, 2));
  console.log(`Expected Error: Should contain "${invalidSubmissions[2].expectedError}"\n`);

  console.log('=== Test Instructions ===');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Use the following curl commands to test:\n');

  // Valid submission test
  console.log('# Test 1: Valid Submission');
  console.log(`curl -X POST http://localhost:3000/api/contact/submit \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(validSubmission)}'\n`);

  // Invalid email test
  console.log('# Test 2: Invalid Email');
  console.log(`curl -X POST http://localhost:3000/api/contact/submit \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(invalidSubmissions[0].data)}'\n`);

  // Missing name test
  console.log('# Test 3: Missing Name');
  console.log(`curl -X POST http://localhost:3000/api/contact/submit \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(invalidSubmissions[1].data)}'\n`);

  // Short message test
  console.log('# Test 4: Short Message');
  console.log(`curl -X POST http://localhost:3000/api/contact/submit \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(invalidSubmissions[2].data)}'\n`);

  // Rate limit test
  console.log('# Test 5: Rate Limiting (run 6 times quickly)');
  console.log(`for i in {1..6}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/api/contact/submit \\
    -H "Content-Type: application/json" \\
    -d '${JSON.stringify(validSubmission)}'
  echo "\\n"
done\n`);

  console.log('=== Frontend Test ===');
  console.log('Visit: http://localhost:3000/contact');
  console.log('1. Fill out the form');
  console.log('2. Submit and verify success message');
  console.log('3. Check browser console for any errors');
  console.log('4. Check server logs for the submission data\n');

  console.log('=== E2E Test ===');
  console.log('Run: npx playwright test e2e/contact.spec.ts');
  console.log('Run with UI: npx playwright test e2e/contact.spec.ts --ui\n');
}

testContactAPI().catch(console.error);
