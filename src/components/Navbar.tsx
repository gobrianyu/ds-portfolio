import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Server, BookOpen, Home, Menu, X, Sun, Moon, Terminal, Cpu } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navLinks = [
    { name: 'Home', path: '/', icon: Home, cmd: 'cd ~', color: 'text-primary' },
    { name: 'Projects', path: '/projects', icon: Server, cmd: 'ls ./projects', color: 'text-orange-500' },
    { name: 'Blog', path: '/blog', icon: BookOpen, cmd: 'ls ./research', color: 'text-violet-500' },
  ];

  const getActiveColor = () => {
    if (location.pathname.startsWith('/blog')) return 'text-violet-500';
    if (location.pathname.startsWith('/projects')) return 'text-orange-500';
    return 'text-primary';
  };

  const getActiveBg = () => {
    if (location.pathname.startsWith('/blog')) return 'bg-violet-500/10';
    if (location.pathname.startsWith('/projects')) return 'bg-orange-500/10';
    return 'bg-primary/10';
  };

  const getIndicatorColor = () => {
    if (location.pathname.startsWith('/blog')) return 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]';
    if (location.pathname.startsWith('/projects')) return 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]';
    return 'bg-primary shadow-[0_0_10px_rgba(242,125,38,0.5)]';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border h-14 flex items-center transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="flex items-center space-x-2 px-3 py-1 bg-muted rounded-md border border-border group-hover:border-primary/50 transition-colors">
              <Terminal className={cn("w-4 h-4", getActiveColor())} />
              <span className="font-mono text-xs font-bold tracking-tighter text-foreground">
                brian@dist-sys:<span className={getActiveColor()}>~</span>$
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "relative px-4 py-1.5 text-[10px] font-black transition-all hover:bg-muted rounded-md uppercase tracking-[0.2em] flex items-center space-x-2",
                  location.pathname === link.path ? cn(link.color, "bg-muted") : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="opacity-50 font-mono">{link.cmd}</span>
                {location.pathname === link.path && (
                  <motion.div
                    layoutId="nav-indicator"
                    className={cn("absolute -bottom-[17px] left-0 right-0 h-0.5", getIndicatorColor())}
                  />
                )}
              </Link>
            ))}
            
            <div className="w-px h-4 bg-border mx-4" />

            <button
              onClick={toggleTheme}
              className={cn("p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:", getActiveColor())}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn("p-2 rounded-md text-muted-foreground hover:bg-muted focus:outline-none hover:", getActiveColor())}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-14 left-0 right-0 bg-background/95 border-b border-border px-4 py-6 space-y-2"
        >
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center justify-between px-4 py-4 rounded-md text-xs font-black uppercase tracking-widest border border-transparent",
                location.pathname === link.path
                  ? cn(getActiveBg(), getActiveColor(), "border-primary/20")
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <div className="flex items-center space-x-3">
                <link.icon className="w-4 h-4" />
                <span>{link.name}</span>
              </div>
              <span className="font-mono opacity-30 text-[10px]">{link.cmd}</span>
            </Link>
          ))}
        </motion.div>
      )}
    </nav>
  );
}
