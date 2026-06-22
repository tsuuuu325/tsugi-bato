import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { HomePage } from '@/pages/HomePage';
import { CreatePage } from '@/pages/CreatePage';
import { CollaboratePage } from '@/pages/CollaboratePage';
import { AddLayerPage } from '@/pages/AddLayerPage';
import { SongPage } from '@/pages/SongPage';
import { TimelinePage } from '@/pages/TimelinePage';
import { ProPage } from '@/pages/ProPage';
import { TermsPage } from '@/pages/legal/TermsPage';
import { PrivacyPage } from '@/pages/legal/PrivacyPage';
import { TokushohoPage } from '@/pages/legal/TokushohoPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/collaborate" element={<CollaboratePage />} />
        <Route path="/add/:code" element={<AddLayerPage />} />
        <Route path="/song/:code" element={<SongPage />} />
        <Route path="/s/:code" element={<SongPage />} />
        <Route path="/pro" element={<ProPage />} />
        <Route path="/legal/terms" element={<TermsPage />} />
        <Route path="/legal/privacy" element={<PrivacyPage />} />
        <Route path="/legal/tokushoho" element={<TokushohoPage />} />
      </Routes>
    </Layout>
  );
}
