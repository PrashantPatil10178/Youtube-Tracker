import PageContainer from '@/components/layout/page-container';
import ProfileViewPage from '@/features/profile/components/profile-view-page';

export const metadata = {
  title: 'Dashboard : Profile'
};

export default async function Page() {
  return (
    <PageContainer pageTitle='Profile' pageDescription='Manage your account details and security.'>
      <ProfileViewPage />
    </PageContainer>
  );
}
