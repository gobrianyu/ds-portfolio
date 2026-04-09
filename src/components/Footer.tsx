import { Github, Linkedin, Mail, Twitter, Server } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-muted/50 border-t border-border py-16 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-6 group">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-lg shadow-primary/20">
                <Server className="w-6 h-6 text-white" />
              </div>
              <span className="font-black text-2xl tracking-tighter text-foreground">
                Brian<span className="text-primary">Yu</span>
              </span>
            </Link>
            <p className="text-muted-foreground max-w-md leading-relaxed">
              Senior Distributed Systems Engineer & Researcher. 
              Passionate about building resilient, high-performance computing 
              infrastructures that scale to the global level.
            </p>
          </div>
          
          <div>
            <h4 className="font-black text-xs uppercase tracking-[0.3em] mb-8 text-foreground">Navigation</h4>
            <ul className="space-y-4 text-muted-foreground font-bold text-sm uppercase tracking-widest">
              <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/projects" className="hover:text-primary transition-colors">Projects</Link></li>
              <li><Link to="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-black text-xs uppercase tracking-[0.3em] mb-8 text-foreground">Connect</h4>
            <div className="flex space-x-6">
              <a href="https://github.com/gobrianyu" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><Github className="w-6 h-6" /></a>
              <a href="https://www.linkedin.com/in/gobrianyu/" className="text-muted-foreground hover:text-primary transition-colors"><Linkedin className="w-6 h-6" /></a>
              <a href="mailto:gobrianyu@gmail.com" className="text-muted-foreground hover:text-primary transition-colors"><Mail className="w-6 h-6" /></a>
            </div>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            © {new Date().getFullYear()} Brian S. Yu. Built with Passion & Distributed Consensus.
          </p>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            <span>Made in</span>
            <span className="text-primary font-black">Seattle, WA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
