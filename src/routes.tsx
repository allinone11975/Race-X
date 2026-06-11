import type { ReactNode } from 'react';
import SplashScreen from '@/pages/SplashScreen';
import LoginPage from '@/pages/LoginPage';
import GatewayPage from '@/pages/GatewayPage';
import RxStudioHome from '@/pages/RxStudioHome';
import RxStudioEditor from '@/pages/RxStudioEditor';
import RxStudioTools from '@/pages/RxStudioTools';
import AICreationPage from '@/pages/AICreationPage';
import RxSocialHome from '@/pages/RxSocialHome';
import RxSocialReels from '@/pages/RxSocialReels';
import RxSocialProfile from '@/pages/RxSocialProfile';
import RxMagicChat from '@/pages/RxMagicChat';
import RxMusic from '@/pages/RxMusic';
import RxShopping from '@/pages/RxShopping';
import AdminPortal from '@/pages/AdminPortal';
import Settings from '@/pages/Settings';
import PlaceholderPage from '@/pages/PlaceholderPage';
import NotFound from '@/pages/NotFound';
// Phase 3 Pages
import RxKernelPage from '@/pages/RxKernelPage';
import FeatureFlagsPage from '@/pages/FeatureFlagsPage';
import AnalyticsDashboardPage from '@/pages/AnalyticsDashboardPage';
import ModerationHubPage from '@/pages/ModerationHubPage';
// Studio Tools
import AiWriterRoom from '@/pages/studio/AiWriterRoom';
import StoryboardEngine from '@/pages/studio/StoryboardEngine';
import VoiceCloneLab from '@/pages/studio/VoiceCloneLab';
import BeatStudio from '@/pages/studio/BeatStudio';
import MusicComposer from '@/pages/studio/MusicComposer';
import CloudRenderFarm from '@/pages/studio/CloudRenderFarm';
import ColorGradingLab from '@/pages/studio/ColorGradingLab';
import StudioToolStub from '@/pages/studio/StudioToolStub';
import { CgiGenerator, WorldGenerator, NeuralEnhancer, VfxLab } from '@/pages/studio/AiImageTools';
// Social
import NotificationsPage from '@/pages/social/NotificationsPage';
import SocialSearchPage from '@/pages/social/SocialSearchPage';
import MessagesPage from '@/pages/social/MessagesPage';
import CreatorLeaderboard from '@/pages/social/CreatorLeaderboard';
// Main feature pages
import WalletPage from '@/pages/WalletPage';
import MarketplacePage from '@/pages/MarketplacePage';
import CreatorDashboard from '@/pages/CreatorDashboard';
import CloudVault from '@/pages/CloudVault';
import KycPage from '@/pages/KycPage';
import VrMode from '@/pages/VrMode';
import FestivalThemesPage from '@/pages/FestivalThemesPage';
// Admin expansion
import AdminEconomyControl from '@/pages/admin/AdminEconomyControl';
import AdminUserManager from '@/pages/admin/AdminUserManager';
import AdminLockdownControl from '@/pages/admin/AdminLockdownControl';
import AdminKycReview from '@/pages/admin/AdminKycReview';
import AdminApiManager from '@/pages/admin/AdminApiManager';
import AdminTransactionLedger from '@/pages/admin/AdminTransactionLedger';
import AdminFeatureManager from '@/pages/admin/AdminFeatureManager';
import AdminPricingControl from '@/pages/admin/AdminPricingControl';
import AdminSystemOverrides from '@/pages/admin/AdminSystemOverrides';
import AdminRevenueDashboard from '@/pages/admin/AdminRevenueDashboard';
import RxCapCutEditor from '@/pages/RxCapCutEditor';
import RxLayerEditor from '@/pages/RxLayerEditor';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. Has no effect when RouteGuard is not in use. */
  public?: boolean;
}

const routes: RouteConfig[] = [
  { name: 'Splash Screen', path: '/', element: <SplashScreen />, public: true },
  { name: 'Login', path: '/login', element: <LoginPage />, public: true },
  { name: 'Gateway', path: '/gateway', element: <GatewayPage />, public: true },

  // ── Rx Studio ──────────────────────────────────────────────────────────────
  { name: 'Rx Studio Home', path: '/rx-studio', element: <RxStudioHome />, public: true },
  { name: 'Rx Studio Editor', path: '/rx-studio/editor', element: <RxStudioEditor />, public: true },
  { name: 'RX CapCut Editor', path: '/rx-studio/capcut', element: <RxCapCutEditor />, public: true },
  { name: 'RX Layer Editor', path: '/rx-studio/layer-editor', element: <RxLayerEditor />, public: true },
  { name: 'Rx Studio Tools Hub', path: '/rx-studio/tools', element: <RxStudioTools />, public: true },
  { name: 'AI Creation', path: '/rx-studio/create/:type', element: <AICreationPage />, public: true },
  // Studio tools
  { name: 'AI Writer Room', path: '/rx-studio/writer', element: <AiWriterRoom />, public: true },
  { name: 'Storyboard Engine', path: '/rx-studio/storyboard', element: <StoryboardEngine />, public: true },
  { name: 'Voice Clone Lab', path: '/rx-studio/voice-clone', element: <VoiceCloneLab />, public: true },
  { name: 'CGI Generator', path: '/rx-studio/cgi', element: <CgiGenerator />, public: true },
  { name: 'World Generator', path: '/rx-studio/world', element: <WorldGenerator />, public: true },
  { name: 'Neural Enhancer', path: '/rx-studio/enhancer', element: <NeuralEnhancer />, public: true },
  { name: 'VFX Lab', path: '/rx-studio/vfx', element: <VfxLab />, public: true },
  { name: 'Color Grading Lab', path: '/rx-studio/color', element: <ColorGradingLab />, public: true },
  { name: 'Studio Tool (Dynamic)', path: '/rx-studio/tool/:tool', element: <StudioToolStub />, public: true },

  // ── Rx Music ───────────────────────────────────────────────────────────────
  { name: 'Rx Music', path: '/rx-music', element: <RxMusic />, public: true },
  { name: 'Beat Studio', path: '/rx-music/beat', element: <BeatStudio />, public: true },
  { name: 'Music Composer', path: '/rx-music/composer', element: <MusicComposer />, public: true },
  { name: 'Cloud Render Farm', path: '/rx-studio/render', element: <CloudRenderFarm />, public: true },

  // ── Rx Social ──────────────────────────────────────────────────────────────
  { name: 'Rx Social Home', path: '/rx-social', element: <RxSocialHome />, public: true },
  { name: 'Reels', path: '/rx-social/reels', element: <RxSocialReels />, public: true },
  { name: 'Profile', path: '/rx-social/profile', element: <RxSocialProfile />, public: true },
  { name: 'Search', path: '/rx-social/search', element: <SocialSearchPage />, public: true },
  { name: 'Notifications', path: '/rx-social/notifications', element: <NotificationsPage />, public: true },
  { name: 'Messages', path: '/rx-social/messages', element: <MessagesPage />, public: true },
  { name: 'Leaderboard', path: '/rx-social/leaderboard', element: <CreatorLeaderboard />, public: true },

  // ── Main Feature Pages ─────────────────────────────────────────────────────
  { name: 'Rx Magic Chat', path: '/rx-magic-chat', element: <RxMagicChat />, public: true },
  { name: 'Rx Shopping', path: '/rx-shopping', element: <RxShopping />, public: true },
  { name: 'Wallet', path: '/wallet', element: <WalletPage />, public: true },
  { name: 'Marketplace', path: '/marketplace', element: <MarketplacePage />, public: true },
  { name: 'Creator Dashboard', path: '/creator-dashboard', element: <CreatorDashboard />, public: true },
  { name: 'Cloud Vault', path: '/vault', element: <CloudVault />, public: true },
  { name: 'KYC Verification', path: '/kyc', element: <KycPage />, public: true },
  { name: 'VR Mode', path: '/vr', element: <VrMode />, public: true },
  { name: 'Festival Themes', path: '/festival-themes', element: <FestivalThemesPage />, public: true },
  { name: 'Settings', path: '/settings', element: <Settings />, public: true },
  { name: 'Feedback', path: '/feedback', element: <PlaceholderPage title="Feedback" />, public: true },

  // ── Admin Portal ───────────────────────────────────────────────────────────
  { name: 'Admin Portal', path: '/admin', element: <AdminPortal />, public: true },
  { name: 'Admin Economy Control', path: '/admin/economy', element: <AdminEconomyControl />, public: true },
  { name: 'Admin User Manager', path: '/admin/users', element: <AdminUserManager />, public: true },
  { name: 'Admin Lockdown', path: '/admin/lockdown', element: <AdminLockdownControl />, public: true },
  { name: 'Admin KYC Review', path: '/admin/kyc', element: <AdminKycReview />, public: true },
  { name: 'Admin API Manager', path: '/admin/api-manager', element: <AdminApiManager />, public: true },
  { name: 'Admin Transaction Ledger', path: '/admin/ledger', element: <AdminTransactionLedger />, public: true },
  { name: 'Admin Feature Manager', path: '/admin/features', element: <AdminFeatureManager />, public: true },
  { name: 'Admin Pricing Control', path: '/admin/pricing', element: <AdminPricingControl />, public: true },
  { name: 'Admin System Overrides', path: '/admin/overrides', element: <AdminSystemOverrides />, public: true },
  { name: 'Admin Revenue Dashboard', path: '/admin/revenue', element: <AdminRevenueDashboard />, public: true },

  // ── Phase 3 Admin ──────────────────────────────────────────────────────────
  { name: 'RX Kernel Control Center', path: '/rx-kernel', element: <RxKernelPage />, public: true },
  { name: 'Feature Flag Admin', path: '/feature-flags', element: <FeatureFlagsPage />, public: true },
  { name: 'Analytics & BI Dashboard', path: '/analytics', element: <AnalyticsDashboardPage />, public: true },
  { name: 'Moderation & Safety Hub', path: '/moderation', element: <ModerationHubPage />, public: true },

  { name: 'Not Found', path: '*', element: <NotFound />, public: true },
];

export default routes;
