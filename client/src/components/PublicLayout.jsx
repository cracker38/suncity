import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import AIAssistant from './AIAssistant';
import WhatsAppButton from './WhatsAppButton';
import CookieBanner from './CookieBanner';

export default function PublicLayout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
      <AIAssistant />
      <WhatsAppButton />
      <CookieBanner />
    </>
  );
}
