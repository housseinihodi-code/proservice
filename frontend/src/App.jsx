import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

import Home from "./pages/Home";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";
import Loader from "./components/common/Loader";

// Les autres pages sont chargées à la demande : la page d'accueil s'affiche plus vite.
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Search = lazy(() => import("./pages/Search"));
const ProfessionalProfile = lazy(() => import("./pages/ProfessionalProfile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const MissionDetail = lazy(() => import("./pages/MissionDetail"));
const CreateMission = lazy(() => import("./pages/CreateMission"));
const Messages = lazy(() => import("./pages/Messages"));
const Offers = lazy(() => import("./pages/Offers"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Wallet = lazy(() => import("./pages/Wallet"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const FAQ = lazy(() => import("./pages/FAQ"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Trades = lazy(() => import("./pages/Trades"));
const Legal = lazy(() => import("./pages/Legal"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminDocuments = lazy(() => import("./pages/admin/AdminDocuments"));
const AdminTransactions = lazy(() => import("./pages/admin/AdminTransactions"));
const AdminProfessionals = lazy(() => import("./pages/admin/AdminProfessionals"));
const AdminMissions = lazy(() => import("./pages/admin/AdminMissions"));
const AdminOffers = lazy(() => import("./pages/admin/AdminOffers"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminTrades = lazy(() => import("./pages/admin/AdminTrades"));
const AdminTeam = lazy(() => import("./pages/admin/AdminTeam"));
const AdminContact = lazy(() => import("./pages/admin/AdminContact"));

const TITLES = [
  [/^\/$/, "Trouvez un professionnel"],
  [/^\/recherche/, "Rechercher un professionnel"],
  [/^\/offres/, "Offres de mission"],
  [/^\/metiers/, "Tous les métiers"],
  [/^\/professionnels\//, "Profil professionnel"],
  [/^\/comment-ca-marche/, "Comment ça marche"],
  [/^\/faq/, "Questions fréquentes"],
  [/^\/a-propos/, "À propos"],
  [/^\/contact/, "Contact"],
  [/^\/mentions-legales/, "Mentions légales"],
  [/^\/cgu/, "Conditions d'utilisation"],
  [/^\/confidentialite/, "Confidentialité"],
  [/^\/connexion/, "Connexion"],
  [/^\/inscription/, "Inscription"],
  [/^\/tableau-de-bord/, "Tableau de bord"],
  [/^\/profil/, "Mon profil"],
  [/^\/missions\/creer/, "Proposer une mission"],
  [/^\/missions/, "Mes missions"],
  [/^\/messages/, "Messages"],
  [/^\/transactions/, "Transactions"],
  [/^\/portefeuille/, "Portefeuille"],
  [/^\/admin/, "Administration"],
];

// Remonte en haut de page et met à jour le titre de l'onglet à chaque changement de page.
function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const title = TITLES.find(([re]) => re.test(pathname))?.[1] || "Page introuvable";
    document.title = `${title} · ProServices`;
  }, [pathname]);
  return null;
}

// Fondu à chaque changement de page (l'admin garde son menu : seule sa zone de contenu s'anime).
function PageTransition({ children }) {
  const { pathname } = useLocation();
  const key = pathname.startsWith("/admin") ? "/admin" : pathname;
  return <div key={key} className="page-enter">{children}</div>;
}

function App() {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <RouteEffects />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Suspense fallback={<Loader />}>
            <PageTransition>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/recherche" element={<Search />} />
              <Route path="/offres" element={<Offers />} />
              <Route path="/metiers" element={<Trades />} />
              <Route path="/professionnels/:id" element={<ProfessionalProfile />} />
              <Route path="/comment-ca-marche" element={<HowItWorks />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/a-propos" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/mentions-legales" element={<Legal page="mentions-legales" />} />
              <Route path="/cgu" element={<Legal page="cgu" />} />
              <Route path="/confidentialite" element={<Legal page="confidentialite" />} />

              <Route path="/connexion" element={user ? <Navigate to="/tableau-de-bord" /> : <Login />} />
              <Route path="/inscription" element={user ? <Navigate to="/tableau-de-bord" /> : <Register />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/tableau-de-bord" element={["ADMIN", "SUPER_ADMIN"].includes(user?.role) ? <Navigate to="/admin" replace /> : <Dashboard />} />
                <Route path="/profil/modifier" element={<EditProfile />} />
                <Route path="/missions" element={<MissionDetail />} />
                <Route path="/missions/creer" element={<CreateMission />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/:userId" element={<Messages />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/portefeuille" element={<Wallet />} />
              </Route>

              <Route element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]} />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="utilisateurs" element={<AdminUsers />} />
                  <Route path="professionnels" element={<AdminProfessionals />} />
                  <Route path="missions" element={<AdminMissions />} />
                  <Route path="offres" element={<AdminOffers />} />
                  <Route path="avis" element={<AdminReviews />} />
                  <Route path="documents" element={<AdminDocuments />} />
                  <Route path="transactions" element={<AdminTransactions />} />
                  <Route path="metiers" element={<AdminTrades />} />
                  <Route path="messages" element={<AdminContact />} />
                  <Route path="equipe" element={<AdminTeam />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
            </PageTransition>
          </Suspense>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
