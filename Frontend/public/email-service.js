// EmailJS Service for Apple Explorer
class EmailService {
    constructor() {
        // EmailJS configuration - replace these with your actual EmailJS values
        this.serviceId = 'service_51u92jc'; // Replace with your EmailJS service ID
        this.verificationTemplateId = 'template_558j2pk'; // Replace with your verification template ID
        this.resetTemplateId = 'template_wdkxnl7'; // Replace with your password reset template ID
        this.publicKey = 'XIaqhY9A-flo-qYv7'; // Replace with your EmailJS public key
        
        // Initialize EmailJS
        this.initEmailJS();
    }

    async initEmailJS() {
        try {
            // Load EmailJS if not already loaded
            if (typeof emailjs === 'undefined') {
                await this.loadEmailJS();
            }
            
            // Initialize with public key
            emailjs.init(this.publicKey);
            console.log('✅ EmailJS initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize EmailJS:', error);
        }
    }

    loadEmailJS() {
        return new Promise((resolve, reject) => {
            if (typeof emailjs !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async sendVerificationEmail(emailData) {
        try {
            console.log('📧 EmailJS sending verification email...');
            console.log('📧 Email data:', emailData);
            console.log('📧 Service ID:', this.serviceId);
            console.log('📧 Template ID:', this.verificationTemplateId);
            
            // Simple template parameters - exactly what EmailJS expects
            const templateParams = {
                // Template variables from your template
                user_name: emailData.fullName,
                verification_code: emailData.code,
                
                // EmailJS standard recipient fields
                to_email: emailData.email,
                email_id: emailData.email,
                user_email: emailData.email
                
                // Note: reply_to and from_email removed to avoid conflicts
                // Leave "Reply to" field blank in EmailJS template
            };

            console.log('📧 Template params:', templateParams);
            console.log('📧 Sending via EmailJS...');
            
            const response = await emailjs.send(
                this.serviceId,
                this.verificationTemplateId,
                templateParams
            );

            console.log('✅ Verification email sent successfully:', response);
            return { success: true, response };
        } catch (error) {
            console.error('❌ Failed to send verification email:', error);
            console.error('❌ Error details:', {
                name: error.name,
                message: error.message,
                status: error.status,
                text: error.text
            });
            
            // Log the full error object to see all properties
            console.error('❌ Full error object:', error);
            
            return { success: false, error: error.message || error.text || 'Unknown error' };
        }
    }

    async sendPasswordResetEmail(emailData) {
        try {
            // Template parameters matching your EmailJS password reset template
            const templateParams = {
                // Your template uses this variable name:
                reset_code: emailData.token,             // {{reset_code}}
                
                // EmailJS requires these for sending:
                to_email: emailData.email,              // Recipient email
                to_name: emailData.fullName,            // Recipient name (if available)
                from_name: 'Apple Explorer'             // Sender name
            };

            console.log('📧 Sending password reset email via EmailJS...');
            console.log('📧 Template params:', templateParams);
            
            const response = await emailjs.send(
                this.serviceId,
                this.resetTemplateId,
                templateParams
            );

            console.log('✅ Password reset email sent successfully:', response);
            return { success: true, response };
        } catch (error) {
            console.error('❌ Failed to send password reset email:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if EmailJS is properly configured
    isConfigured() {
        return this.serviceId !== 'your_service_id' &&
               this.verificationTemplateId !== 'template_id' &&
               this.resetTemplateId !== 'template_id' &&
               this.publicKey !== 'your_public_key' &&
               this.serviceId && this.verificationTemplateId && this.resetTemplateId && this.publicKey;
    }

    // Show configuration instructions
    showConfigInstructions() {
        console.log(`
🔧 EMAILJS CONFIGURATION NEEDED 🔧

To enable email sending, please:

1. Go to https://www.emailjs.com/
2. Create a free account
3. Create a new service (Gmail/Outlook/etc.)
4. Create email templates with these IDs:
   - Verification: template_verification
   - Password Reset: template_reset
5. Update email-service.js with your:
   - Service ID
   - Template IDs  
   - Public Key

Template Variables to use:
📧 Verification Template:
   - {{to_email}} - recipient email
   - {{to_name}} - recipient name
   - {{verification_code}} - 6-digit code
   - {{app_name}} - app name
   - {{company_name}} - company name

🔑 Password Reset Template:
   - {{to_email}} - recipient email
   - {{to_name}} - recipient name
   - {{reset_token}} - 6-digit token
   - {{app_name}} - app name
   - {{company_name}} - company name
        `);
    }

    // Test EmailJS configuration with a simple email
    async testEmailJS() {
        try {
            console.log('🧪 Testing EmailJS configuration...');
            
            const testParams = {
                to_email: 'test@example.com',
                to_name: 'Test User',
                message: 'This is a test email',
                from_name: 'Apple Explorer'
            };
            
            console.log('🧪 Test params:', testParams);
            
            const response = await emailjs.send(
                this.serviceId,
                this.verificationTemplateId,
                testParams
            );
            
            console.log('✅ EmailJS test successful:', response);
            return { success: true, response };
        } catch (error) {
            console.error('❌ EmailJS test failed:', error);
            console.error('❌ Error details:', {
                name: error.name,
                message: error.message,
                status: error.status,
                text: error.text
            });
            return { success: false, error };
        }
    }
}

// Create global instance
window.emailService = new EmailService();

// Add a test function to debug EmailJS
window.testEmailJS = function() {
    console.log('🧪 Testing EmailJS configuration...');
    const testData = {
        fullName: 'Test User',
        email: 'muhammad.ammar13@hotmail.com',
        code: '123456'
    };
    return window.emailService.sendVerificationEmail(testData);
};

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailService;
}
