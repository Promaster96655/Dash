import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import SiteLogo, { SiteBranding } from "./SiteLogo";
import { Server, Shield, Cpu, Compass, HardDrive, Zap, Globe, ArrowRight, UserCheck } from "lucide-react";

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export default function LandingPage({ onLoginClick, onRegisterClick }: LandingPageProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const [branding, setBranding] = useState<SiteBranding>({
    siteName: "MagicalNode",
    siteTagline: "VPS Platforms",
    logoType: "icon",
    logoIcon: "Server",
    logoUrl: "",
  });

  useEffect(() => {
    const brandingRef = doc(db, "settings", "branding");
    const unsubscribeBranding = onSnapshot(brandingRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBranding({
          siteName: data.siteName || "MagicalNode",
          siteTagline: data.siteTagline || "VPS Platforms",
          logoType: data.logoType || "icon",
          logoIcon: data.logoIcon || "Server",
          logoUrl: data.logoUrl || "",
        });
      }
    });
    return () => unsubscribeBranding();
  }, []);

  const features = [
    {
      icon: Cpu,
      title: "Isolated Hypervisors",
      desc: "Powered directly by physical Proxmox VE hypervisors with full CPU & RAM allocation guarantees.",
    },
    {
      icon: Shield,
      title: "Hardened Firewalls",
      desc: "Robust Layer-4 and Layer-7 DDoS protection to keep your software safe from unsolicited intrusions.",
    },
    {
      icon: Zap,
      title: "NVMe Storage Pools",
      desc: "Blazing fast read and write speeds. Spin up databases, game servers, or web proxies instantly.",
    },
    {
      icon: Globe,
      title: "Global CDN Routing",
      desc: "Minimal latency with multi-gigabit connections located in Germany, USA, Singapore, and India.",
    },
  ];

  const plans = [
    {
      id: "basic",
      name: "VPS BASIC",
      price: 250,
      cpu: "1 Core vCPU",
      ram: "1,024 MB DDR4",
      storage: "20 GB NVMe Storage",
      bandwidth: "1,000 GB Monthly Bandwidth",
      os: ["Ubuntu", "Debian", "Windows"],
    },
    {
      id: "pro",
      name: "VPS PRO",
      price: 500,
      cpu: "2 Cores vCPU",
      ram: "2,048 MB DDR4",
      storage: "40 GB NVMe Storage",
      bandwidth: "2,000 GB Monthly Bandwidth",
      os: ["Ubuntu", "Debian", "Windows"],
      highlighted: true,
    },
  ];

  return (
    <div id="landing-page" className="min-h-screen bg-transparent text-neutral-100 font-sans antialiased">
      {/* Header */}
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <SiteLogo branding={branding} size="lg" />

          <div className="flex items-center gap-4">
            <button
              onClick={onLoginClick}
              className="text-purple-300 hover:text-white font-medium text-sm transition-colors px-3 py-2 cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={onRegisterClick}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-neutral-950 to-neutral-950 z-0"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold tracking-wide uppercase">
            <Zap className="w-3.5 h-3.5" /> High Performance Proxmox Cloud Nodes
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
            Deploy Powerful VPS Instances <br />
            <span className="text-purple-400">Instantly & Securely</span>
          </h1>

          <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Provision developer-friendly Virtual Private Servers backed by real physical nodes. Choose your Operating
            System, configure modern development runtimes on-demand, and manage everything with an integrated web SSH console.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={onRegisterClick}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3.5 rounded-lg shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Deploy Your First VPS <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onLoginClick}
              className="w-full sm:w-auto bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800 text-purple-200 font-semibold px-6 py-3.5 rounded-lg transition-colors cursor-pointer shadow-md shadow-purple-950/30"
            >
              Enter Client Panel
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 border-t border-neutral-900 bg-neutral-950/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-2xl sm:text-3xl font-black text-white">Why Choose MagicalNode?</h2>
            <p className="text-neutral-400 max-w-xl mx-auto">
              Engineered with modern container virtualization, lightning fast networking, and secure user controls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-6 hover:border-neutral-800 transition-colors space-y-4"
              >
                <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <feat.icon className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-white">{feat.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="py-20 border-t border-neutral-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-2xl sm:text-3xl font-black text-white">Transparent, Credit-Based Plans</h2>
            <p className="text-neutral-400 max-w-xl mx-auto">
              No long-term contracts. Earn free maintenance credits daily, redeem promo codes, and deploy on-demand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl border p-8 relative flex flex-col justify-between transition-all ${
                  plan.highlighted
                    ? "border-indigo-600 bg-neutral-900/60 shadow-xl shadow-indigo-600/5"
                    : "border-neutral-900 bg-neutral-900/20"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white font-extrabold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                    Most Popular
                  </span>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-extrabold text-white">{plan.name}</h3>
                    <p className="text-neutral-400 text-sm mt-1">High-performance Virtual Private Server</p>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    <span className="text-neutral-400 text-sm font-semibold">Credits / 15 Days</span>
                  </div>

                  <hr className="border-neutral-900" />

                  <ul className="space-y-3.5">
                    <li className="flex items-center gap-3 text-sm text-neutral-300">
                      <Cpu className="w-4.5 h-4.5 text-purple-400 shrink-0" /> {plan.cpu}
                    </li>
                    <li className="flex items-center gap-3 text-sm text-neutral-300">
                      <UserCheck className="w-4.5 h-4.5 text-purple-400 shrink-0" /> {plan.ram}
                    </li>
                    <li className="flex items-center gap-3 text-sm text-neutral-300">
                      <HardDrive className="w-4.5 h-4.5 text-purple-400 shrink-0" /> {plan.storage}
                    </li>
                    <li className="flex items-center gap-3 text-sm text-neutral-300">
                      <Globe className="w-4.5 h-4.5 text-purple-400 shrink-0" /> {plan.bandwidth}
                    </li>
                  </ul>
                </div>

                <div className="pt-8">
                  <button
                    onClick={onRegisterClick}
                    className={`w-full py-3 rounded-lg font-bold transition-all text-sm cursor-pointer ${
                      plan.highlighted
                        ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30"
                        : "bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-800/80"
                    }`}
                  >
                    Deploy This VPS
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Locations */}
      <section className="py-20 border-t border-neutral-900 bg-neutral-950/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-purple-400 text-xs font-bold uppercase tracking-wider">Multi-Region Redundancy</span>
              <h2 className="text-3xl sm:text-4xl font-black text-white">Nodes Deployed Around the Globe</h2>
              <p className="text-neutral-400 leading-relaxed">
                Connect your services closest to your visitors. We have connected Proxmox nodes mapped across strategically
                situated data centers with redundant uplinks and stable transit providers.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-neutral-900/40 p-4 rounded-lg border border-neutral-900">
                  <p className="text-white font-bold text-lg">🇮🇳 India</p>
                  <p className="text-neutral-500 text-xs">Mumbai DC</p>
                </div>
                <div className="bg-neutral-900/40 p-4 rounded-lg border border-neutral-900">
                  <p className="text-white font-bold text-lg">🇩🇪 Germany</p>
                  <p className="text-neutral-500 text-xs">Frankfurt DC</p>
                </div>
                <div className="bg-neutral-900/40 p-4 rounded-lg border border-neutral-900">
                  <p className="text-white font-bold text-lg">🇸🇬 Singapore</p>
                  <p className="text-neutral-500 text-xs">Jurong DC</p>
                </div>
                <div className="bg-neutral-900/40 p-4 rounded-lg border border-neutral-900">
                  <p className="text-white font-bold text-lg">🇺🇸 USA</p>
                  <p className="text-neutral-500 text-xs">Oregon DC</p>
                </div>
              </div>
            </div>

            <div className="relative border border-neutral-900 bg-neutral-900/20 rounded-2xl p-8 flex flex-col justify-center items-center h-80 overflow-hidden text-center space-y-4">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl"></div>
              <Compass className="w-16 h-16 text-purple-500 animate-pulse" />
              <h3 className="text-xl font-bold text-white">Ready to Spin Up Your Node?</h3>
              <p className="text-neutral-400 text-sm max-w-sm">
                Get immediate root access to your VM. Configure custom software environments right from the browser.
              </p>
              <button
                onClick={onRegisterClick}
                className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-lg font-bold text-xs shadow-md shadow-purple-600/30 transition-all cursor-pointer"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-12 px-6 bg-neutral-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-500" />
            <span className="text-neutral-400 font-semibold text-sm">
              © 2026 MagicalNode VPS. Powered by Proxmox.
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-neutral-500">
            <a href="#landing-page" className="hover:text-neutral-300">Terms of Service</a>
            <a href="#landing-page" className="hover:text-neutral-300">Privacy Policy</a>
            <a href="#landing-page" className="hover:text-neutral-300">Developer API</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
