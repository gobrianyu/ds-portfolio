import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ExternalLink, Github, Layers, Code2, CheckCircle2, Terminal, FileCode, Cpu } from 'lucide-react';
import { projects } from '../data/projects';
import CodeBlock from '../components/CodeBlock';

export default function ProjectPage() {
  const { id } = useParams();
  const project = projects.find(p => p.id === id);

  if (!project) return <Navigate to="/projects" />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <Link
        to="/projects"
        className="inline-flex items-center text-gray-500 hover:text-primary mb-12 transition-colors font-bold uppercase tracking-widest text-[10px] group"
      >
        <ArrowLeft className="mr-2 w-3 h-3 group-hover:-translate-x-1 transition-transform" /> 
        <span>cd ..</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="px-3 py-1 bg-primary/10 rounded-md border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest flex items-center space-x-2">
            <Terminal className="w-3 h-3" />
            <span>Process: {project.id}</span>
          </div>
          <div className="px-3 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
            Status: Running
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-black mb-8 text-white tracking-tighter leading-[0.9]">
          {project.title}
        </h1>
        
        <div className="terminal-window p-8 mb-16 bg-white/5 border-white/10">
          <p className="text-lg text-gray-400 leading-relaxed font-medium">
            <span className="text-primary font-mono mr-2">{" >>> "}</span>
            {project.longDescription}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-24">
          <div className="lg:col-span-2 space-y-16">
            {/* Architecture Section */}
            <section>
              <div className="flex items-center space-x-4 mb-8">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Layers className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight uppercase tracking-widest">Architecture Overview</h2>
              </div>
              <div className="terminal-window p-10 bg-white/5 border-white/10 leading-relaxed text-gray-400 text-lg shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-transparent" />
                {project.architecture}
              </div>
            </section>

            {/* Code Showcase */}
            <section>
              <div className="flex items-center space-x-4 mb-10">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Code2 className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight uppercase tracking-widest">Implementation Details</h2>
              </div>
              <div className="space-y-8">
                {project.codeFiles.map((file, i) => (
                  <CodeBlock 
                    key={i} 
                    filename={file.filename}
                    description={file.description}
                    code={file.code}
                    index={i} 
                  />
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-10">
            {/* Features Sidebar */}
            <section className="terminal-window p-8 bg-white/5 border-white/10 shadow-xl">
              <div className="terminal-header mb-6">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">System Features</span>
                </div>
              </div>
              <ul className="space-y-6">
                {project.features.map((feature, i) => (
                  <li key={i} className="flex items-start text-sm text-gray-400 font-medium group">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 mr-4 shrink-0 group-hover:scale-150 transition-transform" />
                    {feature}
                  </li>
                ))}
              </ul>
            </section>

            {/* Links Sidebar */}
            <section className="terminal-window p-8 bg-white/5 border-white/10 shadow-xl">
              <div className="terminal-header mb-6">
                <div className="flex items-center space-x-2">
                  <FileCode className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resources</span>
                </div>
              </div>
              <div className="space-y-3">
                {project.links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-primary/10 hover:text-primary transition-all text-[10px] font-black text-white border border-white/5 hover:border-primary/20 group uppercase tracking-widest"
                  >
                    <span className="flex items-center">
                      {link.label.includes('GitHub') ? <Github className="w-4 h-4 mr-3" /> : <ExternalLink className="w-4 h-4 mr-3" />}
                      {link.label}
                    </span>
                    <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </a>
                ))}
              </div>
            </section>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
