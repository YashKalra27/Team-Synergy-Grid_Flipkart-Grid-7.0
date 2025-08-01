# 📧 EmailJS Setup Guide for Real OTP Emails

## 🚀 Quick Setup (5 minutes)

### Step 1: Sign Up for EmailJS
1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Click "Sign Up" and create a free account
3. Verify your email address

### Step 2: Add Email Service
1. In EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Choose your email provider (Gmail, Outlook, etc.)
4. Connect your email account
5. **Copy the Service ID** (e.g., `service_abc123`)

### Step 3: Create Email Template
1. Go to "Email Templates"
2. Click "Create New Template"
3. Use this template:

```html
Subject: Your Synergy Kart OTP

Hello!

Your Synergy Kart verification code is: {{otp}}

This code is valid for 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
Synergy Kart Team
```

4. **Copy the Template ID** (e.g., `template_xyz789`)

### Step 4: Get Public Key
1. Go to "Account" → "API Keys"
2. **Copy your Public Key** (e.g., `user_def456`)

### Step 5: Update Configuration
Open `src/services/emailService.ts` and replace:

```typescript
const EMAILJS_CONFIG = {
  SERVICE_ID: 'YOUR_SERVICE_ID',     // Replace with your Service ID
  TEMPLATE_ID: 'YOUR_TEMPLATE_ID',   // Replace with your Template ID
  PUBLIC_KEY: 'YOUR_PUBLIC_KEY',     // Replace with your Public Key
};
```

## 🎯 How It Works

1. **User enters email** → System checks if user exists
2. **Existing user** → Generates OTP and sends email
3. **New user** → Goes to registration form
4. **User enters OTP** → System verifies and logs in
5. **OTP expires** → After 10 minutes, user must request new OTP

## 🔧 Alternative Options

### Option 1: Firebase Authentication (Recommended for Production)
- More secure and scalable
- Built-in email verification
- Free tier available

### Option 2: Custom Backend with Nodemailer
- Full control over email sending
- Requires server setup
- More complex but flexible

### Option 3: Twilio SendGrid
- Professional email service
- High deliverability
- Paid service

## 🛡️ Security Features

- ✅ **OTP Expiration**: 10 minutes
- ✅ **One-time Use**: OTP deleted after verification
- ✅ **Rate Limiting**: Prevents spam
- ✅ **Secure Storage**: OTPs stored temporarily

## 🧪 Testing

1. Use your own email address for testing
2. Check spam folder if email doesn't arrive
3. Verify OTP within 10 minutes
4. Test both new user and existing user flows

## 💡 Tips

- **Free Tier**: EmailJS allows 200 emails/month free
- **Gmail**: Use Gmail for easy setup
- **Template**: Customize email template with your branding
- **Error Handling**: Check browser console for errors

## 🆘 Troubleshooting

**Email not sending?**
- Check EmailJS configuration
- Verify email service is connected
- Check browser console for errors

**OTP not working?**
- Ensure OTP is entered within 10 minutes
- Check for typos in OTP
- Try requesting new OTP

**Template issues?**
- Verify template variables match code
- Test template in EmailJS dashboard
- Check template syntax 