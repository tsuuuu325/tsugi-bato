import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { RequireLogin } from '@/components/RequireLogin';
import { HomePage } from '@/pages/HomePage';
import { CreatePage } from '@/pages/CreatePage';
import { CollaboratePage } from '@/pages/CollaboratePage';
import { AddLayerPage } from '@/pages/AddLayerPage';
import { SongPage } from '@/pages/SongPage';
import { TimelinePage } from '@/pages/TimelinePage';
import { MyPage } from '@/pages/MyPage';
import { ContributorProfilePage } from '@/pages/ContributorProfilePage';
import { ProPage } from '@/pages/ProPage';
import { LoginPage } from '@/pages/LoginPage';
import { TermsPage } from '@/pages/legal/TermsPage';
import { PrivacyPage } from '@/pages/legal/PrivacyPage';
import { TokushohoPage } from '@/pages/legal/TokushohoPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/create" element={<RequireLogin><CreatePage /></RequireLogin>} />
        <Route path="/collaborate" element={<CollaboratePage />} />
        <Route path="/add/:code" element={<RequireLogin><AddLayerPage /></RequireLogin>} />
        <Route path="/song/:code" element={<SongPage />} />
        <Route path="/s/:code" element={<SongPage />} />
        <Route path="/me" element={<MyPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/u/:contributorKey" element={<ContributorProfilePage />} />
        <Route path="/pro" element={<ProPage />} />
        <Route path="/legal/terms" element={<TermsPage />} />
        <Route path="/legal/privacy" element={<PrivacyPage />} />
        <Route path="/legal/tokushoho" element={<TokushohoPage />} />
      </Routes>
    </Layout>
  );
}
