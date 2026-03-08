import { FaqSection } from "@/components/landing/faq-section";
import { FeatureCards } from "@/components/landing/feature-cards";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { SocialProof } from "@/components/landing/social-proof";

export default function LandingPage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <LandingNav />
      <main id="main">
        <HeroSection />
        <FeatureCards />
        <HowItWorks />
        <FaqSection />
        <SocialProof />
        <LandingFooter />
      </main>
    </>
  );
}
