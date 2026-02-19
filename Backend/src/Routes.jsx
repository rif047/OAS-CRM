import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
const Login = lazy(() => import('./Pages/Auth/Login'));
const Dashboard = lazy(() => import('./Pages/Dashboard/Dashboard'));
const Clients = lazy(() => import('./Pages/Client/Clients'));
const Leads = lazy(() => import('./Pages/Lead/Leads'));
const In_Quote = lazy(() => import('./Pages/Lead/In_Quote/In_Quote'));
const In_Survey = lazy(() => import('./Pages/Lead/In_Survey/In_Survey'));
const Project_Phase = lazy(() => import('./Pages/Lead/Project_Phase/Project_Phase'));
const In_Review = lazy(() => import('./Pages/Lead/In_Review/In_Review'));
const Closed = lazy(() => import('./Pages/Lead/Closed/Closed'));
const Lost_Lead = lazy(() => import('./Pages/Lead/Lost_Lead/Lost_Lead'));
const Managements = lazy(() => import('./Pages/User/Management/Managements'));
const Surveyors = lazy(() => import('./Pages/User/Surveyor/Surveyors'));
const Designers = lazy(() => import('./Pages/User/Designer/Designers'));
const Users = lazy(() => import('./Pages/User/Users'));
const Settings = lazy(() => import('./Pages/Setting/Settings'));

export default function MainRoutes() {
    const [loggedIn, setLoggedIn] = useState(false);
    const [userType, setUserType] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("userType");

        if (token) {
            try {
                const { exp } = JSON.parse(atob(token.split('.')[1]));
                if (exp * 1000 > Date.now()) {
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    setLoggedIn(true);
                    setUserType(role);
                } else {
                    localStorage.removeItem("token");
                    localStorage.removeItem("userType");
                }
            } catch {
                localStorage.removeItem("token");
                localStorage.removeItem("userType");
            }
        }

        setLoading(false);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userType");
        setLoggedIn(false);
        delete axios.defaults.headers.common['Authorization'];
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <Suspense
            fallback={
                <div className="flex justify-center items-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            }
        >
            <Routes>
                <Route path="/" element={loggedIn ? <Dashboard handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                <Route path="/login" element={loggedIn ? <Navigate to="/" replace /> : <Login setLoggedIn={setLoggedIn} />} />
                <Route path="/in_design" element={loggedIn ? <Project_Phase handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                <Route path="/in_survey" element={loggedIn ? <In_Survey handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />


                {(userType === "Admin" || userType === "Management") && (
                    <>
                        <Route path="/leads" element={loggedIn ? <Leads handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                        <Route path="/in_quote" element={loggedIn ? <In_Quote handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                        <Route path="/in_review" element={loggedIn ? <In_Review handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                        <Route path="/closed" element={loggedIn ? <Closed handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                        <Route path="/lost_lead" element={loggedIn ? <Lost_Lead handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                        <Route path="/clients" element={loggedIn ? <Clients handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                        <Route path="/managements" element={loggedIn ? <Managements handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                        <Route path="/designers" element={loggedIn ? <Designers handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                        <Route path="/surveyors" element={loggedIn ? <Surveyors handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                    </>
                )}

                {(userType === "Admin") && (
                    <>
                        <Route path="/users" element={loggedIn ? <Users handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                        <Route path="/settings" element={loggedIn ? <Settings handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                    </>
                )}


                <Route path="*" element={<Navigate to={loggedIn ? "/" : "/login"} replace />} />
            </Routes>
        </Suspense>
    );
}
