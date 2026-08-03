import { BlurButton } from './blur-button';
import { CaseStudiesSection } from './case-studies-section';
import { DeploymentSection } from './deployment-section';
import { DeveloperSection } from './developer-section';
import { EnterpriseSection } from './enterprise-section';
import { FinalCtaSection } from './final-cta-section';
import { HeroSection } from './hero-section';
import { IndiaCanSection } from './india-can-section';
import { PlaygroundShowcase } from './playground-showcase';
import { ResearchUpdatesSection } from './research-updates-section';
import { Reveal } from './reveal';
import { SectionHeading } from './section-heading';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';
import { StackLayersSection } from './stack-layers-section';
import { TestimonialSection } from './testimonial-section';
import { WhySarvamSection } from './why-sarvam-section';

/** Shared rail: 85% on mobile, 9/12 from md, capped at the 1400px max width. */
const RAIL = 'max-w-width-mx relative mx-auto w-[85%] md:w-9/12';

export function LandingPage() {
  return (
    <div className='font-matter bg-sf mx-auto flex min-h-screen flex-col overflow-x-clip overscroll-none'>
      <SiteHeader />

      <main className='font-matter bg-sf relative z-100 flex flex-1 flex-col'>
        <div className='bg-sf mx-auto flex w-full flex-col gap-24 md:gap-44'>
          <HeroSection />

          {/* Playground */}
          <section className='playground-section relative mx-auto -mt-10 w-full max-w-[1680px] overflow-visible md:-mt-24'>
            <div
              aria-hidden='true'
              className='pointer-events-none absolute right-[-10vw] bottom-[40%] left-[-10vw] hidden h-1/5 blur-[80px] md:bottom-[28%] md:block md:h-2/5'
              style={{
                transform: 'scaleY(1.2)',
                background:
                  'linear-gradient(180deg, #C7D2FE 0%, #A5B4FC 30%, #818CF8 50%, #A5B4FC 70%, #C7D2FE 100%)'
              }}
            />
            <Reveal
              variant='scale'
              className={`${RAIL} flex flex-col items-center gap-8 md:gap-14`}
            >
              <SectionHeading heading='One workspace for every channel you run' />
              <PlaygroundShowcase />
            </Reveal>
          </section>

          <Reveal as='section' className={RAIL}>
            <DeveloperSection />
          </Reveal>

          <Reveal as='section' className={RAIL}>
            <IndiaCanSection />
          </Reveal>

          <section className={RAIL}>
            <WhySarvamSection />
          </section>

          <section className={RAIL}>
            <StackLayersSection />
          </section>

          <Reveal as='section' className={RAIL}>
            <CaseStudiesSection />
          </Reveal>

          <Reveal as='section' className={`${RAIL} flex flex-col items-center gap-8 md:gap-12`}>
            <SectionHeading
              heading='Built for teams running many channels'
              subtext='Workspaces, permissions and exports that hold up past your tenth channel.'
            />
            <EnterpriseSection />
            <BlurButton href='/contact' variant='outline'>
              Talk to us
            </BlurButton>
          </Reveal>

          <Reveal as='section' className={RAIL}>
            <DeploymentSection />
          </Reveal>

          <Reveal as='section' className={RAIL}>
            <TestimonialSection />
          </Reveal>

          <section className={`${RAIL} flex flex-col items-center gap-8 md:gap-12`}>
            <ResearchUpdatesSection />
          </section>

          <section className={`${RAIL} mb-10 md:mb-0`}>
            <FinalCtaSection />
          </section>
        </div>

        <div className='bg-sf border-sf-tertiary relative -mb-4 h-16 w-full rounded-b-4xl border-b md:h-28' />
      </main>

      <SiteFooter />
    </div>
  );
}
