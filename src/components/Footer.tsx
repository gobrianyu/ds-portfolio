import { Github, Linkedin, Mail, Twitter, Server } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-100 dark:bg-slate-900/50 border-t border-gray-200 dark:border-white/5 py-16 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-6 group">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-lg shadow-primary/20">
                <Server className="w-6 h-6 text-white" />
              </div>
              <span className="font-black text-2xl tracking-tighter text-gray-900 dark:text-white">
                Brian<span className="text-primary">Yu</span>
              </span>
            </Link>
            <p className="text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
              Senior Distributed Systems Engineer & Researcher. 
              Passionate about building resilient, high-performance computing 
              infrastructures that scale to the global level.
            </p>
          </div>
          
          <div>
            <h4 className="font-black text-xs uppercase tracking-[0.3em] mb-8 text-gray-900 dark:text-white">Navigation</h4>
            <ul className="space-y-4 text-gray-600 dark:text-gray-400 font-bold text-sm uppercase tracking-widest">
              <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/projects" className="hover:text-primary transition-colors">Projects</Link></li>
              <li><Link to="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-black text-xs uppercase tracking-[0.3em] mb-8 text-gray-900 dark:text-white">Connect</h4>
            <div className="flex space-x-6">
              <a href="https://github.com/gobrianyu" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"><Github className="w-6 h-6" /></a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"><Linkedin className="w-6 h-6" /></a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"><Twitter className="w-6 h-6" /></a>
              <a href="mailto:GoBrianYu@gmail.com" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"><Mail className="w-6 h-6" /></a>
            </div>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
            © {new Date().getFullYear()} Brian S. Yu. Built with Passion & Distributed Consensus.
          </p>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
            <span>Made in</span>
            <span className="text-primary font-black">Seattle, WA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
