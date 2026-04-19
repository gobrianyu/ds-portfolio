import { useParams, Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import { ArrowLeft, ExternalLink, Github, CheckCircle2, Terminal, Activity, ChevronRight } from 'lucide-react';
import { projects } from '../data/projects';
import TabbedCodeViewer from '../components/TabbedCodeViewer';
import DesignDoc from '../components/DesignDoc';

interface DesignSection {
  title: string;
  subsections?: { title: string }[];
}

interface DesignDocument {
  title: string;
  sections: DesignSection[];
}

export default function ProjectPage() {
  const { id } = useParams();
  const project = projects.find(p => p.id === id);
  const [designDoc, setDesignDoc] = useState<DesignDocument | null>(null);
  const [activeSection, setActiveSection] = useState<string>('overview');

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    if (project?.designDocUrl) {
      fetch(project.designDocUrl)
        .then(res => res.json())
        .then(data => setDesignDoc(data))
        .catch(err => console.error('Failed to load design doc for nav:', err));
    }

    const handleScroll = () => {
      const sections = ['overview', 'design-doc', 'implementation'];
      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 200) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [project]);

  if (!project) return <Navigate to="/projects" />;

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen relative bg-background text-foreground overflow-hidden">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 origin-left"
        style={{ scaleX }}
      />

      {/* Sticky Left Navigation - Fixed to viewport edge */}
      <nav className="fixed left-0 top-48 z-40 hidden xl:flex flex-col items-start pointer-events-none">
        <div className="pointer-events-auto bg-card/80 backdrop-blur-xl border-y border-r border-border rounded-r-2xl py-10 px-6 shadow-2xl space-y-10 w-[260px]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-foreground uppercase tracking-[0.3em]">Navigation</span>
          </div>

          <div className="space-y-8">
            <button 
              onClick={() => scrollToSection('overview')}
              className="group flex items-center gap-4 text-left w-full"
            >
              <div className={`w-1 h-6 rounded-full transition-all duration-500 ${activeSection === 'overview' ? 'bg-primary scale-y-125' : 'bg-muted group-hover:bg-muted-foreground/30'}`} />
              <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeSection === 'overview' ? 'text-primary translate-x-1' : 'text-muted-foreground group-hover:text-foreground'}`}>
                01. Overview
              </span>
            </button>
            
            <div className="space-y-4">
              <button 
                onClick={() => scrollToSection('design-doc')}
                className="group flex items-center gap-4 text-left w-full"
              >
                <div className={`w-1 h-6 rounded-full transition-all duration-500 ${activeSection === 'design-doc' ? 'bg-primary scale-y-125' : 'bg-muted group-hover:bg-muted-foreground/30'}`} />
                <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeSection === 'design-doc' ? 'text-primary translate-x-1' : 'text-muted-foreground group-hover:text-foreground'}`}>
                  02. Design Doc
                </span>
              </button>
              
              <AnimatePresence>
                {activeSection === 'design-doc' && designDoc && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, x: -10 }}
                    animate={{ opacity: 1, height: 'auto', x: 0 }}
                    exit={{ opacity: 0, height: 0, x: -10 }}
                    className="pl-6 space-y-4 overflow-hidden border-l border-border ml-0.5"
                  >
                    {designDoc.sections.map((section, idx) => (
                      <div key={idx} className="flex items-center gap-3 group/item cursor-default">
                        <div className="w-1 h-1 bg-muted rounded-full group-hover/item:bg-primary transition-colors" />
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest group-hover/item:text-foreground transition-colors">
                          {section.title === 'Correctness/Liveness Analysis' ? 'C/L Analysis' : section.title}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => scrollToSection('implementation')}
              className="group flex items-center gap-4 text-left w-full"
            >
              <div className={`w-1 h-6 rounded-full transition-all duration-500 ${activeSection === 'implementation' ? 'bg-primary scale-y-125' : 'bg-muted group-hover:bg-muted-foreground/30'}`} />
              <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeSection === 'implementation' ? 'text-primary translate-x-1' : 'text-muted-foreground group-hover:text-foreground'}`}>
                03. Implementation
              </span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-[280px] py-24 relative">
        {/* Background Blobs */}
        <div className="absolute top-[5%] -left-32 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] pointer-events-none z-0" />
        <div className="absolute bottom-[20%] -right-32 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none z-0" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-24">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-6">
                <Link
                  to="/projects"
                  className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors font-bold uppercase tracking-widest text-[10px] group"
                >
                  <ArrowLeft className="mr-2 w-3 h-3 group-hover:-translate-x-1 transition-transform" /> 
                  <span>cd ..</span>
                </Link>
                <div className="px-3 py-1 bg-primary/10 rounded-md border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest flex items-center space-x-2">
                  <Terminal className="w-3 h-3" />
                  <span>Process: {project.id}</span>
                </div>
              </div>

              <h1 className="text-5xl md:text-9xl font-black text-foreground tracking-tighter leading-[0.8] mb-8">
                {project.title}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground font-medium max-w-4xl leading-relaxed">
                {project.shortDescription}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {project.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  className="flex items-center px-6 py-3 rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all text-[10px] font-black text-foreground border border-border hover:border-primary/20 group uppercase tracking-widest"
                >
                  {link.label.includes('GitHub') ? <Github className="w-4 h-4 mr-3" /> : <ExternalLink className="w-4 h-4 mr-3" />}
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Full-Width Section Flow */}
          <div className="space-y-32">
            {/* Overview Section */}
            <section id="overview" className="scroll-mt-24">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                <div className="lg:col-span-8">
                  <div className="flex items-center space-x-4 mb-10">
                    <h2 className="text-3xl font-black text-foreground tracking-tight uppercase tracking-widest">Architecture Overview</h2>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="terminal-window p-8 md:p-12 bg-muted/20 border-border relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary/20 to-transparent" />
                      <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-700" />
                      
                      <div className="relative z-10">                      
                        <p className="text-xl md:text-2xl text-foreground/90 leading-relaxed font-medium mb-8">
                          {project.longDescription}
                        </p>
                        <div className="p-6 bg-background/50 border border-border rounded-xl">
                          <div className="flex items-center gap-3 mb-4">
                            <ChevronRight className="w-4 h-4 text-orange-500" />
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Core Logic</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed italic">
                            {project.architecture}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-8">
                  <div className="space-y-8">
                    {/* System Status Card */}
                    <motion.div 
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="p-6 bg-card border border-primary/10 rounded-2xl shadow-[0_0_30px_rgba(242,125,38,0.15)] relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-primary/[0.05] pointer-events-none" />
                      <div className="relative flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                            <Activity className="w-6 h-6 text-primary" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-background rounded-full" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest">System Health</p>
                          <p className="text-sm font-bold text-foreground">Operational</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Technologies Sidebar */}
                    <div className="terminal-window bg-primary/[0.02] bg-gradient-to-br from-primary/[0.05] to-transparent border-border shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-transparent" />
                      <div className="pt-6 px-6 py-5 border-b border-border bg-muted/50">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">Tech Stack</span>
                          <div className="flex gap-1 opacity-50">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="flex flex-wrap gap-2">
                          {project.technologies.map((tech, i) => (
                            <span key={i} className="px-3 py-1.5 bg-background/50 rounded-lg border border-border text-[9px] font-black text-muted-foreground uppercase tracking-widest transition-all cursor-default">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Features Sidebar */}
                  <div className="md:row-span-2 lg:row-span-1">
                    <div className="terminal-window bg-emerald-500/[0.02] bg-gradient-to-br from-emerald-500/[0.05] to-transparent border-border shadow-2xl relative overflow-hidden group h-full">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/50 to-transparent" />
                      <div className="pt-6 px-6 py-5 border-b border-border bg-muted/50">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">Features</span>
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" />
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20" />
                          </div>
                        </div>
                      </div>
                      <div className="p-8">
                        <ul className="space-y-6">
                          {project.features.map((feature, i) => (
                            <li key={i} className="flex items-start text-sm text-muted-foreground font-medium">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500/60 mr-3 mt-0.5 shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Design Document Section */}
            {project.designDocUrl && (
              <section id="design-doc" className="scroll-mt-24">
                <div className="flex items-center space-x-4 mb-10">
                  <h2 className="text-3xl font-black text-foreground tracking-tight uppercase tracking-widest">Design Document</h2>
                </div>
                <DesignDoc url={project.designDocUrl} />
              </section>
            )}

            {/* Implementation Section */}
            <section id="implementation" className="scroll-mt-24">
              <div className="flex items-center space-x-4 mb-10">
                <h2 className="text-3xl font-black text-foreground tracking-tight uppercase tracking-widest">Implementation Details</h2>
              </div>
              <TabbedCodeViewer files={project.codeFiles} />
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
