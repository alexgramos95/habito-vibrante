import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Privacy = () => {
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

        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: January 2026
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect information you provide directly, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Account information (email, display name)</li>
              <li>Habit and tracker data you create</li>
              <li>Financial goals and savings data</li>
              <li>Reflections and personal notes</li>
              <li>Device and usage information</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
            <p className="text-muted-foreground">
              We use your information to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide and improve the becoMe service</li>
              <li>Sync your data across devices (Pro users)</li>
              <li>Send important service notifications</li>
              <li>Analyze usage patterns to improve the app</li>
              <li>Process payments and manage subscriptions</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. Data Storage</h2>
            <p className="text-muted-foreground">
              Free users: Data is stored locally on your device only. 
              We do not have access to locally stored data.
            </p>
            <p className="text-muted-foreground">
              Pro users: Data is stored securely in the cloud to enable sync and backup features. 
              Data is encrypted in transit and at rest.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Data Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell your personal data. We may share data with:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Service providers (hosting, analytics, payment processing)</li>
              <li>Legal authorities when required by law</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Your Rights</h2>
            <p className="text-muted-foreground">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Access your personal data</li>
              <li>Export your data (Pro users)</li>
              <li>Delete your account and all associated data</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your data for as long as your account is active. 
              Upon account deletion, we will delete your data within 30 days, 
              except where required by law.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Children's Privacy</h2>
            <p className="text-muted-foreground">
              becoMe is not intended for users under 13 years of age. 
              We do not knowingly collect data from children.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. 
              We will notify you of significant changes via email or in-app notification.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Contact</h2>
            <p className="text-muted-foreground">
              For privacy-related questions, contact us at privacy@become.app
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
