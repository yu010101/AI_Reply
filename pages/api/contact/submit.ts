import { NextApiRequest, NextApiResponse } from 'next';

// Rate limiting: Simple in-memory store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_REQUESTS_PER_WINDOW = 5; // Maximum 5 submissions per hour per IP

type ContactFormData = {
  name: string;
  email: string;
  company?: string;
  inquiryType?: string;
  message: string;
};

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Check rate limit
function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    // Create new record or reset expired one
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  rateLimitStore.set(ip, record);
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count };
}

// Clean up old entries periodically (in production, this would be a separate job)
function cleanupRateLimitStore() {
  const now = Date.now();
  const entriesToDelete: string[] = [];

  rateLimitStore.forEach((record, ip) => {
    if (now > record.resetTime) {
      entriesToDelete.push(ip);
    }
  });

  entriesToDelete.forEach(ip => rateLimitStore.delete(ip));
}

// Validate form data
function validateFormData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('お名前は必須です');
  } else if (data.name.trim().length > 100) {
    errors.push('お名前は100文字以内で入力してください');
  }

  if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
    errors.push('メールアドレスは必須です');
  } else if (!isValidEmail(data.email)) {
    errors.push('有効なメールアドレスを入力してください');
  }

  if (data.company && typeof data.company === 'string' && data.company.trim().length > 200) {
    errors.push('会社名は200文字以内で入力してください');
  }

  if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
    errors.push('お問い合わせ内容は必須です');
  } else if (data.message.trim().length < 10) {
    errors.push('お問い合わせ内容は10文字以上入力してください');
  } else if (data.message.trim().length > 5000) {
    errors.push('お問い合わせ内容は5000文字以内で入力してください');
  }

  const validInquiryTypes = ['service', 'technical', 'pricing', 'cancellation', 'other'];
  if (data.inquiryType && !validInquiryTypes.includes(data.inquiryType)) {
    errors.push('無効なお問い合わせ種別です');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Get inquiry type label
function getInquiryTypeLabel(type?: string): string {
  const labels: { [key: string]: string } = {
    service: 'サービスについて',
    technical: '技術的な問題',
    pricing: '料金・プランについて',
    cancellation: '解約について',
    other: 'その他',
  };
  return type ? labels[type] || '未選択' : '未選択';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Clean up old rate limit entries
    cleanupRateLimitStore();

    // Get client IP for rate limiting
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    // Check rate limit
    const rateLimitResult = checkRateLimit(clientIp);
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        message: '送信回数の上限に達しました。しばらくしてから再度お試しください。',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000 / 60), // minutes
      });
    }

    // Parse and validate form data
    const formData: ContactFormData = req.body;
    const validation = validateFormData(formData);

    if (!validation.valid) {
      return res.status(400).json({
        message: '入力内容に誤りがあります',
        errors: validation.errors,
      });
    }

    // Sanitize data
    const sanitizedData = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      company: formData.company?.trim() || '',
      inquiryType: formData.inquiryType || '',
      message: formData.message.trim(),
      submittedAt: new Date().toISOString(),
      clientIp,
    };

    // Log the contact form submission (in production, save to database or send email)
    console.log('=== お問い合わせフォーム送信 ===');
    console.log('送信日時:', sanitizedData.submittedAt);
    console.log('お名前:', sanitizedData.name);
    console.log('メールアドレス:', sanitizedData.email);
    console.log('会社名:', sanitizedData.company || '（未記入）');
    console.log('お問い合わせ種別:', getInquiryTypeLabel(sanitizedData.inquiryType));
    console.log('お問い合わせ内容:');
    console.log(sanitizedData.message);
    console.log('IPアドレス:', sanitizedData.clientIp);
    console.log('================================');

    // TODO: In production, implement one or more of the following:
    // 1. Save to database (Supabase, PostgreSQL, etc.)
    // 2. Send email notification to support team
    // 3. Integrate with ticketing system (Zendesk, Freshdesk, etc.)
    // 4. Send to Slack/Discord webhook
    // 5. Send auto-reply email to customer

    // Example: Save to Supabase (uncomment when ready)
    /*
    const { supabase } = require('@/utils/supabase');
    const { error: dbError } = await supabase
      .from('contact_submissions')
      .insert([{
        name: sanitizedData.name,
        email: sanitizedData.email,
        company: sanitizedData.company,
        inquiry_type: sanitizedData.inquiryType,
        message: sanitizedData.message,
        client_ip: sanitizedData.clientIp,
        created_at: sanitizedData.submittedAt,
      }]);

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({
        message: 'お問い合わせの保存に失敗しました',
      });
    }
    */

    // Example: Send email notification (uncomment when ready)
    /*
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      // Configure your email service
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.SUPPORT_EMAIL,
      subject: `新規お問い合わせ: ${getInquiryTypeLabel(sanitizedData.inquiryType)}`,
      text: `
お名前: ${sanitizedData.name}
メールアドレス: ${sanitizedData.email}
会社名: ${sanitizedData.company || '（未記入）'}
お問い合わせ種別: ${getInquiryTypeLabel(sanitizedData.inquiryType)}

お問い合わせ内容:
${sanitizedData.message}

送信日時: ${sanitizedData.submittedAt}
IPアドレス: ${sanitizedData.clientIp}
      `,
    });
    */

    // Return success response
    return res.status(200).json({
      message: 'お問い合わせを受け付けました',
      success: true,
    });
  } catch (error: any) {
    console.error('Contact form submission error:', error);
    return res.status(500).json({
      message: 'サーバーエラーが発生しました。しばらくしてから再度お試しください。',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
