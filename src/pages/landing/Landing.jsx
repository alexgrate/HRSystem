import { useRef } from "react";
import { Navigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"

import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import "@fontsource-variable/schibsted-grotesk";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/caveat/500.css";
import "@fontsource/caveat/600.css";
import "@fontsource/caveat/700.css";

import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Before from "./components/Before";
import Diary from "./components/Diary";
import Binder from "./components/Binder";
import Questions from "./components/Questions";
import People from "./components/People";
import Trust from "./components/Trust";
import FinalCta from "./components/FinalCta";
import Footer from "./components/Footer";

import "./landing.css";
import "lenis/dist/lenis.css";
import useLandingMotion from "./hooks/useLandingMotion";

export default function Landing() {
    const { user, loading } = useAuth()
    if (loading) return null
    if (user) return <Navigate to="/app" replace />
    return <LandingPage />
}

function LandingPage() {
    const rootRef = useRef(null)
    useLandingMotion(rootRef)

    return (
        <div ref={rootRef} className="min-h-screen overflow-x-clip bg-lp-paper font-grotesk text-lp-ink antialiased">
            <Nav />
            <main>
                <Hero />
                <Before />
                <Diary />
                <Binder />
                <Questions />
                <People />
                <Trust />
                <FinalCta />
            </main>
            <Footer />
        </div>
    )
}