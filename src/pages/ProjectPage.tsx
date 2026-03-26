import { useParams, Link, Navigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import { 
  ArrowLeft, 
  ExternalLink, 
  Github, 
  Layers, 
  Code2, 
  CheckCircle2, 
  Terminal, 
  Cpu, 
  ChevronRight,
  ArrowUp,
  Menu,
  X,
  FileText
} from 'lucide-react';
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
    <div className="min-h-screen relative">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 origin-left"
        style={{ scaleX }}
      />

      {/* Sticky Left Navigation */}
      <nav className="fixed left-0 top-48 z-40 hidden xl:flex flex-col items-start pointer-events-none">
        <div className="pointer-events-auto bg-[var(--glass-bg)] backdrop-blur-xl border-y border-r border-white/10 rounded-r-2xl py-10 px-6 shadow-[20px_0_50px_rgba(0,0,0,0.5)] space-y-10 min-w-[200px]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-[var(--text)] uppercase tracking-[0.3em]">Navigation</span>
          </div>

          <div className="space-y-8">
            <button 
              onClick={() => scrollToSection('overview')}
              className="group flex items-center gap-4 text-left w-full"
            >
              <div className={`w-1 h-6 rounded-full transition-all duration-500 ${activeSection === 'overview' ? 'bg-primary scale-y-125' : 'bg-white/10 group-hover:bg-white/30'}`} />
              <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeSection === 'overview' ? 'text-primary translate-x-1' : 'text-[var(--text-muted)] group-hover:text-[var(--text)]'}`}>
                01. Overview
              </span>
            </button>
            
            <div className="space-y-4">
              <button 
                onClick={() => scrollToSection('design-doc')}
                className="group flex items-center gap-4 text-left w-full"
              >
                <div className={`w-1 h-6 rounded-full transition-all duration-500 ${activeSection === 'design-doc' ? 'bg-primary scale-y-125' : 'bg-white/10 group-hover:bg-white/30'}`} />
                <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeSection === 'design-doc' ? 'text-primary translate-x-1' : 'text-[var(--text-muted)] group-hover:text-[var(--text)]'}`}>
                  02. Design Doc
                </span>
              </button>
              
              <AnimatePresence>
                {activeSection === 'design-doc' && designDoc && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, x: -10 }}
                    animate={{ opacity: 1, height: 'auto', x: 0 }}
                    exit={{ opacity: 0, height: 0, x: -10 }}
                    className="pl-6 space-y-4 overflow-hidden border-l border-white/5 ml-0.5"
                  >
                    {designDoc.sections.map((section, idx) => (
                      <div key={idx} className="flex items-center gap-3 group/item cursor-default">
                        <div className="w-1 h-1 bg-white/10 rounded-full group-hover/item:bg-primary transition-colors" />
                        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest group-hover/item:text-[var(--text)] transition-colors">
                          {section.title}
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
              <div className={`w-1 h-6 rounded-full transition-all duration-500 ${activeSection === 'implementation' ? 'bg-primary scale-y-125' : 'bg-white/10 group-hover:bg-white/30'}`} />
              <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeSection === 'implementation' ? 'text-primary translate-x-1' : 'text-[var(--text-muted)] group-hover:text-[var(--text)]'}`}>
                03. Implementation
              </span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <Link
          to="/projects"
          className="inline-flex items-center text-[var(--text-muted)] hover:text-primary mb-12 transition-colors font-bold uppercase tracking-widest text-[10px] group"
        >
          <ArrowLeft className="mr-2 w-3 h-3 group-hover:-translate-x-1 transition-transform" /> 
          <span>cd ..</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-24">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-6">
                <div className="px-3 py-1 bg-primary/10 rounded-md border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest flex items-center space-x-2">
                  <Terminal className="w-3 h-3" />
                  <span>Process: {project.id}</span>
                </div>
                <div className="px-3 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                  Status: Running
                </div>
              </div>

              <h1 className="text-5xl md:text-9xl font-black text-[var(--text)] tracking-tighter leading-[0.8] mb-8">
                {project.title}
              </h1>
              <p className="text-xl md:text-2xl text-[var(--text-muted)] font-medium max-w-4xl leading-relaxed">
                {project.shortDescription}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {project.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  className="flex items-center px-6 py-3 rounded-xl bg-white/5 hover:bg-primary/10 hover:text-primary transition-all text-[10px] font-black text-[var(--text)] border border-white/5 hover:border-primary/20 group uppercase tracking-widest"
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8">
                  <div className="flex items-center space-x-4 mb-10">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Layers className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-3xl font-black text-[var(--text)] tracking-tight uppercase tracking-widest">Architecture Overview</h2>
                  </div>
                  <div className="terminal-window p-8 md:p-12 bg-white/5 border-white/10 relative overflow-hidden mb-8">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/30" />
                    <p className="text-xl text-[var(--text-muted)] leading-relaxed font-medium mb-10">
                      {project.longDescription}
                    </p>
                    <div className="p-8 bg-white/5 rounded-xl border border-white/5 leading-relaxed text-[var(--text-muted)] text-lg italic">
                      {project.architecture}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                  {/* Features Sidebar */}
                  <div className="terminal-window p-8 bg-white/5 border-white/10 shadow-xl">
                    <div className="terminal-header mb-8">
                      <div className="flex items-center space-x-2">
                        <Cpu className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">System Capabilities</span>
                      </div>
                    </div>
                    <ul className="space-y-6">
                      {project.features.map((feature, i) => (
                        <li key={i} className="flex items-start text-sm text-gray-300 font-medium group">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 mr-4 shrink-0 group-hover:scale-150 transition-transform" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Technologies Sidebar */}
                  <div className="terminal-window p-8 bg-white/5 border-white/10 shadow-xl">
                    <div className="terminal-header mb-8">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tech Stack</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {project.technologies.map((tech, i) => (
                        <span key={i} className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Design Document Section */}
            {project.designDocUrl && (
              <section id="design-doc" className="scroll-mt-24">
                <div className="flex items-center space-x-4 mb-10">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-3xl font-black text-[var(--text)] tracking-tight uppercase tracking-widest">Design Specification</h2>
                </div>
                <DesignDoc url={project.designDocUrl} />
              </section>
            )}

            {/* Implementation Section */}
            <section id="implementation" className="scroll-mt-24">
              <div className="flex items-center space-x-4 mb-10">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Code2 className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-3xl font-black text-[var(--text)] tracking-tight uppercase tracking-widest">Implementation Details</h2>
              </div>
              <TabbedCodeViewer files={project.codeFiles} />
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
