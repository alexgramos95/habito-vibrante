import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-12">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: January 2026
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using becoMe, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use the application.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. Description of Service</h2>
            <p className="text-muted-foreground">
              becoMe is a personal development application that helps users track habits, 
              manage finances, and build consistent routines. The service includes both free 
              and premium (Pro) features.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. User Accounts</h2>
            <p className="text-muted-foreground">
              You are responsible for maintaining the confidentiality of your account credentials 
              and for all activities that occur under your account. You must notify us immediately 
              of any unauthorized use.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Subscription and Billing</h2>
            <p className="text-muted-foreground">
              Pro subscriptions are billed according to the plan selected (monthly, yearly, or lifetime). 
              Subscriptions automatically renew unless cancelled before the renewal date. 
              Refunds are handled according to the platform's (Apple App Store, Google Play, or Stripe) refund policies.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Free Trial</h2>
            <p className="text-muted-foreground">
              New users may be eligible for a 2-day free trial of Pro features with the Monthly plan. 
              No payment information is required during the trial period. 
              After the trial ends, you will be downgraded to the free plan unless you subscribe.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Data and Privacy</h2>
            <p className="text-muted-foreground">
              Your use of becoMe is also governed by our Privacy Policy. 
              We take reasonable measures to protect your personal data, 
              but cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Modifications to Service</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify, suspend, or discontinue any part of the service 
              at any time with or without notice. We will not be liable for any such modifications.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              becoMe is provided "as is" without warranties of any kind. We are not liable for 
              any indirect, incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, please contact us at support@become.app
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
